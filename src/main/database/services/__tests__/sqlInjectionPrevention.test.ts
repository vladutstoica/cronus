import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

let db: Database.Database;

// Mock the database module to use in-memory SQLite
vi.mock('../../index', () => ({
  getDatabase: () => db,
  initDatabase: () => db,
}));

// Import after mock is set up
import { updateActiveWindowEvent, getEventById } from '../activeWindowEvents';
import { updateCategory, getCategoryById } from '../categories';
import { updateUser, getUserById } from '../users';

// ---------- Schema helpers ----------

function createActiveWindowEventsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS active_window_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      window_id TEXT,
      owner_name TEXT,
      type TEXT DEFAULT 'app',
      browser TEXT,
      title TEXT,
      url TEXT,
      content TEXT,
      category_id TEXT,
      category_reasoning TEXT,
      llm_summary TEXT,
      timestamp TEXT NOT NULL,
      screenshot_path TEXT,
      duration_ms INTEGER DEFAULT 0,
      last_categorization_at TEXT,
      generated_title TEXT,
      old_category_id TEXT,
      old_category_reasoning TEXT,
      old_llm_summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function createCategoriesTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6b7280',
      emoji TEXT,
      is_productive INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function createUsersTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      has_subscription INTEGER DEFAULT 0,
      is_waitlisted INTEGER DEFAULT 0,
      has_completed_onboarding INTEGER DEFAULT 0,
      is_in_eu INTEGER DEFAULT 0,
      token_version INTEGER DEFAULT 0,
      electron_app_settings TEXT,
      user_projects_and_goals TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// ---------- Seed helpers ----------

function seedActiveWindowEvent(database: Database.Database): void {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO active_window_events (
      id, user_id, title, url, owner_name, type, timestamp, duration_ms, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('event-1', 'user-1', 'Original Title', 'https://example.com', 'Chrome', 'app', now, 5000, now, now);
}

function seedCategory(database: Database.Database): void {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO categories (
      id, user_id, name, description, color, is_productive, is_default, is_archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('cat-1', 'user-1', 'Work', 'Work stuff', '#3b82f6', 1, 0, 0, now, now);
}

function seedUser(database: Database.Database): void {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO users (
      id, email, name, picture, has_subscription, is_waitlisted,
      has_completed_onboarding, is_in_eu, token_version,
      electron_app_settings, user_projects_and_goals,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('user-1', 'test@example.com', 'Test User', null, 0, 0, 0, 0, 0, '{}', '[]', now, now);
}

// ---------- Tests ----------

describe('SQL Injection Prevention via ALLOWED_COLUMNS', () => {

  // ==========================================
  // activeWindowEvents
  // ==========================================
  describe('activeWindowEvents - updateActiveWindowEvent', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      createActiveWindowEventsTable(db);
      seedActiveWindowEvent(db);
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      db.close();
    });

    it('should update valid columns normally', () => {
      const result = updateActiveWindowEvent('event-1', {
        title: 'Updated Title',
        url: 'https://updated.com',
        duration_ms: 10000,
      });

      expect(result).toBeDefined();
      expect(result!.title).toBe('Updated Title');
      expect(result!.url).toBe('https://updated.com');
      expect(result!.duration_ms).toBe(10000);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should reject SQL injection attempt via object key', () => {
      const maliciousUpdates = {
        ["id = '1'; DROP TABLE active_window_events; --"]: 'malicious',
      } as any;

      const result = updateActiveWindowEvent('event-1', maliciousUpdates);

      // Event should be returned unchanged (no fields passed validation)
      expect(result).toBeDefined();
      expect(result!.title).toBe('Original Title');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rejected invalid column name'),
      );
    });

    it('should apply valid keys and skip invalid keys in a mixed update', () => {
      const mixedUpdates = {
        title: 'New Title',
        ["'; DROP TABLE active_window_events; --"]: 'malicious',
        url: 'https://safe.com',
      } as any;

      const result = updateActiveWindowEvent('event-1', mixedUpdates);

      expect(result).toBeDefined();
      expect(result!.title).toBe('New Title');
      expect(result!.url).toBe('https://safe.com');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rejected invalid column name'),
      );
    });

    it('should return event unchanged when all keys are invalid', () => {
      const allInvalidUpdates = {
        ['malicious_col_1']: 'bad',
        ['malicious_col_2']: 'worse',
      } as any;

      const before = getEventById('event-1');
      const result = updateActiveWindowEvent('event-1', allInvalidUpdates);

      expect(result).toBeDefined();
      expect(result!.title).toBe(before!.title);
      expect(result!.url).toBe(before!.url);
      expect(result!.updated_at).toBe(before!.updated_at);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('should log console.warn for each rejected key', () => {
      const updates = {
        ['bad_key_1']: 'a',
        ['bad_key_2']: 'b',
        ['bad_key_3']: 'c',
      } as any;

      updateActiveWindowEvent('event-1', updates);

      expect(warnSpy).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('"bad_key_1"'),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('"bad_key_2"'),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('"bad_key_3"'),
      );
    });

    it('should reject attempts to modify protected columns like id or user_id', () => {
      const updates = {
        id: 'hijacked-id',
        user_id: 'hijacked-user',
      } as any;

      const result = updateActiveWindowEvent('event-1', updates);

      expect(result).toBeDefined();
      expect(result!.id).toBe('event-1');
      expect(result!.user_id).toBe('user-1');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================
  // categories
  // ==========================================
  describe('categories - updateCategory', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      createCategoriesTable(db);
      seedCategory(db);
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      db.close();
    });

    it('should update valid columns normally', () => {
      const result = updateCategory('cat-1', {
        name: 'Personal',
        color: '#8b5cf6',
        description: 'Personal tasks',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Personal');
      expect(result!.color).toBe('#8b5cf6');
      expect(result!.description).toBe('Personal tasks');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should correctly convert booleans to integers for storage', () => {
      const result = updateCategory('cat-1', {
        is_productive: false,
        is_archived: true,
      });

      expect(result).toBeDefined();
      // The service converts integers back to booleans on read
      expect(result!.is_productive).toBe(false);
      expect(result!.is_archived).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should reject SQL injection attempt via object key', () => {
      const maliciousUpdates = {
        ["id = '1'; DROP TABLE categories; --"]: 'malicious',
      } as any;

      const result = updateCategory('cat-1', maliciousUpdates);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Work');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rejected invalid column name'),
      );
    });

    it('should apply valid keys and skip invalid keys in a mixed update', () => {
      const mixedUpdates = {
        name: 'Updated Work',
        ["1=1; DROP TABLE categories; --"]: 'malicious',
        color: '#ff0000',
      } as any;

      const result = updateCategory('cat-1', mixedUpdates);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Updated Work');
      expect(result!.color).toBe('#ff0000');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should return category unchanged when all keys are invalid', () => {
      const before = getCategoryById('cat-1');
      const allInvalidUpdates = {
        ['fake_col']: 'nope',
        ['another_fake']: 'nah',
      } as any;

      const result = updateCategory('cat-1', allInvalidUpdates);

      expect(result).toBeDefined();
      expect(result!.name).toBe(before!.name);
      expect(result!.color).toBe(before!.color);
      expect(result!.updated_at).toBe(before!.updated_at);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('should log console.warn for each rejected key', () => {
      const updates = {
        ['injection_1']: 'x',
        ['injection_2']: 'y',
      } as any;

      updateCategory('cat-1', updates);

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('"injection_1"'),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('"injection_2"'),
      );
    });

    it('should reject attempts to modify protected columns like id or user_id', () => {
      const updates = {
        id: 'hijacked-id',
        user_id: 'hijacked-user',
      } as any;

      const result = updateCategory('cat-1', updates);

      expect(result).toBeDefined();
      expect(result!.id).toBe('cat-1');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================
  // users
  // ==========================================
  describe('users - updateUser', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      createUsersTable(db);
      seedUser(db);
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      db.close();
    });

    it('should update valid columns using snake_case keys', () => {
      const result = updateUser('user-1', {
        email: 'updated@example.com',
        name: 'Updated User',
      } as any);

      expect(result).toBeDefined();
      expect(result!.email).toBe('updated@example.com');
      expect(result!.name).toBe('Updated User');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should update valid columns using camelCase keys that map to valid snake_case', () => {
      const result = updateUser('user-1', {
        hasSubscription: true,
        hasCompletedOnboarding: true,
        isInEu: true,
      } as any);

      expect(result).toBeDefined();
      expect(result!.has_subscription).toBe(true);
      expect(result!.has_completed_onboarding).toBe(true);
      expect(result!.is_in_eu).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should reject SQL injection attempt via object key', () => {
      const maliciousUpdates = {
        ["id = '1'; DROP TABLE users; --"]: 'malicious',
      } as any;

      const result = updateUser('user-1', maliciousUpdates);

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
      expect(result!.name).toBe('Test User');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rejected invalid column name'),
      );
    });

    it('should apply valid keys and skip invalid keys in a mixed update', () => {
      const mixedUpdates = {
        name: 'Safe Name',
        ["'; DELETE FROM users; --"]: 'malicious',
        email: 'safe@example.com',
      } as any;

      const result = updateUser('user-1', mixedUpdates);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Safe Name');
      expect(result!.email).toBe('safe@example.com');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should return user unchanged when all keys are invalid', () => {
      const before = getUserById('user-1');
      const allInvalidUpdates = {
        ['bogus_field']: 'nope',
        ['another_bogus']: 'nah',
      } as any;

      const result = updateUser('user-1', allInvalidUpdates);

      expect(result).toBeDefined();
      expect(result!.email).toBe(before!.email);
      expect(result!.name).toBe(before!.name);
      expect(result!.updated_at).toBe(before!.updated_at);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('should log console.warn for each rejected key', () => {
      const updates = {
        ['bad_1']: 'a',
        ['bad_2']: 'b',
        ['bad_3']: 'c',
      } as any;

      updateUser('user-1', updates);

      expect(warnSpy).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Rejected invalid column name'),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Rejected invalid column name'),
      );
      expect(warnSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Rejected invalid column name'),
      );
    });

    it('should reject camelCase keys that convert to invalid snake_case columns', () => {
      // camelCase keys that do not correspond to any valid column after conversion
      const updates = {
        maliciousField: 'injected',
        dangerousPayload: 'attack',
      } as any;

      const result = updateUser('user-1', updates);

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
      expect(warnSpy).toHaveBeenCalledTimes(2);
      // Verify the warning includes the converted snake_case form
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"malicious_field"'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"dangerous_payload"'),
      );
    });

    it('should reject attempts to modify protected columns like id', () => {
      const updates = {
        id: 'hijacked-id',
      } as any;

      const result = updateUser('user-1', updates);

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-1');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle SQL injection payloads converted from camelCase', () => {
      // The camelCase-to-snake_case conversion transforms the attack string,
      // but the result still does not match any allowed column
      const updates = {
        ["'; DROP TABLE users; --"]: 'attack',
      } as any;

      const before = getUserById('user-1');
      const result = updateUser('user-1', updates);

      expect(result).toBeDefined();
      expect(result!.email).toBe(before!.email);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rejected invalid column name'),
      );
    });
  });
});
