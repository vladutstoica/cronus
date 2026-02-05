/**
 * Worklog Aggregation Service
 *
 * Aggregates task associations into daily worklogs ready for sync.
 * Features:
 * - Time aggregation with minimum threshold and rounding
 * - Smart merging of adjacent time blocks
 * - Human-readable description generation
 * - Daily summary generation
 */

import {
  findAssociationsForDay,
  type TaskAssociationWithEvent,
} from "../database/services/taskAssociations";
import {
  upsertWorklog,
  findWorklogsForDay,
  findPendingWorklogs,
  getSyncStatusSummary,
} from "../database/services/worklogs";
import type { Worklog, WorklogSyncStatus } from "../../shared/taskTypes";

/**
 * Configuration for worklog aggregation
 */
export interface WorklogAggregationConfig {
  /** Minimum time threshold in seconds (default: 60) - shorter entries are ignored */
  minimumThresholdSeconds: number;
  /** Rounding interval in seconds (default: 300 = 5 minutes) */
  roundingIntervalSeconds: number;
  /** Maximum gap in seconds to merge time blocks (default: 300 = 5 minutes) */
  mergeGapSeconds: number;
}

/**
 * Default aggregation configuration
 */
export const DEFAULT_AGGREGATION_CONFIG: WorklogAggregationConfig = {
  minimumThresholdSeconds: 60,
  roundingIntervalSeconds: 300, // 5 minutes
  mergeGapSeconds: 300, // 5 minutes
};

/**
 * A time block representing a continuous period of work
 */
export interface TimeBlock {
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Aggregated time data for a task on a specific day
 */
export interface TaskTimeAggregation {
  taskId: number;
  date: string;
  totalDurationMs: number;
  totalSeconds: number;
  roundedSeconds: number;
  timeBlocks: TimeBlock[];
  associationCount: number;
  description: string;
}

/**
 * Daily summary of worklog data
 */
export interface DailySummary {
  date: string;
  userId: string;
  /** Total tracked time across all tasks (in seconds) */
  totalTrackedSeconds: number;
  /** Total unassociated time (in seconds) - activity events without task associations */
  unassociatedSeconds: number;
  /** Number of tasks worked on */
  taskCount: number;
  /** Per-task breakdown */
  taskSummaries: TaskSummary[];
  /** Sync status overview */
  syncStatus: {
    pending: number;
    synced: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Summary for a single task in the daily summary
 */
export interface TaskSummary {
  taskId: number;
  totalSeconds: number;
  roundedSeconds: number;
  activityCount: number;
  timeBlocks: TimeBlock[];
  description: string;
  syncStatus: WorklogSyncStatus;
}

/**
 * Result of worklog generation
 */
export interface WorklogGenerationResult {
  generated: Worklog[];
  skipped: { taskId: number; reason: string }[];
  errors: { taskId: number; error: string }[];
}

/**
 * WorklogService - Main service class for worklog aggregation
 */
export class WorklogService {
  private config: WorklogAggregationConfig;

  constructor(config: Partial<WorklogAggregationConfig> = {}) {
    this.config = { ...DEFAULT_AGGREGATION_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<WorklogAggregationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WorklogAggregationConfig {
    return { ...this.config };
  }

  /**
   * Round seconds to the configured interval
   * @param seconds - The number of seconds to round
   * @param interval - Optional override for rounding interval
   * @returns Rounded seconds
   */
  roundToInterval(seconds: number, interval?: number): number {
    const roundingInterval = interval ?? this.config.roundingIntervalSeconds;
    if (roundingInterval <= 0) {
      return seconds;
    }
    return Math.round(seconds / roundingInterval) * roundingInterval;
  }

  /**
   * Merge adjacent time blocks that are within the gap threshold
   * @param associations - Task associations with event data, sorted by timestamp
   * @returns Merged time blocks
   */
  mergeTimeBlocks(associations: TaskAssociationWithEvent[]): TimeBlock[] {
    if (associations.length === 0) {
      return [];
    }

    // Sort by event timestamp
    const sorted = [...associations].sort(
      (a, b) =>
        new Date(a.eventTimestamp).getTime() -
        new Date(b.eventTimestamp).getTime(),
    );

    const blocks: TimeBlock[] = [];
    let currentBlock: TimeBlock | null = null;

    for (const assoc of sorted) {
      const startTime = new Date(assoc.eventTimestamp);
      const durationMs = assoc.eventDurationMs;
      const endTime = new Date(startTime.getTime() + durationMs);

      if (!currentBlock) {
        // Start a new block
        currentBlock = {
          startTime,
          endTime,
          durationMs,
        };
      } else {
        // Check if this event is within the merge gap
        const gapMs = startTime.getTime() - currentBlock.endTime.getTime();
        const mergeGapMs = this.config.mergeGapSeconds * 1000;

        if (gapMs <= mergeGapMs) {
          // Extend the current block
          currentBlock.endTime = new Date(
            Math.max(currentBlock.endTime.getTime(), endTime.getTime()),
          );
          currentBlock.durationMs += durationMs;
        } else {
          // Save the current block and start a new one
          blocks.push(currentBlock);
          currentBlock = {
            startTime,
            endTime,
            durationMs,
          };
        }
      }
    }

    // Don't forget the last block
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Format time blocks into a human-readable description
   * @param timeBlocks - Array of time blocks
   * @returns Human-readable description like "Worked: 09:00-11:30, 14:00-15:00"
   */
  formatDescription(timeBlocks: TimeBlock[]): string {
    if (timeBlocks.length === 0) {
      return "";
    }

    const timeRanges = timeBlocks.map((block) => {
      const start = this.formatTime(block.startTime);
      const end = this.formatTime(block.endTime);
      return `${start}-${end}`;
    });

    return `Worked: ${timeRanges.join(", ")}`;
  }

  /**
   * Format a date to HH:MM time string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Aggregate time for all tasks on a specific day
   * @param userId - User ID
   * @param date - Date string (YYYY-MM-DD or ISO format)
   * @returns Map of task ID to aggregation data
   */
  aggregateForDay(
    userId: string,
    date: string,
  ): Map<number, TaskTimeAggregation> {
    const normalizedDate = date.substring(0, 10);
    const associations = findAssociationsForDay(userId, normalizedDate);

    // Group associations by task ID
    const taskGroups = new Map<number, TaskAssociationWithEvent[]>();
    for (const assoc of associations) {
      const existing = taskGroups.get(assoc.taskId) ?? [];
      existing.push(assoc);
      taskGroups.set(assoc.taskId, existing);
    }

    // Aggregate each task
    const aggregations = new Map<number, TaskTimeAggregation>();

    for (const [taskId, taskAssociations] of taskGroups) {
      // Calculate total duration
      const totalDurationMs = taskAssociations.reduce(
        (sum, a) => sum + a.eventDurationMs,
        0,
      );
      const totalSeconds = Math.floor(totalDurationMs / 1000);

      // Skip if below minimum threshold
      if (totalSeconds < this.config.minimumThresholdSeconds) {
        continue;
      }

      // Merge time blocks
      const timeBlocks = this.mergeTimeBlocks(taskAssociations);

      // Round the total time
      const roundedSeconds = this.roundToInterval(totalSeconds);

      // Generate description
      const description = this.formatDescription(timeBlocks);

      aggregations.set(taskId, {
        taskId,
        date: normalizedDate,
        totalDurationMs,
        totalSeconds,
        roundedSeconds,
        timeBlocks,
        associationCount: taskAssociations.length,
        description,
      });
    }

    return aggregations;
  }

  /**
   * Generate worklogs for a specific day
   * Creates or updates worklog entries based on aggregated task time
   * @param userId - User ID
   * @param date - Date string (YYYY-MM-DD or ISO format)
   * @returns Generation result with created/updated worklogs and any errors
   */
  generateWorklogs(userId: string, date: string): WorklogGenerationResult {
    const normalizedDate = date.substring(0, 10);
    const aggregations = this.aggregateForDay(userId, normalizedDate);

    const result: WorklogGenerationResult = {
      generated: [],
      skipped: [],
      errors: [],
    };

    for (const [taskId, aggregation] of aggregations) {
      try {
        // Skip if rounded time is zero
        if (aggregation.roundedSeconds === 0) {
          result.skipped.push({
            taskId,
            reason: `Rounded time is 0 seconds (original: ${aggregation.totalSeconds}s)`,
          });
          continue;
        }

        // Upsert the worklog
        const worklog = upsertWorklog(userId, taskId, normalizedDate, {
          totalSeconds: aggregation.roundedSeconds,
          description: aggregation.description,
          // Keep existing sync status if already synced, otherwise pending
          syncStatus: undefined, // Let upsertWorklog handle status logic
        });

        result.generated.push(worklog);
      } catch (error) {
        result.errors.push({
          taskId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Get a daily summary for a user
   * @param userId - User ID
   * @param date - Date string (YYYY-MM-DD or ISO format)
   * @returns Daily summary with task breakdowns and sync status
   */
  async getDailySummary(userId: string, date: string): Promise<DailySummary> {
    const normalizedDate = date.substring(0, 10);

    // Get aggregations
    const aggregations = this.aggregateForDay(userId, normalizedDate);

    // Get existing worklogs to get sync status
    const worklogs = findWorklogsForDay(userId, normalizedDate, {
      includeTask: false,
    }) as Worklog[];
    const worklogMap = new Map(worklogs.map((w) => [w.taskId, w]));

    // Build task summaries
    const taskSummaries: TaskSummary[] = [];
    let totalTrackedSeconds = 0;

    for (const [taskId, aggregation] of aggregations) {
      const worklog = worklogMap.get(taskId);
      const syncStatus: WorklogSyncStatus = worklog?.syncStatus ?? "pending";

      taskSummaries.push({
        taskId,
        totalSeconds: aggregation.totalSeconds,
        roundedSeconds: aggregation.roundedSeconds,
        activityCount: aggregation.associationCount,
        timeBlocks: aggregation.timeBlocks,
        description: aggregation.description,
        syncStatus,
      });

      totalTrackedSeconds += aggregation.roundedSeconds;
    }

    // Sort by time descending
    taskSummaries.sort((a, b) => b.roundedSeconds - a.roundedSeconds);

    // Get sync status summary
    const syncStatus = getSyncStatusSummary(userId, normalizedDate);

    // Calculate unassociated time (would need total activity time from events)
    // For now, we'll leave this as 0 - the caller can calculate it if needed
    const unassociatedSeconds = 0;

    return {
      date: normalizedDate,
      userId,
      totalTrackedSeconds,
      unassociatedSeconds,
      taskCount: taskSummaries.length,
      taskSummaries,
      syncStatus,
    };
  }

  /**
   * Get all pending worklogs for a user
   * @param userId - User ID
   * @returns Array of pending worklogs
   */
  getPendingWorklogs(userId: string): Worklog[] {
    return findPendingWorklogs(userId);
  }

  /**
   * Re-aggregate and regenerate worklogs for a date range
   * Useful for recalculating after corrections or configuration changes
   * @param userId - User ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Map of date to generation results
   */
  regenerateForDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Map<string, WorklogGenerationResult> {
    const results = new Map<string, WorklogGenerationResult>();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each day in the range
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().substring(0, 10);
      const result = this.generateWorklogs(userId, dateStr);
      results.set(dateStr, result);

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Calculate total unassociated time for a day
   * This compares total activity time with task-associated time
   * @param userId - User ID
   * @param date - Date string (YYYY-MM-DD)
   * @param totalActivityMs - Total activity duration from active_window_events
   * @returns Unassociated time in seconds
   */
  calculateUnassociatedTime(
    userId: string,
    date: string,
    totalActivityMs: number,
  ): number {
    const normalizedDate = date.substring(0, 10);
    const associations = findAssociationsForDay(userId, normalizedDate);

    // Sum all associated time
    const associatedMs = associations.reduce(
      (sum, a) => sum + a.eventDurationMs,
      0,
    );

    // Calculate unassociated
    const unassociatedMs = Math.max(0, totalActivityMs - associatedMs);
    return Math.floor(unassociatedMs / 1000);
  }
}

// Export a default instance for convenience
export const worklogService = new WorklogService();
