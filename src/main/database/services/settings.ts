import { getDatabase } from "../index";

export interface AppSetting {
  key: string;
  value: string; // JSON string
  updated_at: string;
}

/**
 * Get a setting value
 */
export function getSetting(key: string): string | undefined {
  const db = getDatabase();
  const setting = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return setting?.value;
}

/**
 * Get a setting as a boolean
 */
export function getBooleanSetting(key: string, defaultValue = false): boolean {
  const value = getSetting(key);
  if (!value) return defaultValue;
  return value === "true";
}

/**
 * Get all settings
 */
export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  const settings = db.prepare("SELECT key, value FROM app_settings").all() as {
    key: string;
    value: string;
  }[];

  return settings.reduce(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * Set a setting value
 */
export function setSetting(
  key: string,
  value: string | boolean | number,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stringValue = typeof value === "string" ? value : String(value);

  db.prepare(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `,
  ).run(key, stringValue, now);
}

/**
 * Delete a setting
 */
export function deleteSetting(key: string): boolean {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  return result.changes > 0;
}

/**
 * Update multiple settings at once
 */
export function updateSettings(
  settings: Record<string, string | boolean | number>,
): void {
  const db = getDatabase();

  db.transaction(() => {
    Object.entries(settings).forEach(([key, value]) => {
      setSetting(key, value);
    });
  })();
}
