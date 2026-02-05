/**
 * Database service for worklogs table
 * Handles CRUD operations for aggregated time logs per task per day
 */

import { getDatabase } from "../index";
import type {
  Worklog,
  WorklogRow,
  CreateWorklogInput,
  UpdateWorklogInput,
  WorklogSyncStatus,
  WorklogWithTask,
  ExternalTaskRow,
} from "../../../shared/taskTypes";
import { rowToWorklog, rowToExternalTask } from "../../../shared/taskTypes";

/**
 * Options for querying worklogs
 */
export interface FindWorklogsOptions {
  /** Filter by sync status */
  syncStatus?: WorklogSyncStatus;
  /** Filter by date range start (inclusive, YYYY-MM-DD) */
  startDate?: string;
  /** Filter by date range end (inclusive, YYYY-MM-DD) */
  endDate?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Include task details */
  includeTask?: boolean;
}

/**
 * Data for upserting a worklog
 */
export interface UpsertWorklogData {
  totalSeconds: number;
  description?: string;
  syncStatus?: WorklogSyncStatus;
}

/**
 * Create a new worklog
 */
export function createWorklog(input: CreateWorklogInput): Worklog {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO worklogs (
      user_id, task_id, date, total_seconds, description,
      sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.userId,
    input.taskId,
    input.date,
    input.totalSeconds,
    input.description ?? null,
    input.syncStatus ?? "pending",
    now,
    now,
  );

  return findWorklogById(result.lastInsertRowid as number)!;
}

/**
 * Update an existing worklog
 */
export function updateWorklog(
  id: number,
  updates: Partial<Omit<UpdateWorklogInput, "id">>,
): Worklog | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.totalSeconds !== undefined) {
    fields.push("total_seconds = ?");
    values.push(updates.totalSeconds);
  }

  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }

  if (updates.syncStatus !== undefined) {
    fields.push("sync_status = ?");
    values.push(updates.syncStatus);
  }

  if (updates.externalWorklogId !== undefined) {
    fields.push("external_worklog_id = ?");
    values.push(updates.externalWorklogId);
  }

  if (updates.syncedAt !== undefined) {
    fields.push("synced_at = ?");
    values.push(updates.syncedAt);
  }

  if (updates.errorMessage !== undefined) {
    fields.push("error_message = ?");
    values.push(updates.errorMessage);
  }

  if (fields.length === 0) {
    return findWorklogById(id);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE worklogs
    SET ${fields.join(", ")}
    WHERE id = ?
  `);

  const result = stmt.run(...values);
  if (result.changes === 0) {
    return undefined;
  }

  return findWorklogById(id);
}

/**
 * Upsert a worklog - create if not exists, update if exists
 * Unique constraint is on (user_id, task_id, date)
 */
export function upsertWorklog(
  userId: string,
  taskId: number,
  date: string,
  data: UpsertWorklogData,
): Worklog {
  const db = getDatabase();
  const now = new Date().toISOString();
  const normalizedDate = date.substring(0, 10);

  // Check if worklog exists
  const existing = findWorklogByUserTaskDate(userId, taskId, normalizedDate);

  if (existing) {
    // Update existing worklog
    // Only reset sync status if the time changed
    const syncStatus =
      data.syncStatus ??
      (data.totalSeconds !== existing.totalSeconds
        ? "pending"
        : existing.syncStatus);

    const stmt = db.prepare(`
      UPDATE worklogs
      SET total_seconds = ?,
          description = ?,
          sync_status = ?,
          error_message = NULL,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      data.totalSeconds,
      data.description ?? existing.description ?? null,
      syncStatus,
      now,
      existing.id,
    );

    return findWorklogById(existing.id)!;
  } else {
    // Create new worklog
    return createWorklog({
      userId,
      taskId,
      date: normalizedDate,
      totalSeconds: data.totalSeconds,
      description: data.description,
      syncStatus: data.syncStatus ?? "pending",
    });
  }
}

/**
 * Find a worklog by ID
 */
export function findWorklogById(id: number): Worklog | undefined {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM worklogs WHERE id = ?").get(id) as
    | WorklogRow
    | undefined;

  return row ? rowToWorklog(row) : undefined;
}

/**
 * Find a worklog by user, task, and date (unique combination)
 */
export function findWorklogByUserTaskDate(
  userId: string,
  taskId: number,
  date: string,
): Worklog | undefined {
  const db = getDatabase();
  const normalizedDate = date.substring(0, 10);

  const row = db
    .prepare(
      "SELECT * FROM worklogs WHERE user_id = ? AND task_id = ? AND date = ?",
    )
    .get(userId, taskId, normalizedDate) as WorklogRow | undefined;

  return row ? rowToWorklog(row) : undefined;
}

/**
 * Find all worklogs for a specific task
 */
export function findWorklogsForTask(
  taskId: number,
  options: FindWorklogsOptions = {},
): Worklog[] {
  const db = getDatabase();
  const params: (number | string)[] = [taskId];
  let query = "SELECT * FROM worklogs WHERE task_id = ?";

  if (options.syncStatus) {
    query += " AND sync_status = ?";
    params.push(options.syncStatus);
  }

  if (options.startDate) {
    query += " AND date >= ?";
    params.push(options.startDate.substring(0, 10));
  }

  if (options.endDate) {
    query += " AND date <= ?";
    params.push(options.endDate.substring(0, 10));
  }

  query += " ORDER BY date DESC";

  if (options.limit !== undefined) {
    query += " LIMIT ?";
    params.push(options.limit);
    if (options.offset !== undefined) {
      query += " OFFSET ?";
      params.push(options.offset);
    }
  }

  const rows = db.prepare(query).all(...params) as WorklogRow[];
  return rows.map(rowToWorklog);
}

/**
 * Find all worklogs for a user on a specific day
 */
export function findWorklogsForDay(
  userId: string,
  date: string,
  options: { includeTask?: boolean } = {},
): Worklog[] | WorklogWithTask[] {
  const db = getDatabase();
  const normalizedDate = date.substring(0, 10);

  if (options.includeTask) {
    const rows = db
      .prepare(
        `SELECT w.*, t.id as t_id, t.user_id as t_user_id, t.provider as t_provider,
                t.external_id as t_external_id, t.external_url as t_external_url,
                t.title as t_title, t.description as t_description,
                t.project_key as t_project_key, t.project_name as t_project_name,
                t.status as t_status, t.assignee as t_assignee, t.labels as t_labels,
                t.priority as t_priority, t.estimate_seconds as t_estimate_seconds,
                t.last_synced_at as t_last_synced_at, t.is_archived as t_is_archived,
                t.created_at as t_created_at, t.updated_at as t_updated_at
         FROM worklogs w
         LEFT JOIN external_tasks t ON w.task_id = t.id
         WHERE w.user_id = ? AND w.date = ?
         ORDER BY w.total_seconds DESC`,
      )
      .all(userId, normalizedDate) as (WorklogRow & Record<string, unknown>)[];

    return rows.map((row) => {
      const worklog = rowToWorklog(row);
      const taskRow: ExternalTaskRow | null = row.t_id
        ? {
            id: row.t_id as number,
            user_id: row.t_user_id as string,
            provider: row.t_provider as "jira" | "linear",
            external_id: row.t_external_id as string,
            external_url: row.t_external_url as string | null,
            title: row.t_title as string,
            description: row.t_description as string | null,
            project_key: row.t_project_key as string | null,
            project_name: row.t_project_name as string | null,
            status: row.t_status as string | null,
            assignee: row.t_assignee as string | null,
            labels: row.t_labels as string | null,
            priority: row.t_priority as string | null,
            estimate_seconds: row.t_estimate_seconds as number | null,
            last_synced_at: row.t_last_synced_at as string | null,
            is_archived: row.t_is_archived as number,
            created_at: row.t_created_at as string,
            updated_at: row.t_updated_at as string,
          }
        : null;

      return {
        ...worklog,
        task: taskRow ? rowToExternalTask(taskRow) : undefined,
      } as WorklogWithTask;
    });
  }

  const rows = db
    .prepare(
      `SELECT * FROM worklogs
       WHERE user_id = ? AND date = ?
       ORDER BY total_seconds DESC`,
    )
    .all(userId, normalizedDate) as WorklogRow[];

  return rows.map(rowToWorklog);
}

/**
 * Find all worklogs for a user within a date range
 */
export function findWorklogsForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  options: FindWorklogsOptions = {},
): Worklog[] {
  const db = getDatabase();
  const params: (string | number)[] = [
    userId,
    startDate.substring(0, 10),
    endDate.substring(0, 10),
  ];

  let query = `
    SELECT * FROM worklogs
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
  `;

  if (options.syncStatus) {
    query += " AND sync_status = ?";
    params.push(options.syncStatus);
  }

  query += " ORDER BY date DESC, total_seconds DESC";

  if (options.limit !== undefined) {
    query += " LIMIT ?";
    params.push(options.limit);
    if (options.offset !== undefined) {
      query += " OFFSET ?";
      params.push(options.offset);
    }
  }

  const rows = db.prepare(query).all(...params) as WorklogRow[];
  return rows.map(rowToWorklog);
}

/**
 * Find all pending worklogs for a user (needing sync)
 */
export function findPendingWorklogs(userId: string): Worklog[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM worklogs
       WHERE user_id = ? AND sync_status = 'pending'
       ORDER BY date DESC, total_seconds DESC`,
    )
    .all(userId) as WorklogRow[];

  return rows.map(rowToWorklog);
}

/**
 * Find all failed worklogs for a user
 */
export function findFailedWorklogs(userId: string): Worklog[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM worklogs
       WHERE user_id = ? AND sync_status = 'failed'
       ORDER BY date DESC`,
    )
    .all(userId) as WorklogRow[];

  return rows.map(rowToWorklog);
}

/**
 * Mark a worklog as synced
 */
export function markSynced(
  id: number,
  externalWorklogId: string,
): Worklog | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE worklogs
    SET sync_status = 'synced',
        external_worklog_id = ?,
        synced_at = ?,
        error_message = NULL,
        updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(externalWorklogId, now, now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findWorklogById(id);
}

/**
 * Mark a worklog as failed
 */
export function markFailed(
  id: number,
  errorMessage: string,
): Worklog | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE worklogs
    SET sync_status = 'failed',
        error_message = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(errorMessage, now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findWorklogById(id);
}

/**
 * Mark a worklog as skipped (e.g., below minimum threshold)
 */
export function markSkipped(id: number, reason?: string): Worklog | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE worklogs
    SET sync_status = 'skipped',
        error_message = ?,
        updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(reason ?? null, now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findWorklogById(id);
}

/**
 * Reset a worklog to pending status (for retry)
 */
export function resetToPending(id: number): Worklog | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE worklogs
    SET sync_status = 'pending',
        error_message = NULL,
        updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(now, id);
  if (result.changes === 0) {
    return undefined;
  }

  return findWorklogById(id);
}

/**
 * Delete a worklog by ID
 */
export function deleteWorklog(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM worklogs WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Delete all worklogs for a specific task
 */
export function deleteWorklogsForTask(taskId: number): number {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM worklogs WHERE task_id = ?");
  const result = stmt.run(taskId);
  return result.changes;
}

/**
 * Get sync status summary for a user
 */
export function getSyncStatusSummary(
  userId: string,
  date?: string,
): Record<WorklogSyncStatus, number> {
  const db = getDatabase();
  let query = `
    SELECT sync_status, COUNT(*) as count
    FROM worklogs
    WHERE user_id = ?
  `;
  const params: string[] = [userId];

  if (date) {
    query += " AND date = ?";
    params.push(date.substring(0, 10));
  }

  query += " GROUP BY sync_status";

  const rows = db.prepare(query).all(...params) as {
    sync_status: WorklogSyncStatus;
    count: number;
  }[];

  const summary: Record<WorklogSyncStatus, number> = {
    pending: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    summary[row.sync_status] = row.count;
  }

  return summary;
}

/**
 * Get total time logged for a user on a specific day
 */
export function getTotalTimeForDay(userId: string, date: string): number {
  const db = getDatabase();
  const normalizedDate = date.substring(0, 10);

  const result = db
    .prepare(
      `SELECT COALESCE(SUM(total_seconds), 0) as total
       FROM worklogs
       WHERE user_id = ? AND date = ?`,
    )
    .get(userId, normalizedDate) as { total: number };

  return result.total;
}

/**
 * Get total time logged for a task across all dates
 */
export function getTotalTimeForTask(taskId: number): number {
  const db = getDatabase();

  const result = db
    .prepare(
      `SELECT COALESCE(SUM(total_seconds), 0) as total
       FROM worklogs
       WHERE task_id = ?`,
    )
    .get(taskId) as { total: number };

  return result.total;
}
