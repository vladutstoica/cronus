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
