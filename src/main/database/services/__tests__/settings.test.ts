import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

/**
 * Settings service tests using an in-memory SQLite database.
 * We bypass the module-level getDatabase() by directly importing the functions
 * and mocking the database module to return our in-memory instance.
 */

let db: Database.Database;

// Mock the database module to use in-memory SQLite
vi.mock("../../index", () => ({
  getDatabase: () => db,
  initDatabase: () => db,
}));

// Import after mock is set up
import {
  getSetting,
  setSetting,
  getBooleanSetting,
  getAllSettings,
  deleteSetting,
  updateSettings,
} from "../settings";

function applyMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

describe("Settings Service", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("setSetting / getSetting", () => {
    it("should store and retrieve a string setting", () => {
      setSetting("theme", "dark");
      const result = getSetting("theme");
      expect(result).toBe("dark");
    });

    it("should store a boolean value as a string", () => {
      setSetting("ai_enabled", true);
      const result = getSetting("ai_enabled");
      expect(result).toBe("true");
    });

    it("should store a number value as a string", () => {
      setSetting("interval", 5000);
      const result = getSetting("interval");
      expect(result).toBe("5000");
    });

    it("should return undefined for a non-existent setting", () => {
      const result = getSetting("nonexistent_key");
      expect(result).toBeUndefined();
    });

    it("should overwrite an existing setting via upsert", () => {
      setSetting("theme", "dark");
      setSetting("theme", "light");
      const result = getSetting("theme");
      expect(result).toBe("light");
    });
  });

  describe("getBooleanSetting", () => {
    it('should return true when value is "true"', () => {
      setSetting("feature_flag", "true");
      expect(getBooleanSetting("feature_flag")).toBe(true);
    });

    it('should return false when value is "false"', () => {
      setSetting("feature_flag", "false");
      expect(getBooleanSetting("feature_flag")).toBe(false);
    });

    it("should return default value when setting does not exist", () => {
      expect(getBooleanSetting("missing", true)).toBe(true);
      expect(getBooleanSetting("missing", false)).toBe(false);
    });

    it("should return false as default when no default provided", () => {
      expect(getBooleanSetting("missing")).toBe(false);
    });
  });

  describe("getAllSettings", () => {
    it("should return an empty object when no settings exist", () => {
      const result = getAllSettings();
      expect(result).toEqual({});
    });

    it("should return all stored settings as key-value pairs", () => {
      setSetting("key1", "value1");
      setSetting("key2", "value2");
      setSetting("key3", "value3");

      const result = getAllSettings();
      expect(result).toEqual({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });
    });
  });

  describe("deleteSetting", () => {
    it("should delete an existing setting and return true", () => {
      setSetting("to_delete", "value");
      const result = deleteSetting("to_delete");
      expect(result).toBe(true);
      expect(getSetting("to_delete")).toBeUndefined();
    });

    it("should return false when deleting a non-existent setting", () => {
      const result = deleteSetting("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("updateSettings", () => {
    it("should update multiple settings in a single transaction", () => {
      updateSettings({
        theme: "dark",
        language: "en",
        ai_enabled: true,
        interval: 3000,
      });

      expect(getSetting("theme")).toBe("dark");
      expect(getSetting("language")).toBe("en");
      expect(getSetting("ai_enabled")).toBe("true");
      expect(getSetting("interval")).toBe("3000");
    });

    it("should overwrite existing settings within the batch", () => {
      setSetting("theme", "light");
      updateSettings({ theme: "dark", new_key: "new_value" });

      expect(getSetting("theme")).toBe("dark");
      expect(getSetting("new_key")).toBe("new_value");
    });
  });
});
