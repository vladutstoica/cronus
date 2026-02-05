/**
 * Database service for task_associations table
 * Handles CRUD operations for linking activity events to external tasks
 */

import { getDatabase } from "../index";
import type {
  TaskAssociation,
  TaskAssociationRow,
  CreateTaskAssociationInput,
} from "../../../shared/taskTypes";
import { rowToTaskAssociation as convertRowToTaskAssociation } from "../../../shared/taskTypes";

/**
 * Extended task association with event details for aggregation
 */
export interface TaskAssociationWithEvent extends TaskAssociation {
  eventTimestamp: string;
  eventDurationMs: number;
  eventTitle?: string;
}

/**
 * Options for querying task associations
 */
export interface FindAssociationsOptions {
  /** Filter by date range start (inclusive, YYYY-MM-DD or ISO string) */
  startDate?: string;
  /** Filter by date range end (inclusive, YYYY-MM-DD or ISO string) */
  endDate?: string;
  /** Include only confirmed associations */
  confirmedOnly?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Create a new task association
 */
export function createAssociation(
  input: CreateTaskAssociationInput,
): TaskAssociation {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO task_associations (
      user_id, event_id, task_id, detection_method,
      confidence_score, is_confirmed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.userId,
    input.eventId,
    input.taskId,
    input.detectionMethod,
    input.confidenceScore ?? 0.0,
    input.isConfirmed ? 1 : 0,
    now,
    now,
  );

  return findAssociationById(result.lastInsertRowid as number)!;
}

/**
 * Find a task association by ID
 */
export function findAssociationById(id: number): TaskAssociation | undefined {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM task_associations WHERE id = ?")
    .get(id) as TaskAssociationRow | undefined;

  return row ? convertRowToTaskAssociation(row) : undefined;
}

/**
 * Find all associations for a specific event
 */
export function findAssociationsForEvent(eventId: number): TaskAssociation[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM task_associations
       WHERE event_id = ?
       ORDER BY confidence_score DESC, created_at DESC`,
    )
    .all(eventId) as TaskAssociationRow[];

  return rows.map(convertRowToTaskAssociation);
}

/**
 * Find all associations for a specific task
 */
export function findAssociationsForTask(
  taskId: number,
  options: FindAssociationsOptions = {},
): TaskAssociation[] {
  const db = getDatabase();
  const params: (number | string)[] = [taskId];
  let query = `SELECT * FROM task_associations WHERE task_id = ?`;

  if (options.confirmedOnly) {
    query += " AND is_confirmed = 1";
  }

  query += " ORDER BY created_at DESC";

  if (options.limit !== undefined) {
    query += " LIMIT ?";
    params.push(options.limit);
    if (options.offset !== undefined) {
      query += " OFFSET ?";
      params.push(options.offset);
    }
  }

  const rows = db.prepare(query).all(...params) as TaskAssociationRow[];
  return rows.map(convertRowToTaskAssociation);
}

/**
 * Find all associations for a user on a specific day
 * Joins with active_window_events to get event timestamps and durations
 */
export function findAssociationsForDay(
  userId: string,
  date: string,
): TaskAssociationWithEvent[] {
  const db = getDatabase();

  // Normalize date to YYYY-MM-DD format
  const normalizedDate = date.substring(0, 10);

  const rows = db
    .prepare(
      `SELECT
        ta.*,
        e.timestamp as event_timestamp,
        e.duration_ms as event_duration_ms,
        e.title as event_title
       FROM task_associations ta
       JOIN active_window_events e ON ta.event_id = e.id
       WHERE ta.user_id = ?
         AND DATE(e.timestamp) = ?
       ORDER BY e.timestamp ASC`,
    )
    .all(userId, normalizedDate) as (TaskAssociationRow & {
    event_timestamp: string;
    event_duration_ms: number;
    event_title: string | null;
  })[];

  return rows.map((row) => ({
    ...convertRowToTaskAssociation(row),
    eventTimestamp: row.event_timestamp,
    eventDurationMs: row.event_duration_ms,
    eventTitle: row.event_title ?? undefined,
  }));
}

/**
 * Find associations for a user within a date range, grouped by task
 * Used for aggregation across multiple days
 */
export function findAssociationsForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  options: { confirmedOnly?: boolean } = {},
): TaskAssociationWithEvent[] {
  const db = getDatabase();

  // Normalize dates to YYYY-MM-DD format
  const normalizedStart = startDate.substring(0, 10);
  const normalizedEnd = endDate.substring(0, 10);

  let query = `
    SELECT
      ta.*,
      e.timestamp as event_timestamp,
      e.duration_ms as event_duration_ms,
      e.title as event_title
    FROM task_associations ta
    JOIN active_window_events e ON ta.event_id = e.id
    WHERE ta.user_id = ?
      AND DATE(e.timestamp) >= ?
      AND DATE(e.timestamp) <= ?
  `;

  if (options.confirmedOnly) {
    query += " AND ta.is_confirmed = 1";
  }

  query += " ORDER BY ta.task_id, e.timestamp ASC";

  const rows = db
    .prepare(query)
    .all(userId, normalizedStart, normalizedEnd) as (TaskAssociationRow & {
    event_timestamp: string;
    event_duration_ms: number;
    event_title: string | null;
  })[];

  return rows.map((row) => ({
    ...convertRowToTaskAssociation(row),
    eventTimestamp: row.event_timestamp,
    eventDurationMs: row.event_duration_ms,
    eventTitle: row.event_title ?? undefined,
  }));
}

/**
 * Mark an association as user-confirmed
 */
export function confirmAssociation(id: number): TaskAssociation | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE task_associations
    SET is_confirmed = 1, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findAssociationById(id);
}

/**
 * Update an association's confidence score
 */
export function updateAssociationConfidence(
  id: number,
  confidenceScore: number,
): TaskAssociation | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Clamp confidence score to valid range
  const clampedScore = Math.max(0, Math.min(1, confidenceScore));

  const stmt = db.prepare(`
    UPDATE task_associations
    SET confidence_score = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(clampedScore, now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findAssociationById(id);
}

/**
 * Delete a task association
 */
export function deleteAssociation(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM task_associations WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Delete all associations for a specific event
 */
export function deleteAssociationsForEvent(eventId: number): number {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM task_associations WHERE event_id = ?");
  const result = stmt.run(eventId);
  return result.changes;
}

/**
 * Delete all associations for a specific task
 */
export function deleteAssociationsForTask(taskId: number): number {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM task_associations WHERE task_id = ?");
  const result = stmt.run(taskId);
  return result.changes;
}

/**
 * Check if an association already exists for an event-task pair
 */
export function associationExists(eventId: number, taskId: number): boolean {
  const db = getDatabase();
  const row = db
    .prepare(
      "SELECT 1 FROM task_associations WHERE event_id = ? AND task_id = ?",
    )
    .get(eventId, taskId);
  return row !== undefined;
}

/**
 * Get total duration associated with a task for a specific day
 */
export function getTotalDurationForTaskOnDay(
  userId: string,
  taskId: number,
  date: string,
): number {
  const db = getDatabase();
  const normalizedDate = date.substring(0, 10);

  const result = db
    .prepare(
      `SELECT COALESCE(SUM(e.duration_ms), 0) as total
       FROM task_associations ta
       JOIN active_window_events e ON ta.event_id = e.id
       WHERE ta.user_id = ?
         AND ta.task_id = ?
         AND DATE(e.timestamp) = ?`,
    )
    .get(userId, taskId, normalizedDate) as { total: number };

  return result.total;
}

/**
 * Get count of associations for a task on a specific day
 */
export function getAssociationCountForTaskOnDay(
  userId: string,
  taskId: number,
  date: string,
): number {
  const db = getDatabase();
  const normalizedDate = date.substring(0, 10);

  const result = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM task_associations ta
       JOIN active_window_events e ON ta.event_id = e.id
       WHERE ta.user_id = ?
         AND ta.task_id = ?
         AND DATE(e.timestamp) = ?`,
    )
    .get(userId, taskId, normalizedDate) as { count: number };

  return result.count;
}
