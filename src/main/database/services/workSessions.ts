import { randomBytes } from "crypto";
import { getDatabase } from "../index";

export interface WorkSession {
  id: string;
  user_id: string;
  note: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface CreateWorkSessionInput {
  user_id: string;
  note: string;
}

/**
 * Get the active (not ended) work session for a user
 */
export function getActiveSession(userId: string): WorkSession | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM work_sessions
    WHERE user_id = ? AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `);
  return (stmt.get(userId) as WorkSession) || null;
}

/**
 * Start a new work session (auto-ends any active session)
 */
export function startSession(userId: string, note: string): WorkSession {
  const db = getDatabase();

  // End any active session first
  const activeSession = getActiveSession(userId);
  if (activeSession) {
    endSession(activeSession.id);
  }

  const id = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO work_sessions (id, user_id, note, started_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, note, now, now);

  return getSessionById(id)!;
}

/**
 * End a work session
 */
export function endSession(sessionId: string): WorkSession | null {
  const db = getDatabase();
  const session = getSessionById(sessionId);
  if (!session || session.ended_at) {
    return session || null;
  }

  const now = new Date().toISOString();
  const startedAt = new Date(session.started_at).getTime();
  const endedAt = new Date(now).getTime();
  const durationMs = endedAt - startedAt;

  const stmt = db.prepare(`
    UPDATE work_sessions
    SET ended_at = ?, duration_ms = ?
    WHERE id = ?
  `);

  stmt.run(now, durationMs, sessionId);

  return getSessionById(sessionId);
}

/**
 * Update the note of a work session
 */
export function updateSessionNote(
  sessionId: string,
  note: string,
): WorkSession | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE work_sessions
    SET note = ?
    WHERE id = ?
  `);

  stmt.run(note, sessionId);

  return getSessionById(sessionId);
}

/**
 * Get a work session by ID
 */
export function getSessionById(id: string): WorkSession | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM work_sessions WHERE id = ?");
  return (stmt.get(id) as WorkSession) || null;
}

/**
 * Get work sessions for a user within a date range
 */
export function getSessionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
): WorkSession[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM work_sessions
    WHERE user_id = ? AND DATE(started_at) >= ? AND DATE(started_at) <= ?
    ORDER BY started_at DESC
  `);
  return stmt.all(userId, startDate, endDate) as WorkSession[];
}

/**
 * Get sessions for a specific date
 */
export function getSessionsByDate(userId: string, date: string): WorkSession[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM work_sessions
    WHERE user_id = ? AND DATE(started_at) = ?
    ORDER BY started_at DESC
  `);
  return stmt.all(userId, date) as WorkSession[];
}

/**
 * Get total session time for a user on a specific date
 */
export function getTotalSessionTime(userId: string, date: string): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(duration_ms), 0) as total
    FROM work_sessions
    WHERE user_id = ? AND DATE(started_at) = ? AND ended_at IS NOT NULL
  `);
  const result = stmt.get(userId, date) as { total: number };
  return result.total;
}

/**
 * Delete a work session
 */
export function deleteSession(sessionId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM work_sessions WHERE id = ?");
  const result = stmt.run(sessionId);
  return result.changes > 0;
}
