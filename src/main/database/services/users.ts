import { getDatabase } from "../index";
import { randomBytes } from "crypto";

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  has_subscription: boolean;
  is_waitlisted: boolean;
  has_completed_onboarding: boolean;
  is_in_eu: boolean;
  token_version: number;
  electron_app_settings?: string; // JSON string
  user_projects_and_goals?: string; // JSON string
  created_at: string;
  updated_at: string;
}

/**
 * Create or get the default local user
 */
export function getOrCreateLocalUser(): User {
  const db = getDatabase();

  // Check if a user already exists
  const existingUser = db.prepare("SELECT * FROM users LIMIT 1").get() as
    | User
    | undefined;

  if (existingUser) {
    return existingUser;
  }

  // Create a default local user
  const userId = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const user: User = {
    id: userId,
    email: "local@cronus.app",
    name: "Local User",
    picture: undefined,
    has_subscription: true, // No subscription needed for local
    is_waitlisted: false,
    has_completed_onboarding: false,
    is_in_eu: false,
    token_version: 0,
    electron_app_settings: JSON.stringify({}),
    user_projects_and_goals: JSON.stringify([]),
    created_at: now,
    updated_at: now,
  };

  const stmt = db.prepare(`
    INSERT INTO users (
      id, email, name, picture, has_subscription, is_waitlisted,
      has_completed_onboarding, is_in_eu, token_version,
      electron_app_settings, user_projects_and_goals,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    user.id,
    user.email,
    user.name,
    user.picture,
    user.has_subscription ? 1 : 0,
    user.is_waitlisted ? 1 : 0,
    user.has_completed_onboarding ? 1 : 0,
    user.is_in_eu ? 1 : 0,
    user.token_version,
    user.electron_app_settings,
    user.user_projects_and_goals,
    user.created_at,
    user.updated_at,
  );

  return user;
}

/**
 * Get user by ID
 */
export function getUserById(id: string): User | undefined {
  const db = getDatabase();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | User
    | undefined;

  if (user) {
    // Convert SQLite integers to booleans
    user.has_subscription = Boolean(user.has_subscription);
    user.is_waitlisted = Boolean(user.is_waitlisted);
    user.has_completed_onboarding = Boolean(user.has_completed_onboarding);
    user.is_in_eu = Boolean(user.is_in_eu);
  }

  return user;
}

/**
 * Update user
 */
export function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "created_at" | "updated_at">>,
): User | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert snake_case to match DB columns
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      fields.push(`${dbKey} = ?`);

      // Convert booleans to integers
      if (typeof value === "boolean") {
        values.push(value ? 1 : 0);
      } else if (typeof value === "object" && value !== null) {
        // Always JSON.stringify objects (including arrays)
        values.push(JSON.stringify(value));
      } else if (
        key === "user_projects_and_goals" &&
        typeof value === "string"
      ) {
        // Special handling: if goals are sent as plain string, wrap in array and stringify
        try {
          JSON.parse(value); // Check if already valid JSON
          values.push(value); // Already JSON, use as-is
        } catch {
          // Plain string, convert to JSON array
          values.push(JSON.stringify([value]));
        }
      } else {
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getUserById(id);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getUserById(id);
}
