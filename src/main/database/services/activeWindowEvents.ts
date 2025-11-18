import { getDatabase } from '../index';
import { randomBytes } from 'crypto';

export interface ActiveWindowEvent {
  id: string;
  user_id: string;
  window_id?: string;
  owner_name?: string;
  type?: string;
  browser?: string;
  title?: string;
  url?: string;
  content?: string;
  category_id?: string;
  category_reasoning?: string;
  llm_summary?: string;
  timestamp: string;
  screenshot_path?: string;
  duration_ms: number;
  last_categorization_at?: string;
  generated_title?: string;
  old_category_id?: string;
  old_category_reasoning?: string;
  old_llm_summary?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new active window event
 */
export function createActiveWindowEvent(
  event: Omit<ActiveWindowEvent, 'id' | 'created_at' | 'updated_at'>
): ActiveWindowEvent {
  const db = getDatabase();
  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO active_window_events (
      id, user_id, window_id, owner_name, type, browser, title, url, content,
      category_id, category_reasoning, llm_summary, timestamp, screenshot_path,
      duration_ms, last_categorization_at, generated_title,
      old_category_id, old_category_reasoning, old_llm_summary,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    event.user_id,
    event.window_id,
    event.owner_name,
    event.type,
    event.browser,
    event.title,
    event.url,
    event.content,
    event.category_id,
    event.category_reasoning,
    event.llm_summary,
    event.timestamp,
    event.screenshot_path,
    event.duration_ms,
    event.last_categorization_at,
    event.generated_title,
    event.old_category_id,
    event.old_category_reasoning,
    event.old_llm_summary,
    now,
    now
  );

  return {
    ...event,
    id,
    created_at: now,
    updated_at: now
  };
}

/**
 * Get events for a user within a time range
 */
export function getEventsByUserAndTimeRange(
  userId: string,
  startDate: Date,
  endDate: Date
): ActiveWindowEvent[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM active_window_events
    WHERE user_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    ORDER BY timestamp DESC
  `);

  return stmt.all(userId, startDate.toISOString(), endDate.toISOString()) as ActiveWindowEvent[];
}

/**
 * Get events for a user (with limit and offset for pagination)
 */
export function getEventsByUserId(
  userId: string,
  limit = 100,
  offset = 0
): ActiveWindowEvent[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM active_window_events
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(userId, limit, offset) as ActiveWindowEvent[];
}

/**
 * Get event by ID
 */
export function getEventById(id: string): ActiveWindowEvent | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM active_window_events WHERE id = ?').get(id) as ActiveWindowEvent | undefined;
}

/**
 * Update an event
 */
export function updateActiveWindowEvent(
  id: string,
  updates: Partial<Omit<ActiveWindowEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): ActiveWindowEvent | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getEventById(id);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE active_window_events
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getEventById(id);
}

/**
 * Delete event by ID
 */
export function deleteEvent(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM active_window_events WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Get events by category ID
 */
export function getEventsByCategoryId(categoryId: string, limit = 100): ActiveWindowEvent[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM active_window_events
    WHERE category_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  return stmt.all(categoryId, limit) as ActiveWindowEvent[];
}

/**
 * Get total duration for a category
 */
export function getTotalDurationByCategoryId(categoryId: string, startDate?: Date, endDate?: Date): number {
  const db = getDatabase();

  let query = `
    SELECT COALESCE(SUM(duration_ms), 0) as total
    FROM active_window_events
    WHERE category_id = ?
  `;

  const params: any[] = [categoryId];

  if (startDate && endDate) {
    query += ' AND timestamp >= ? AND timestamp <= ?';
    params.push(startDate.toISOString(), endDate.toISOString());
  }

  const result = db.prepare(query).get(...params) as { total: number };
  return result.total;
}

/**
 * Get statistics for a user
 */
export function getUserStatistics(userId: string, startDate: Date, endDate: Date): {
  totalEvents: number;
  totalDuration: number;
  categorizedEvents: number;
  uncategorizedEvents: number;
} {
  const db = getDatabase();

  const totalEvents = db.prepare(`
    SELECT COUNT(*) as count
    FROM active_window_events
    WHERE user_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
  `).get(userId, startDate.toISOString(), endDate.toISOString()) as { count: number };

  const totalDuration = db.prepare(`
    SELECT COALESCE(SUM(duration_ms), 0) as total
    FROM active_window_events
    WHERE user_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
  `).get(userId, startDate.toISOString(), endDate.toISOString()) as { total: number };

  const categorizedEvents = db.prepare(`
    SELECT COUNT(*) as count
    FROM active_window_events
    WHERE user_id = ?
      AND category_id IS NOT NULL
      AND timestamp >= ?
      AND timestamp <= ?
  `).get(userId, startDate.toISOString(), endDate.toISOString()) as { count: number };

  return {
    totalEvents: totalEvents.count,
    totalDuration: totalDuration.total,
    categorizedEvents: categorizedEvents.count,
    uncategorizedEvents: totalEvents.count - categorizedEvents.count
  };
}

/**
 * Recategorize events by identifier (owner_name or url) within a time range
 */
export function recategorizeEventsByIdentifier(
  userId: string,
  identifier: string,
  itemType: 'app' | 'website',
  startDate: Date,
  endDate: Date,
  newCategoryId: string
): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  // For apps, match by owner_name; for websites, match by url
  // Build the query with the correct field name
  const query = itemType === 'app'
    ? `UPDATE active_window_events
       SET category_id = ?,
           updated_at = ?
       WHERE user_id = ?
         AND owner_name = ?
         AND timestamp >= ?
         AND timestamp <= ?`
    : `UPDATE active_window_events
       SET category_id = ?,
           updated_at = ?
       WHERE user_id = ?
         AND url = ?
         AND timestamp >= ?
         AND timestamp <= ?`;

  const stmt = db.prepare(query);

  const result = stmt.run(
    newCategoryId,
    now,
    userId,
    identifier,
    startDate.toISOString(),
    endDate.toISOString()
  );

  return result.changes;
}
