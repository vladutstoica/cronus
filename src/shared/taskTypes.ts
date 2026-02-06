/**
 * Types for the task tracking system with Jira/Linear integration
 * Used by both main and renderer processes
 */

// ============================================================================
// Enums and Type Aliases
// ============================================================================

/** Supported external task providers */
export type TaskProvider = "jira" | "linear";

/** Methods for detecting task associations */
export type DetectionMethod =
  | "git_branch"
  | "window_title"
  | "url_pattern"
  | "manual"
  | "active_session";

/** Sync status for worklogs */
export type WorklogSyncStatus = "pending" | "synced" | "failed" | "skipped";

/** Types of task detection rules */
export type TaskDetectionRuleType =
  | "git_branch_pattern"
  | "window_title_pattern"
  | "url_pattern";

/** Authentication types for integrations */
export type IntegrationAuthType = "api_token" | "oauth";

// ============================================================================
// External Tasks
// ============================================================================

/**
 * External task from Jira or Linear
 * Application-facing interface with camelCase
 */
export interface ExternalTask {
  id: number;
  userId: string;
  provider: TaskProvider;
  externalId: string;
  externalUrl?: string;
  title: string;
  description?: string;
  projectKey?: string;
  projectName?: string;
  status?: string;
  assignee?: string;
  labels: string[];
  priority?: string;
  estimateSeconds?: number;
  lastSyncedAt?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for external_tasks
 * Uses snake_case column names
 */
export interface ExternalTaskRow {
  id: number;
  user_id: string;
  provider: TaskProvider;
  external_id: string;
  external_url: string | null;
  title: string;
  description: string | null;
  project_key: string | null;
  project_name: string | null;
  status: string | null;
  assignee: string | null;
  labels: string | null; // JSON array
  priority: string | null;
  estimate_seconds: number | null;
  last_synced_at: string | null;
  is_archived: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new external task
 */
export interface CreateExternalTaskInput {
  userId: string;
  provider: TaskProvider;
  externalId: string;
  externalUrl?: string;
  title: string;
  description?: string;
  projectKey?: string;
  projectName?: string;
  status?: string;
  assignee?: string;
  labels?: string[];
  priority?: string;
  estimateSeconds?: number;
}

/**
 * Input for updating an existing external task
 */
export interface UpdateExternalTaskInput {
  id: number;
  externalUrl?: string;
  title?: string;
  description?: string;
  projectKey?: string;
  projectName?: string;
  status?: string;
  assignee?: string;
  labels?: string[];
  priority?: string;
  estimateSeconds?: number;
  lastSyncedAt?: string;
  isArchived?: boolean;
}

// ============================================================================
// Task Associations
// ============================================================================

/**
 * Association between an activity event and a task
 * Application-facing interface with camelCase
 */
export interface TaskAssociation {
  id: number;
  userId: string;
  eventId: number;
  taskId: number;
  detectionMethod: DetectionMethod;
  confidenceScore: number;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for task_associations
 * Uses snake_case column names
 */
export interface TaskAssociationRow {
  id: number;
  user_id: string;
  event_id: number;
  task_id: number;
  detection_method: DetectionMethod;
  confidence_score: number;
  is_confirmed: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new task association
 */
export interface CreateTaskAssociationInput {
  userId: string;
  eventId: number;
  taskId: number;
  detectionMethod: DetectionMethod;
  confidenceScore?: number;
  isConfirmed?: boolean;
}

/**
 * Input for updating an existing task association
 */
export interface UpdateTaskAssociationInput {
  id: number;
  confidenceScore?: number;
  isConfirmed?: boolean;
}

// ============================================================================
// Worklogs
// ============================================================================

/**
 * Aggregated time log per task per day
 * Application-facing interface with camelCase
 */
export interface Worklog {
  id: number;
  userId: string;
  taskId: number;
  date: string; // YYYY-MM-DD format
  totalSeconds: number;
  description?: string;
  syncStatus: WorklogSyncStatus;
  externalWorklogId?: string;
  syncedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for worklogs
 * Uses snake_case column names
 */
export interface WorklogRow {
  id: number;
  user_id: string;
  task_id: number;
  date: string;
  total_seconds: number;
  description: string | null;
  sync_status: WorklogSyncStatus;
  external_worklog_id: string | null;
  synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new worklog
 */
export interface CreateWorklogInput {
  userId: string;
  taskId: number;
  date: string;
  totalSeconds: number;
  description?: string;
  syncStatus?: WorklogSyncStatus;
}

/**
 * Input for updating an existing worklog
 */
export interface UpdateWorklogInput {
  id: number;
  totalSeconds?: number;
  description?: string;
  syncStatus?: WorklogSyncStatus;
  externalWorklogId?: string;
  syncedAt?: string;
  errorMessage?: string;
}

// ============================================================================
// Task Detection Rules
// ============================================================================

/**
 * Custom detection rule for associating tasks
 * Application-facing interface with camelCase
 */
export interface TaskDetectionRule {
  id: number;
  userId: string;
  ruleType: TaskDetectionRuleType;
  pattern: string;
  taskId?: number;
  projectKey?: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for task_detection_rules
 * Uses snake_case column names
 */
export interface TaskDetectionRuleRow {
  id: number;
  user_id: string;
  rule_type: TaskDetectionRuleType;
  pattern: string;
  task_id: number | null;
  project_key: string | null;
  priority: number;
  is_enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new task detection rule
 */
export interface CreateTaskDetectionRuleInput {
  userId: string;
  ruleType: TaskDetectionRuleType;
  pattern: string;
  taskId?: number;
  projectKey?: string;
  priority?: number;
  isEnabled?: boolean;
}

/**
 * Input for updating an existing task detection rule
 */
export interface UpdateTaskDetectionRuleInput {
  id: number;
  ruleType?: TaskDetectionRuleType;
  pattern?: string;
  taskId?: number | null;
  projectKey?: string | null;
  priority?: number;
  isEnabled?: boolean;
}

// ============================================================================
// Integration Credentials
// ============================================================================

/**
 * Encrypted credentials for external integrations
 * Application-facing interface with camelCase
 */
export interface IntegrationCredential {
  id: number;
  userId: string;
  provider: TaskProvider;
  authType: IntegrationAuthType;
  encryptedCredentials: string; // JSON with encrypted data
  baseUrl?: string;
  isEnabled: boolean;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for integration_credentials
 * Uses snake_case column names
 */
export interface IntegrationCredentialRow {
  id: number;
  user_id: string;
  provider: TaskProvider;
  auth_type: IntegrationAuthType;
  encrypted_credentials: string;
  base_url: string | null;
  is_enabled: number; // SQLite boolean (0 or 1)
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating integration credentials
 */
export interface CreateIntegrationCredentialInput {
  userId: string;
  provider: TaskProvider;
  authType: IntegrationAuthType;
  encryptedCredentials: string;
  baseUrl?: string;
  isEnabled?: boolean;
}

/**
 * Input for updating integration credentials
 */
export interface UpdateIntegrationCredentialInput {
  id: number;
  authType?: IntegrationAuthType;
  encryptedCredentials?: string;
  baseUrl?: string | null;
  isEnabled?: boolean;
  lastVerifiedAt?: string;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a database row to an ExternalTask object
 */
export function rowToExternalTask(row: ExternalTaskRow): ExternalTask {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    externalId: row.external_id,
    externalUrl: row.external_url ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    projectKey: row.project_key ?? undefined,
    projectName: row.project_name ?? undefined,
    status: row.status ?? undefined,
    assignee: row.assignee ?? undefined,
    labels: row.labels ? (JSON.parse(row.labels) as string[]) : [],
    priority: row.priority ?? undefined,
    estimateSeconds: row.estimate_seconds ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert an ExternalTask to database row format
 */
export function externalTaskToRow(
  task: Omit<ExternalTask, "id" | "createdAt" | "updatedAt">,
): Omit<ExternalTaskRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: task.userId,
    provider: task.provider,
    external_id: task.externalId,
    external_url: task.externalUrl ?? null,
    title: task.title,
    description: task.description ?? null,
    project_key: task.projectKey ?? null,
    project_name: task.projectName ?? null,
    status: task.status ?? null,
    assignee: task.assignee ?? null,
    labels: task.labels.length > 0 ? JSON.stringify(task.labels) : null,
    priority: task.priority ?? null,
    estimate_seconds: task.estimateSeconds ?? null,
    last_synced_at: task.lastSyncedAt ?? null,
    is_archived: task.isArchived ? 1 : 0,
  };
}

/**
 * Convert a database row to a TaskAssociation object
 */
export function rowToTaskAssociation(row: TaskAssociationRow): TaskAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    taskId: row.task_id,
    detectionMethod: row.detection_method,
    confidenceScore: row.confidence_score,
    isConfirmed: row.is_confirmed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a TaskAssociation to database row format
 */
export function taskAssociationToRow(
  assoc: Omit<TaskAssociation, "id" | "createdAt" | "updatedAt">,
): Omit<TaskAssociationRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: assoc.userId,
    event_id: assoc.eventId,
    task_id: assoc.taskId,
    detection_method: assoc.detectionMethod,
    confidence_score: assoc.confidenceScore,
    is_confirmed: assoc.isConfirmed ? 1 : 0,
  };
}

/**
 * Convert a database row to a Worklog object
 */
export function rowToWorklog(row: WorklogRow): Worklog {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    date: row.date,
    totalSeconds: row.total_seconds,
    description: row.description ?? undefined,
    syncStatus: row.sync_status,
    externalWorklogId: row.external_worklog_id ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a Worklog to database row format
 */
export function worklogToRow(
  worklog: Omit<Worklog, "id" | "createdAt" | "updatedAt">,
): Omit<WorklogRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: worklog.userId,
    task_id: worklog.taskId,
    date: worklog.date,
    total_seconds: worklog.totalSeconds,
    description: worklog.description ?? null,
    sync_status: worklog.syncStatus,
    external_worklog_id: worklog.externalWorklogId ?? null,
    synced_at: worklog.syncedAt ?? null,
    error_message: worklog.errorMessage ?? null,
  };
}

/**
 * Convert a database row to a TaskDetectionRule object
 */
export function rowToTaskDetectionRule(
  row: TaskDetectionRuleRow,
): TaskDetectionRule {
  return {
    id: row.id,
    userId: row.user_id,
    ruleType: row.rule_type,
    pattern: row.pattern,
    taskId: row.task_id ?? undefined,
    projectKey: row.project_key ?? undefined,
    priority: row.priority,
    isEnabled: row.is_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a TaskDetectionRule to database row format
 */
export function taskDetectionRuleToRow(
  rule: Omit<TaskDetectionRule, "id" | "createdAt" | "updatedAt">,
): Omit<TaskDetectionRuleRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: rule.userId,
    rule_type: rule.ruleType,
    pattern: rule.pattern,
    task_id: rule.taskId ?? null,
    project_key: rule.projectKey ?? null,
    priority: rule.priority,
    is_enabled: rule.isEnabled ? 1 : 0,
  };
}

/**
 * Convert a database row to an IntegrationCredential object
 */
export function rowToIntegrationCredential(
  row: IntegrationCredentialRow,
): IntegrationCredential {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    authType: row.auth_type,
    encryptedCredentials: row.encrypted_credentials,
    baseUrl: row.base_url ?? undefined,
    isEnabled: row.is_enabled === 1,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert an IntegrationCredential to database row format
 */
export function integrationCredentialToRow(
  cred: Omit<IntegrationCredential, "id" | "createdAt" | "updatedAt">,
): Omit<IntegrationCredentialRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: cred.userId,
    provider: cred.provider,
    auth_type: cred.authType,
    encrypted_credentials: cred.encryptedCredentials,
    base_url: cred.baseUrl ?? null,
    is_enabled: cred.isEnabled ? 1 : 0,
    last_verified_at: cred.lastVerifiedAt ?? null,
  };
}

// ============================================================================
// Extended Types for UI/Queries
// ============================================================================

/**
 * External task with related worklog summary
 * Useful for task list displays
 */
export interface ExternalTaskWithWorklog extends ExternalTask {
  totalTrackedSeconds?: number;
  lastWorklogDate?: string;
  pendingWorklogCount?: number;
}

/**
 * Worklog with task details
 * Useful for worklog list displays
 */
export interface WorklogWithTask extends Worklog {
  task?: ExternalTask;
}

/**
 * Task association with both task and event details
 * Useful for reviewing associations
 */
export interface TaskAssociationWithDetails extends TaskAssociation {
  task?: ExternalTask;
  eventTitle?: string;
  eventTimestamp?: string;
}

/**
 * Summary of time tracked per task for a date range
 */
export interface TaskTimeSummary {
  taskId: number;
  externalId: string;
  title: string;
  projectKey?: string;
  provider: TaskProvider;
  totalSeconds: number;
  worklogCount: number;
  syncedCount: number;
  pendingCount: number;
}

/**
 * Integration status for a provider
 */
export interface IntegrationStatus {
  provider: TaskProvider;
  isConfigured: boolean;
  isEnabled: boolean;
  lastVerifiedAt?: string;
  lastSyncedAt?: string;
  taskCount: number;
  error?: string;
}
