import { getDatabase } from '../index';
import { randomBytes } from 'crypto';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
  is_productive: boolean;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new category
 */
export function createCategory(
  category: Omit<Category, 'id' | 'created_at' | 'updated_at'>
): Category {
  const db = getDatabase();
  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO categories (
      id, user_id, name, description, color, emoji,
      is_productive, is_default, is_archived,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    category.user_id,
    category.name,
    category.description,
    category.color,
    category.emoji,
    category.is_productive ? 1 : 0,
    category.is_default ? 1 : 0,
    category.is_archived ? 1 : 0,
    now,
    now
  );

  return {
    ...category,
    id,
    created_at: now,
    updated_at: now
  };
}

/**
 * Get all categories for a user
 */
export function getCategoriesByUserId(userId: string, includeArchived = false): Category[] {
  const db = getDatabase();

  let query = 'SELECT * FROM categories WHERE user_id = ?';
  if (!includeArchived) {
    query += ' AND is_archived = 0';
  }
  query += ' ORDER BY created_at DESC';

  const categories = db.prepare(query).all(userId) as Category[];

  // Convert SQLite integers to booleans
  return categories.map(cat => ({
    ...cat,
    is_productive: Boolean(cat.is_productive),
    is_default: Boolean(cat.is_default),
    is_archived: Boolean(cat.is_archived)
  }));
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  const db = getDatabase();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;

  if (category) {
    category.is_productive = Boolean(category.is_productive);
    category.is_default = Boolean(category.is_default);
    category.is_archived = Boolean(category.is_archived);
  }

  return category;
}

/**
 * Update a category
 */
export function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Category | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);

      // Convert booleans to integers
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getCategoryById(id);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE categories
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getCategoryById(id);
}

/**
 * Delete a category (soft delete by archiving)
 */
export function deleteCategory(id: string): boolean {
  return updateCategory(id, { is_archived: true }) !== undefined;
}

/**
 * Delete recently created categories (created in the last 24 hours)
 */
export function deleteRecentlyCreatedCategories(userId: string): number {
  const db = getDatabase();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    DELETE FROM categories
    WHERE user_id = ? AND created_at > ? AND is_default = 0
  `);

  const result = stmt.run(userId, twentyFourHoursAgo);
  return result.changes;
}

/**
 * Create default categories for a new user
 */
export function createDefaultCategories(userId: string): Category[] {
  const defaultCategories = [
    {
      name: 'Work',
      description: 'Work-related activities',
      color: '#3b82f6',
      emoji: '💼',
      is_productive: true,
      is_default: true
    },
    {
      name: 'Personal',
      description: 'Personal activities',
      color: '#8b5cf6',
      emoji: '🏠',
      is_productive: true,
      is_default: true
    },
    {
      name: 'Entertainment',
      description: 'Entertainment and leisure',
      color: '#ec4899',
      emoji: '🎮',
      is_productive: false,
      is_default: true
    },
    {
      name: 'Communication',
      description: 'Email, messaging, meetings',
      color: '#10b981',
      emoji: '💬',
      is_productive: true,
      is_default: true
    },
    {
      name: 'Uncategorized',
      description: 'Uncategorized activities',
      color: '#6b7280',
      emoji: '❓',
      is_productive: false,
      is_default: true
    }
  ];

  return defaultCategories.map(cat =>
    createCategory({
      ...cat,
      user_id: userId,
      is_archived: false
    })
  );
}
