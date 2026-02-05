import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "cronus.db");

  // Ensure the directory exists
  fs.mkdirSync(userDataPath, { recursive: true });

  console.log("Initializing database at:", dbPath);

  db = new Database(dbPath); // Removed verbose logging
  db.pragma("journal_mode = WAL"); // Enable Write-Ahead Logging for better performance
  db.pragma("foreign_keys = ON"); // Enable foreign key constraints

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
  // Create a migrations table to track applied migrations
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrations = [
    {
      name: "001_initial_schema",
      up: `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          picture TEXT,
          has_subscription INTEGER DEFAULT 0,
          is_waitlisted INTEGER DEFAULT 0,
          has_completed_onboarding INTEGER DEFAULT 0,
          is_in_eu INTEGER DEFAULT 0,
          token_version INTEGER DEFAULT 0,
          electron_app_settings TEXT, -- JSON string
          user_projects_and_goals TEXT, -- JSON string
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          emoji TEXT,
          is_productive INTEGER DEFAULT 0,
          is_default INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Active window events table
        CREATE TABLE IF NOT EXISTS active_window_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          window_id TEXT,
          owner_name TEXT,
          type TEXT,
          browser TEXT,
          title TEXT,
          url TEXT,
          content TEXT,
          category_id TEXT,
          category_reasoning TEXT,
          llm_summary TEXT,
          timestamp DATETIME NOT NULL,
          screenshot_path TEXT, -- Local file path
          duration_ms INTEGER DEFAULT 0,
          last_categorization_at DATETIME,
          generated_title TEXT,
          old_category_id TEXT,
          old_category_reasoning TEXT,
          old_llm_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
        CREATE INDEX IF NOT EXISTS idx_categories_archived ON categories(is_archived);
        CREATE INDEX IF NOT EXISTS idx_events_user_id ON active_window_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON active_window_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_category_id ON active_window_events(category_id);
        CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON active_window_events(user_id, timestamp DESC);
      `,
    },
    {
      name: "002_app_settings",
      up: `
        -- App settings table for configuration
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT, -- JSON string
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Insert default settings
        INSERT OR IGNORE INTO app_settings (key, value) VALUES
          ('ai_enabled', 'true'),
          ('screenshots_enabled', 'false'),
          ('ollama_model', 'llama3.2'),
          ('categorization_enabled', 'true');
      `,
    },
    {
      name: "003_ai_provider_settings",
      up: `
        -- Add AI provider settings
        INSERT OR IGNORE INTO app_settings (key, value) VALUES
          ('ai_provider', 'ollama'),
          ('ollama_base_url', 'http://localhost:11434'),
          ('lmstudio_base_url', 'http://localhost:1234/v1'),
          ('lmstudio_model', '');

        -- Update ollama_model to use 1b variant for better performance
        UPDATE app_settings SET value = 'llama3.2:1b' WHERE key = 'ollama_model' AND value = 'llama3.2';
      `,
    },
    {
      name: "004_fix_category_is_productive",
      up: `
        -- Fix is_productive values for default categories
        -- This migration fixes categories that were created with the camelCase bug
        -- where isProductive was not converted to is_productive

        UPDATE categories SET is_productive = 1
        WHERE name IN ('Work', 'Personal', 'Communication') AND is_default = 1;

        UPDATE categories SET is_productive = 0
        WHERE name IN ('Entertainment', 'Uncategorized') AND is_default = 1;
      `,
    },
    {
      name: "005_todos_table",
      up: `
        -- Todos table
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
          is_focus INTEGER DEFAULT 0,
          tags TEXT, -- JSON array of strings
          scheduled_date TEXT NOT NULL, -- Date in YYYY-MM-DD format
          original_date TEXT, -- Original creation date if rolled over
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
        CREATE INDEX IF NOT EXISTS idx_todos_scheduled_date ON todos(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
        CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos(user_id, scheduled_date);
      `,
    },
    {
      name: "006_work_sessions_table",
      up: `
        -- Work sessions table for tracking time on specific tasks (Jira, etc.)
        CREATE TABLE IF NOT EXISTS work_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          note TEXT NOT NULL,
          started_at DATETIME NOT NULL,
          ended_at DATETIME,
          duration_ms INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_work_sessions_started_at ON work_sessions(started_at);
        CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON work_sessions(user_id, started_at);
      `,
    },
    {
      name: "007_categorization_rules",
      up: `
        -- Categorization patterns table for learned patterns from user corrections
        CREATE TABLE IF NOT EXISTS categorization_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          pattern_type TEXT NOT NULL CHECK (pattern_type IN ('app', 'domain', 'url_path', 'title_keyword')),
          pattern_value TEXT NOT NULL,
          category_id TEXT NOT NULL,
          confidence REAL DEFAULT 0.5,
          match_count INTEGER DEFAULT 0,
          correction_count INTEGER DEFAULT 0,
          source TEXT NOT NULL CHECK (source IN ('user_correction', 'manual', 'template')),
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE (user_id, pattern_type, pattern_value)
        );

        -- Categorization rules table for user-defined and template rules
        CREATE TABLE IF NOT EXISTS categorization_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category_id TEXT NOT NULL,
          conditions TEXT NOT NULL, -- JSON array of condition objects
          condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
          priority INTEGER DEFAULT 0,
          confidence REAL DEFAULT 1.0,
          is_enabled INTEGER DEFAULT 1,
          is_system INTEGER DEFAULT 0,
          source TEXT NOT NULL CHECK (source IN ('user', 'template')),
          match_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        -- Indexes for categorization_patterns
        CREATE INDEX IF NOT EXISTS idx_cat_patterns_user_id ON categorization_patterns(user_id);
        CREATE INDEX IF NOT EXISTS idx_cat_patterns_category_id ON categorization_patterns(category_id);
        CREATE INDEX IF NOT EXISTS idx_cat_patterns_type_value ON categorization_patterns(pattern_type, pattern_value);
        CREATE INDEX IF NOT EXISTS idx_cat_patterns_confidence ON categorization_patterns(confidence DESC);

        -- Indexes for categorization_rules
        CREATE INDEX IF NOT EXISTS idx_cat_rules_user_id ON categorization_rules(user_id);
        CREATE INDEX IF NOT EXISTS idx_cat_rules_category_id ON categorization_rules(category_id);
        CREATE INDEX IF NOT EXISTS idx_cat_rules_priority ON categorization_rules(priority DESC);
        CREATE INDEX IF NOT EXISTS idx_cat_rules_enabled ON categorization_rules(is_enabled);
        CREATE INDEX IF NOT EXISTS idx_cat_rules_user_enabled_priority ON categorization_rules(user_id, is_enabled, priority DESC);
      `,
    },
    {
      name: "008_task_tracking",
      up: `
        -- External tasks table: cached Jira/Linear issues
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
          labels TEXT, -- JSON array
          priority TEXT,
          estimate_seconds INTEGER,
          last_synced_at TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (user_id, provider, external_id)
        );

        -- Task associations table: links activity events to tasks
        CREATE TABLE IF NOT EXISTS task_associations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          event_id INTEGER NOT NULL,
          task_id INTEGER NOT NULL,
          detection_method TEXT NOT NULL CHECK (detection_method IN ('git_branch', 'window_title', 'url_pattern', 'manual', 'active_session')),
          confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
          is_confirmed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES external_tasks(id) ON DELETE CASCADE,
          UNIQUE (event_id, task_id)
        );

        -- Worklogs table: aggregated time per task per day
        CREATE TABLE IF NOT EXISTS worklogs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          task_id INTEGER NOT NULL,
          date TEXT NOT NULL, -- YYYY-MM-DD format
          total_seconds INTEGER NOT NULL DEFAULT 0,
          description TEXT,
          sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'skipped')),
          external_worklog_id TEXT,
          synced_at TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES external_tasks(id) ON DELETE CASCADE,
          UNIQUE (user_id, task_id, date)
        );

        -- Task detection rules table: custom detection patterns
        CREATE TABLE IF NOT EXISTS task_detection_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          rule_type TEXT NOT NULL CHECK (rule_type IN ('git_branch_pattern', 'window_title_pattern', 'url_pattern')),
          pattern TEXT NOT NULL,
          task_id INTEGER,
          project_key TEXT,
          priority INTEGER DEFAULT 0,
          is_enabled INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES external_tasks(id) ON DELETE SET NULL
        );

        -- Integration credentials table: encrypted API tokens
        CREATE TABLE IF NOT EXISTS integration_credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL CHECK (provider IN ('jira', 'linear')),
          auth_type TEXT NOT NULL CHECK (auth_type IN ('api_token', 'oauth')),
          encrypted_credentials TEXT NOT NULL, -- JSON with encrypted data
          base_url TEXT,
          is_enabled INTEGER DEFAULT 1,
          last_verified_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (user_id, provider)
        );

        -- Indexes for external_tasks
        CREATE INDEX IF NOT EXISTS idx_external_tasks_user_id ON external_tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_external_tasks_provider ON external_tasks(provider);
        CREATE INDEX IF NOT EXISTS idx_external_tasks_project_key ON external_tasks(project_key);
        CREATE INDEX IF NOT EXISTS idx_external_tasks_status ON external_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_external_tasks_user_provider ON external_tasks(user_id, provider);
        CREATE INDEX IF NOT EXISTS idx_external_tasks_last_synced ON external_tasks(last_synced_at);

        -- Indexes for task_associations
        CREATE INDEX IF NOT EXISTS idx_task_assoc_user_id ON task_associations(user_id);
        CREATE INDEX IF NOT EXISTS idx_task_assoc_event_id ON task_associations(event_id);
        CREATE INDEX IF NOT EXISTS idx_task_assoc_task_id ON task_associations(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_assoc_detection_method ON task_associations(detection_method);
        CREATE INDEX IF NOT EXISTS idx_task_assoc_confirmed ON task_associations(is_confirmed);

        -- Indexes for worklogs
        CREATE INDEX IF NOT EXISTS idx_worklogs_user_id ON worklogs(user_id);
        CREATE INDEX IF NOT EXISTS idx_worklogs_task_id ON worklogs(task_id);
        CREATE INDEX IF NOT EXISTS idx_worklogs_date ON worklogs(date);
        CREATE INDEX IF NOT EXISTS idx_worklogs_sync_status ON worklogs(sync_status);
        CREATE INDEX IF NOT EXISTS idx_worklogs_user_date ON worklogs(user_id, date);
        CREATE INDEX IF NOT EXISTS idx_worklogs_task_date ON worklogs(task_id, date);

        -- Indexes for task_detection_rules
        CREATE INDEX IF NOT EXISTS idx_detection_rules_user_id ON task_detection_rules(user_id);
        CREATE INDEX IF NOT EXISTS idx_detection_rules_type ON task_detection_rules(rule_type);
        CREATE INDEX IF NOT EXISTS idx_detection_rules_enabled ON task_detection_rules(is_enabled);
        CREATE INDEX IF NOT EXISTS idx_detection_rules_priority ON task_detection_rules(priority DESC);
        CREATE INDEX IF NOT EXISTS idx_detection_rules_user_enabled ON task_detection_rules(user_id, is_enabled, priority DESC);

        -- Indexes for integration_credentials
        CREATE INDEX IF NOT EXISTS idx_integration_creds_user_id ON integration_credentials(user_id);
        CREATE INDEX IF NOT EXISTS idx_integration_creds_provider ON integration_credentials(provider);
        CREATE INDEX IF NOT EXISTS idx_integration_creds_enabled ON integration_credentials(is_enabled);
      `,
    },
  ];

  // Apply migrations
  for (const migration of migrations) {
    const existing = database
      .prepare("SELECT * FROM _migrations WHERE name = ?")
      .get(migration.name);

    if (!existing) {
      console.log(`Applying migration: ${migration.name}`);
      try {
        database.exec(migration.up);
        database
          .prepare("INSERT INTO _migrations (name) VALUES (?)")
          .run(migration.name);
        console.log(`Migration ${migration.name} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${migration.name}:`, error);
        throw error;
      }
    } else {
      console.log(`Migration ${migration.name} already applied`);
    }
  }
}
