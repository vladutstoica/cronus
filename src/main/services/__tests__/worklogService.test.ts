import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

/**
 * WorklogService tests using an in-memory SQLite database.
 * Tests cover aggregation, time merging, description formatting, and rounding logic.
 */

let db: Database.Database;

// Mock the database module to use in-memory SQLite
vi.mock("../../database/index", () => ({
  getDatabase: () => db,
  initDatabase: () => db,
}));

// Import after mock is set up
import {
  WorklogService,
  DEFAULT_AGGREGATION_CONFIG,
  type TimeBlock,
} from "../worklogService";
import type { TaskAssociationWithEvent } from "../../database/services/taskAssociations";
import {
  createAssociation,
  findAssociationsForDay,
} from "../../database/services/taskAssociations";
import {
  createWorklog,
  upsertWorklog,
  markSynced,
  markFailed,
  findPendingWorklogs,
  getSyncStatusSummary,
} from "../../database/services/worklogs";

function applyMigrations(database: Database.Database): void {
  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Active window events table
    CREATE TABLE IF NOT EXISTS active_window_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      timestamp DATETIME NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- External tasks table
    CREATE TABLE IF NOT EXISTS external_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('jira', 'linear')),
      external_id TEXT NOT NULL,
      external_url TEXT,
      title TEXT NOT NULL,
      description TEXT,
      project_key TEXT,
      project_name TEXT,
      status TEXT,
      assignee TEXT,
      labels TEXT,
      priority TEXT,
      estimate_seconds INTEGER,
      last_synced_at TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, provider, external_id)
    );

    -- Task associations table
    CREATE TABLE IF NOT EXISTS task_associations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      detection_method TEXT NOT NULL,
      confidence_score REAL DEFAULT 0.0,
      is_confirmed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES external_tasks(id) ON DELETE CASCADE,
      UNIQUE (event_id, task_id)
    );

    -- Worklogs table
    CREATE TABLE IF NOT EXISTS worklogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_seconds INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      sync_status TEXT DEFAULT 'pending',
      external_worklog_id TEXT,
      synced_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES external_tasks(id) ON DELETE CASCADE,
      UNIQUE (user_id, task_id, date)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_task_assoc_user_id ON task_associations(user_id);
    CREATE INDEX IF NOT EXISTS idx_worklogs_user_id ON worklogs(user_id);
    CREATE INDEX IF NOT EXISTS idx_worklogs_sync_status ON worklogs(sync_status);
  `);
}

function createTestUser(id: string): void {
  db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
    id,
    `${id}@test.com`,
    "Test User",
  );
}

function createTestTask(userId: string, taskId: number): void {
  db.prepare(
    `
    INSERT INTO external_tasks (id, user_id, provider, external_id, title)
    VALUES (?, ?, 'jira', ?, ?)
  `,
  ).run(taskId, userId, `TASK-${taskId}`, `Test Task ${taskId}`);
}

function createTestEvent(
  eventId: string,
  userId: string,
  timestamp: string,
  durationMs: number,
  title?: string,
): void {
  db.prepare(
    `
    INSERT INTO active_window_events (id, user_id, timestamp, duration_ms, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `,
  ).run(eventId, userId, timestamp, durationMs, title ?? "Test Event");
}

describe("WorklogService", () => {
  let service: WorklogService;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    service = new WorklogService();
  });

  afterEach(() => {
    db.close();
  });

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const config = service.getConfig();
      expect(config).toEqual(DEFAULT_AGGREGATION_CONFIG);
    });

    it("should allow partial configuration override", () => {
      const customService = new WorklogService({
        minimumThresholdSeconds: 120,
      });
      const config = customService.getConfig();
      expect(config.minimumThresholdSeconds).toBe(120);
      expect(config.roundingIntervalSeconds).toBe(300);
      expect(config.mergeGapSeconds).toBe(300);
    });

    it("should update configuration via setConfig", () => {
      service.setConfig({ roundingIntervalSeconds: 600 });
      const config = service.getConfig();
      expect(config.roundingIntervalSeconds).toBe(600);
    });
  });

  describe("roundToInterval", () => {
    it("should round to the nearest interval", () => {
      expect(service.roundToInterval(150)).toBe(300); // 2.5 min -> 5 min
      expect(service.roundToInterval(149)).toBe(0); // 2.49 min -> 0 min
      expect(service.roundToInterval(450)).toBe(600); // 7.5 min -> 10 min
      expect(service.roundToInterval(449)).toBe(300); // 7.49 min -> 5 min
    });

    it("should handle exact interval values", () => {
      expect(service.roundToInterval(300)).toBe(300);
      expect(service.roundToInterval(600)).toBe(600);
    });

    it("should handle zero seconds", () => {
      expect(service.roundToInterval(0)).toBe(0);
    });

    it("should handle custom interval override", () => {
      expect(service.roundToInterval(450, 600)).toBe(600); // 7.5 min -> 10 min with 10 min interval
      expect(service.roundToInterval(450, 60)).toBe(480); // Round to nearest minute
    });

    it("should return unchanged value when interval is 0", () => {
      expect(service.roundToInterval(123, 0)).toBe(123);
    });

    it("should handle large values correctly", () => {
      // 3 hours 7.5 minutes -> 3 hours 10 minutes
      expect(service.roundToInterval(11250)).toBe(11400);
    });
  });

  describe("mergeTimeBlocks", () => {
    it("should return empty array for no associations", () => {
      const result = service.mergeTimeBlocks([]);
      expect(result).toEqual([]);
    });

    it("should create single block for single association", () => {
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 3600000), // 1 hour
      ];

      const result = service.mergeTimeBlocks(associations);

      expect(result).toHaveLength(1);
      expect(result[0].durationMs).toBe(3600000);
    });

    it("should merge adjacent blocks within gap threshold", () => {
      // Two 30-minute blocks with 3-minute gap (within 5-minute threshold)
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 1800000), // 30 min
        createMockAssociation("2024-01-15T09:33:00Z", 1800000), // 30 min, 3 min gap
      ];

      const result = service.mergeTimeBlocks(associations);

      expect(result).toHaveLength(1);
      expect(result[0].durationMs).toBe(3600000); // Combined 60 min
      expect(result[0].startTime.toISOString()).toBe(
        "2024-01-15T09:00:00.000Z",
      );
      expect(result[0].endTime.toISOString()).toBe("2024-01-15T10:03:00.000Z");
    });

    it("should not merge blocks with gap exceeding threshold", () => {
      // Two 30-minute blocks with 10-minute gap (exceeds 5-minute threshold)
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 1800000), // 30 min
        createMockAssociation("2024-01-15T09:40:00Z", 1800000), // 30 min, 10 min gap
      ];

      const result = service.mergeTimeBlocks(associations);

      expect(result).toHaveLength(2);
      expect(result[0].durationMs).toBe(1800000);
      expect(result[1].durationMs).toBe(1800000);
    });

    it("should handle overlapping time blocks", () => {
      // Events that overlap should be merged
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 3600000), // 1 hour
        createMockAssociation("2024-01-15T09:30:00Z", 3600000), // 1 hour, overlaps
      ];

      const result = service.mergeTimeBlocks(associations);

      expect(result).toHaveLength(1);
      expect(result[0].durationMs).toBe(7200000); // Combined duration
      expect(result[0].endTime.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle unsorted associations", () => {
      // Associations in reverse order
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T14:00:00Z", 1800000), // 2:00 PM
        createMockAssociation("2024-01-15T09:00:00Z", 1800000), // 9:00 AM
      ];

      const result = service.mergeTimeBlocks(associations);

      // Should be sorted and have 2 separate blocks
      expect(result).toHaveLength(2);
      expect(result[0].startTime.toISOString()).toBe(
        "2024-01-15T09:00:00.000Z",
      );
      expect(result[1].startTime.toISOString()).toBe(
        "2024-01-15T14:00:00.000Z",
      );
    });

    it("should merge multiple adjacent blocks", () => {
      // Three 20-minute blocks with small gaps
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 1200000), // 20 min
        createMockAssociation("2024-01-15T09:22:00Z", 1200000), // 20 min, 2 min gap
        createMockAssociation("2024-01-15T09:44:00Z", 1200000), // 20 min, 2 min gap
      ];

      const result = service.mergeTimeBlocks(associations);

      expect(result).toHaveLength(1);
      expect(result[0].durationMs).toBe(3600000); // 60 min total
    });

    it("should respect custom merge gap configuration", () => {
      const customService = new WorklogService({ mergeGapSeconds: 60 }); // 1 minute gap

      // Two blocks with 2-minute gap
      const associations: TaskAssociationWithEvent[] = [
        createMockAssociation("2024-01-15T09:00:00Z", 1800000),
        createMockAssociation("2024-01-15T09:32:00Z", 1800000), // 2 min gap
      ];

      const result = customService.mergeTimeBlocks(associations);

      // Should NOT merge because gap > 1 minute
      expect(result).toHaveLength(2);
    });
  });

  describe("formatDescription", () => {
    it("should return empty string for no time blocks", () => {
      const result = service.formatDescription([]);
      expect(result).toBe("");
    });

    it("should format single time block correctly", () => {
      const blocks: TimeBlock[] = [
        {
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T11:30:00Z"),
          durationMs: 9000000,
        },
      ];

      const result = service.formatDescription(blocks);

      // Note: Time will be in local timezone, so we check format pattern
      expect(result).toMatch(/^Worked: \d{2}:\d{2}-\d{2}:\d{2}$/);
    });

    it("should format multiple time blocks with comma separation", () => {
      const blocks: TimeBlock[] = [
        {
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T11:30:00Z"),
          durationMs: 9000000,
        },
        {
          startTime: new Date("2024-01-15T14:00:00Z"),
          endTime: new Date("2024-01-15T15:00:00Z"),
          durationMs: 3600000,
        },
      ];

      const result = service.formatDescription(blocks);

      // Check it has "Worked:" prefix and comma separation
      expect(result).toMatch(
        /^Worked: \d{2}:\d{2}-\d{2}:\d{2}, \d{2}:\d{2}-\d{2}:\d{2}$/,
      );
    });
  });

  describe("Worklog Database Operations", () => {
    const userId = "user-1";
    const taskId = 1;

    beforeEach(() => {
      createTestUser(userId);
      createTestTask(userId, taskId);
    });

    it("should create a new worklog", () => {
      const worklog = createWorklog({
        userId,
        taskId,
        date: "2024-01-15",
        totalSeconds: 3600,
        description: "Worked: 09:00-10:00",
      });

      expect(worklog.id).toBeDefined();
      expect(worklog.userId).toBe(userId);
      expect(worklog.taskId).toBe(taskId);
      expect(worklog.date).toBe("2024-01-15");
      expect(worklog.totalSeconds).toBe(3600);
      expect(worklog.syncStatus).toBe("pending");
    });

    it("should upsert worklog - create new", () => {
      const worklog = upsertWorklog(userId, taskId, "2024-01-15", {
        totalSeconds: 3600,
        description: "Test description",
      });

      expect(worklog.totalSeconds).toBe(3600);
      expect(worklog.syncStatus).toBe("pending");
    });

    it("should upsert worklog - update existing", () => {
      // Create initial worklog
      upsertWorklog(userId, taskId, "2024-01-15", {
        totalSeconds: 3600,
      });

      // Upsert with new value
      const updated = upsertWorklog(userId, taskId, "2024-01-15", {
        totalSeconds: 7200,
        description: "Updated description",
      });

      expect(updated.totalSeconds).toBe(7200);
      expect(updated.description).toBe("Updated description");
    });

    it("should mark worklog as synced", () => {
      const worklog = createWorklog({
        userId,
        taskId,
        date: "2024-01-15",
        totalSeconds: 3600,
      });

      const synced = markSynced(worklog.id, "external-123");

      expect(synced?.syncStatus).toBe("synced");
      expect(synced?.externalWorklogId).toBe("external-123");
      expect(synced?.syncedAt).toBeDefined();
    });

    it("should mark worklog as failed", () => {
      const worklog = createWorklog({
        userId,
        taskId,
        date: "2024-01-15",
        totalSeconds: 3600,
      });

      const failed = markFailed(worklog.id, "API error");

      expect(failed?.syncStatus).toBe("failed");
      expect(failed?.errorMessage).toBe("API error");
    });

    it("should find pending worklogs", () => {
      createWorklog({
        userId,
        taskId,
        date: "2024-01-15",
        totalSeconds: 3600,
        syncStatus: "pending",
      });

      const pending = findPendingWorklogs(userId);

      expect(pending).toHaveLength(1);
      expect(pending[0].syncStatus).toBe("pending");
    });

    it("should get sync status summary", () => {
      createWorklog({
        userId,
        taskId,
        date: "2024-01-15",
        totalSeconds: 3600,
        syncStatus: "pending",
      });

      // Create another task for a synced worklog
      createTestTask(userId, 2);
      const synced = createWorklog({
        userId,
        taskId: 2,
        date: "2024-01-15",
        totalSeconds: 1800,
        syncStatus: "pending",
      });
      markSynced(synced.id, "ext-1");

      const summary = getSyncStatusSummary(userId, "2024-01-15");

      expect(summary.pending).toBe(1);
      expect(summary.synced).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.skipped).toBe(0);
    });
  });

  describe("Task Association Database Operations", () => {
    const userId = "user-1";
    const taskId = 1;

    beforeEach(() => {
      createTestUser(userId);
      createTestTask(userId, taskId);
    });

    it("should create task association", () => {
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 3600000);

      const association = createAssociation({
        userId,
        eventId: 1, // Using numeric ID
        taskId,
        detectionMethod: "git_branch",
        confidenceScore: 0.9,
      });

      expect(association.id).toBeDefined();
      expect(association.taskId).toBe(taskId);
      expect(association.detectionMethod).toBe("git_branch");
      expect(association.confidenceScore).toBe(0.9);
    });

    it("should find associations for a day", () => {
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 3600000);
      createTestEvent("event-2", userId, "2024-01-15T14:00:00Z", 1800000);
      createTestEvent("event-3", userId, "2024-01-16T09:00:00Z", 3600000); // Different day

      // Note: event_id in the schema uses the auto-generated ID, but we're using string IDs
      // We need to query for the correct event IDs
      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });
      createAssociation({
        userId,
        eventId: events[1].id as unknown as number,
        taskId,
        detectionMethod: "window_title",
      });

      const associations = findAssociationsForDay(userId, "2024-01-15");

      expect(associations).toHaveLength(2);
      expect(associations[0].eventDurationMs).toBe(3600000);
      expect(associations[1].eventDurationMs).toBe(1800000);
    });
  });

  describe("Aggregation Integration", () => {
    const userId = "user-1";
    const taskId = 1;

    beforeEach(() => {
      createTestUser(userId);
      createTestTask(userId, taskId);
    });

    it("should aggregate time correctly for a task", () => {
      // Create events
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 1800000); // 30 min
      createTestEvent("event-2", userId, "2024-01-15T09:32:00Z", 1800000); // 30 min, 2 min gap

      const events = db
        .prepare(
          "SELECT id FROM active_window_events WHERE user_id = ? ORDER BY timestamp",
        )
        .all(userId) as { id: string }[];

      // Create associations
      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });
      createAssociation({
        userId,
        eventId: events[1].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      // Aggregate
      const aggregations = service.aggregateForDay(userId, "2024-01-15");

      expect(aggregations.size).toBe(1);
      const agg = aggregations.get(taskId);
      expect(agg).toBeDefined();
      expect(agg!.totalDurationMs).toBe(3600000); // 60 min
      expect(agg!.totalSeconds).toBe(3600);
      expect(agg!.roundedSeconds).toBe(3600); // 60 min rounds to 60 min
      expect(agg!.timeBlocks).toHaveLength(1); // Merged into 1 block
    });

    it("should skip tasks below minimum threshold", () => {
      // Create a short event (30 seconds)
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 30000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      // Aggregate with default 60s threshold
      const aggregations = service.aggregateForDay(userId, "2024-01-15");

      // Should be empty since 30s < 60s threshold
      expect(aggregations.size).toBe(0);
    });

    it("should include tasks at or above minimum threshold", () => {
      // Create a 61-second event
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 61000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      const aggregations = service.aggregateForDay(userId, "2024-01-15");

      expect(aggregations.size).toBe(1);
    });
  });

  describe("Worklog Generation", () => {
    const userId = "user-1";
    const taskId = 1;

    beforeEach(() => {
      createTestUser(userId);
      createTestTask(userId, taskId);
    });

    it("should generate worklog from aggregated data", () => {
      // Create events totaling 1 hour
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 1800000);
      createTestEvent("event-2", userId, "2024-01-15T09:32:00Z", 1800000);

      const events = db
        .prepare(
          "SELECT id FROM active_window_events WHERE user_id = ? ORDER BY timestamp",
        )
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });
      createAssociation({
        userId,
        eventId: events[1].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      const result = service.generateWorklogs(userId, "2024-01-15");

      expect(result.generated).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      const worklog = result.generated[0];
      expect(worklog.taskId).toBe(taskId);
      expect(worklog.totalSeconds).toBe(3600);
      expect(worklog.syncStatus).toBe("pending");
      expect(worklog.description).toMatch(/^Worked:/);
    });

    it("should skip generation when rounded time is zero", () => {
      // Create a very short event (90 seconds, rounds to 0 with 5 min interval)
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 90000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      const result = service.generateWorklogs(userId, "2024-01-15");

      expect(result.generated).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].taskId).toBe(taskId);
      expect(result.skipped[0].reason).toContain("Rounded time is 0");
    });

    it("should handle re-generation without duplicates (upsert pattern)", () => {
      // Create events
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 3600000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      // Generate worklogs twice
      const result1 = service.generateWorklogs(userId, "2024-01-15");
      const result2 = service.generateWorklogs(userId, "2024-01-15");

      // Should have same ID (upserted, not duplicated)
      expect(result1.generated[0].id).toBe(result2.generated[0].id);

      // Verify only one worklog exists in database
      const count = db
        .prepare(
          "SELECT COUNT(*) as count FROM worklogs WHERE user_id = ? AND date = ?",
        )
        .get(userId, "2024-01-15") as { count: number };
      expect(count.count).toBe(1);
    });
  });

  describe("calculateUnassociatedTime", () => {
    const userId = "user-1";
    const taskId = 1;

    beforeEach(() => {
      createTestUser(userId);
      createTestTask(userId, taskId);
    });

    it("should calculate unassociated time correctly", () => {
      // Create an event of 2 hours
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 7200000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      // Associate only 1 hour
      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      // Total activity is 3 hours, but only 2 hours associated
      const totalActivityMs = 10800000; // 3 hours
      const unassociated = service.calculateUnassociatedTime(
        userId,
        "2024-01-15",
        totalActivityMs,
      );

      // 3 hours - 2 hours = 1 hour = 3600 seconds
      expect(unassociated).toBe(3600);
    });

    it("should return zero when all time is associated", () => {
      createTestEvent("event-1", userId, "2024-01-15T09:00:00Z", 3600000);

      const events = db
        .prepare("SELECT id FROM active_window_events WHERE user_id = ?")
        .all(userId) as { id: string }[];

      createAssociation({
        userId,
        eventId: events[0].id as unknown as number,
        taskId,
        detectionMethod: "git_branch",
      });

      const unassociated = service.calculateUnassociatedTime(
        userId,
        "2024-01-15",
        3600000,
      );

      expect(unassociated).toBe(0);
    });
  });
});

/**
 * Helper function to create mock association with event data
 */
function createMockAssociation(
  timestamp: string,
  durationMs: number,
): TaskAssociationWithEvent {
  return {
    id: Math.floor(Math.random() * 10000),
    userId: "user-1",
    eventId: Math.floor(Math.random() * 10000),
    taskId: 1,
    detectionMethod: "git_branch",
    confidenceScore: 0.9,
    isConfirmed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    eventTimestamp: timestamp,
    eventDurationMs: durationMs,
    eventTitle: "Test Event",
  };
}
