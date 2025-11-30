import { randomBytes } from "crypto";
import { getDatabase } from "../index";

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  is_focus: number;
  tags?: string; // JSON array
  scheduled_date: string; // YYYY-MM-DD
  original_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  user_id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  is_focus?: boolean;
  tags?: string[];
  scheduled_date: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  status?: "pending" | "completed";
  is_focus?: boolean;
  tags?: string[];
  scheduled_date?: string;
}

/**
 * Get all todos for a user on a specific date
 */
export function getTodosByDate(userId: string, date: string): Todo[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE user_id = ? AND scheduled_date = ?
    ORDER BY is_focus DESC, priority DESC, created_at ASC
  `);
  return stmt.all(userId, date) as Todo[];
}

/**
 * Get all todos for a user within a date range
 */
export function getTodosByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Todo[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE user_id = ? AND scheduled_date >= ? AND scheduled_date <= ?
    ORDER BY scheduled_date ASC, is_focus DESC, priority DESC, created_at ASC
  `);
  return stmt.all(userId, startDate, endDate) as Todo[];
}

/**
 * Get incomplete todos from previous days (for rollover)
 */
export function getIncompleteTodosBeforeDate(
  userId: string,
  beforeDate: string
): Todo[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE user_id = ? AND scheduled_date < ? AND status = 'pending'
    ORDER BY scheduled_date ASC
  `);
  return stmt.all(userId, beforeDate) as Todo[];
}

/**
 * Create a new todo
 */
export function createTodo(input: CreateTodoInput): Todo {
  const db = getDatabase();
  const id = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO todos (id, user_id, title, description, priority, status, is_focus, tags, scheduled_date, original_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.user_id,
    input.title,
    input.description || null,
    input.priority || "medium",
    input.is_focus ? 1 : 0,
    input.tags ? JSON.stringify(input.tags) : null,
    input.scheduled_date,
    input.scheduled_date, // original_date is same as scheduled_date on creation
    now,
    now
  );

  return getTodoById(id)!;
}

/**
 * Get a todo by ID
 */
export function getTodoById(id: string): Todo | undefined {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM todos WHERE id = ?");
  return stmt.get(id) as Todo | undefined;
}

/**
 * Update a todo
 */
export function updateTodo(id: string, updates: UpdateTodoInput): Todo | undefined {
  const db = getDatabase();
  const todo = getTodoById(id);
  if (!todo) return undefined;

  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const values: any[] = [now];

  if (updates.title !== undefined) {
    fields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.priority !== undefined) {
    fields.push("priority = ?");
    values.push(updates.priority);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
    if (updates.status === "completed") {
      fields.push("completed_at = ?");
      values.push(now);
    } else {
      fields.push("completed_at = ?");
      values.push(null);
    }
  }
  if (updates.is_focus !== undefined) {
    fields.push("is_focus = ?");
    values.push(updates.is_focus ? 1 : 0);
  }
  if (updates.tags !== undefined) {
    fields.push("tags = ?");
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.scheduled_date !== undefined) {
    fields.push("scheduled_date = ?");
    values.push(updates.scheduled_date);
  }

  values.push(id);

  const stmt = db.prepare(`
    UPDATE todos SET ${fields.join(", ")} WHERE id = ?
  `);
  stmt.run(...values);

  return getTodoById(id);
}

/**
 * Delete a todo
 */
export function deleteTodo(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM todos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Rollover incomplete todos to a new date
 */
export function rolloverTodos(userId: string, toDate: string): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Update all incomplete todos scheduled before toDate
  const stmt = db.prepare(`
    UPDATE todos
    SET scheduled_date = ?, updated_at = ?
    WHERE user_id = ? AND scheduled_date < ? AND status = 'pending'
  `);

  const result = stmt.run(toDate, now, userId, toDate);
  return result.changes;
}

/**
 * Get todo statistics for a date range
 */
export function getTodoStats(
  userId: string,
  startDate: string,
  endDate: string
): { date: string; created: number; completed: number }[] {
  const db = getDatabase();

  // Get created counts by original_date
  const createdStmt = db.prepare(`
    SELECT original_date as date, COUNT(*) as count
    FROM todos
    WHERE user_id = ? AND original_date >= ? AND original_date <= ?
    GROUP BY original_date
  `);
  const created = createdStmt.all(userId, startDate, endDate) as { date: string; count: number }[];

  // Get completed counts by completed_at date
  const completedStmt = db.prepare(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM todos
    WHERE user_id = ? AND status = 'completed'
      AND DATE(completed_at) >= ? AND DATE(completed_at) <= ?
    GROUP BY DATE(completed_at)
  `);
  const completed = completedStmt.all(userId, startDate, endDate) as { date: string; count: number }[];

  // Merge into a single result
  const statsMap = new Map<string, { created: number; completed: number }>();

  created.forEach(({ date, count }) => {
    if (!statsMap.has(date)) {
      statsMap.set(date, { created: 0, completed: 0 });
    }
    statsMap.get(date)!.created = count;
  });

  completed.forEach(({ date, count }) => {
    if (!statsMap.has(date)) {
      statsMap.set(date, { created: 0, completed: 0 });
    }
    statsMap.get(date)!.completed = count;
  });

  return Array.from(statsMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Clear focus status from all todos for a user on a date
 */
export function clearFocusTodos(userId: string, date: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE todos SET is_focus = 0, updated_at = ?
    WHERE user_id = ? AND scheduled_date = ?
  `);
  stmt.run(now, userId, date);
}
