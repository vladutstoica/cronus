/**
 * Integration Credentials Service
 *
 * Handles secure storage and retrieval of integration credentials
 * using Electron's safeStorage for encryption.
 */

import { safeStorage } from "electron";
import { getDatabase } from "../../database";
import { rowToIntegrationCredential } from "../../../shared/taskTypes";
import type {
  TaskProvider,
  IntegrationAuthType,
  IntegrationCredential,
  IntegrationCredentialRow,
} from "../../../shared/taskTypes";

/**
 * Credentials structure for API token authentication
 */
export interface ApiTokenCredentials {
  apiToken: string;
  email?: string; // Required for Jira, optional for Linear
}

/**
 * Credentials structure for OAuth authentication
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Union type for all credential types
 */
export type CredentialData = ApiTokenCredentials | OAuthCredentials;

/**
 * Input for saving credentials
 */
export interface SaveCredentialsInput {
  userId: string;
  provider: TaskProvider;
  authType: IntegrationAuthType;
  credentials: CredentialData;
  baseUrl?: string;
}

/**
 * Result of credential verification
 */
export interface VerificationResult {
  success: boolean;
  error?: string;
  userInfo?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Check if safeStorage is available and usable
 */
export function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Encrypt credentials using Electron's safeStorage
 */
export function encryptCredentials(credentials: CredentialData): string {
  const jsonString = JSON.stringify(credentials);

  if (isSafeStorageAvailable()) {
    const encrypted = safeStorage.encryptString(jsonString);
    return encrypted.toString("base64");
  }

  // Fallback: base64 encode (not secure, but works for development)
  console.warn(
    "safeStorage not available, using base64 encoding (not secure)",
  );
  return Buffer.from(jsonString).toString("base64");
}

/**
 * Decrypt credentials using Electron's safeStorage
 */
export function decryptCredentials(encryptedData: string): CredentialData {
  if (isSafeStorageAvailable()) {
    const buffer = Buffer.from(encryptedData, "base64");
    const decrypted = safeStorage.decryptString(buffer);
    return JSON.parse(decrypted) as CredentialData;
  }

  // Fallback: base64 decode
  const decoded = Buffer.from(encryptedData, "base64").toString("utf-8");
  return JSON.parse(decoded) as CredentialData;
}

/**
 * Save integration credentials to the database
 */
export function saveCredentials(input: SaveCredentialsInput): IntegrationCredential {
  const db = getDatabase();
  const now = new Date().toISOString();
  const encryptedCredentials = encryptCredentials(input.credentials);

  // Use upsert to handle both insert and update
  const stmt = db.prepare(`
    INSERT INTO integration_credentials (
      user_id, provider, auth_type, encrypted_credentials, base_url, is_enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      auth_type = excluded.auth_type,
      encrypted_credentials = excluded.encrypted_credentials,
      base_url = excluded.base_url,
      is_enabled = 1,
      updated_at = excluded.updated_at
    RETURNING *
  `);

  const row = stmt.get(
    input.userId,
    input.provider,
    input.authType,
    encryptedCredentials,
    input.baseUrl ?? null,
    now,
    now,
  ) as IntegrationCredentialRow;

  return rowToIntegrationCredential(row);
}

/**
 * Get credentials for a specific provider
 */
export function getCredentials(
  userId: string,
  provider: TaskProvider,
): IntegrationCredential | null {
  const db = getDatabase();

  const row = db
    .prepare(
      `SELECT * FROM integration_credentials
       WHERE user_id = ? AND provider = ? AND is_enabled = 1`,
    )
    .get(userId, provider) as IntegrationCredentialRow | undefined;

  if (!row) {
    return null;
  }

  return rowToIntegrationCredential(row);
}

/**
 * Get decrypted credentials for a specific provider
 */
export function getDecryptedCredentials(
  userId: string,
  provider: TaskProvider,
): { credential: IntegrationCredential; data: CredentialData } | null {
  const credential = getCredentials(userId, provider);

  if (!credential) {
    return null;
  }

  try {
    const data = decryptCredentials(credential.encryptedCredentials);
    return { credential, data };
  } catch (error) {
    console.error(`Failed to decrypt credentials for ${provider}:`, error);
    return null;
  }
}

/**
 * Get all enabled credentials for a user
 */
export function getAllCredentials(userId: string): IntegrationCredential[] {
  const db = getDatabase();

  const rows = db
    .prepare(
      `SELECT * FROM integration_credentials
       WHERE user_id = ? AND is_enabled = 1`,
    )
    .all(userId) as IntegrationCredentialRow[];

  return rows.map(rowToIntegrationCredential);
}

/**
 * Delete credentials for a specific provider
 */
export function deleteCredentials(userId: string, provider: TaskProvider): boolean {
  const db = getDatabase();

  const result = db
    .prepare(`DELETE FROM integration_credentials WHERE user_id = ? AND provider = ?`)
    .run(userId, provider);

  return result.changes > 0;
}

/**
 * Disable credentials without deleting them
 */
export function disableCredentials(userId: string, provider: TaskProvider): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE integration_credentials
       SET is_enabled = 0, updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    )
    .run(now, userId, provider);

  return result.changes > 0;
}

/**
 * Enable previously disabled credentials
 */
export function enableCredentials(userId: string, provider: TaskProvider): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE integration_credentials
       SET is_enabled = 1, updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    )
    .run(now, userId, provider);

  return result.changes > 0;
}

/**
 * Update the last verified timestamp
 */
export function updateLastVerified(
  userId: string,
  provider: TaskProvider,
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE integration_credentials
       SET last_verified_at = ?, updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    )
    .run(now, now, userId, provider);

  return result.changes > 0;
}

/**
 * Check if credentials exist for a provider
 */
export function hasCredentials(userId: string, provider: TaskProvider): boolean {
  const db = getDatabase();

  const row = db
    .prepare(
      `SELECT 1 FROM integration_credentials
       WHERE user_id = ? AND provider = ? AND is_enabled = 1`,
    )
    .get(userId, provider);

  return row !== undefined;
}

/**
 * Get integration status for all providers
 */
export function getIntegrationStatuses(
  userId: string,
): Map<TaskProvider, { isConfigured: boolean; isEnabled: boolean; lastVerifiedAt?: string }> {
  const db = getDatabase();

  const rows = db
    .prepare(`SELECT provider, is_enabled, last_verified_at FROM integration_credentials WHERE user_id = ?`)
    .all(userId) as Array<{
    provider: TaskProvider;
    is_enabled: number;
    last_verified_at: string | null;
  }>;

  const statuses = new Map<
    TaskProvider,
    { isConfigured: boolean; isEnabled: boolean; lastVerifiedAt?: string }
  >();

  // Initialize with defaults
  const providers: TaskProvider[] = ["jira", "linear"];
  for (const provider of providers) {
    statuses.set(provider, { isConfigured: false, isEnabled: false });
  }

  // Update with actual data
  for (const row of rows) {
    statuses.set(row.provider, {
      isConfigured: true,
      isEnabled: row.is_enabled === 1,
      lastVerifiedAt: row.last_verified_at ?? undefined,
    });
  }

  return statuses;
}
