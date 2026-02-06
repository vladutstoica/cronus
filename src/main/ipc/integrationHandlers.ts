/**
 * IPC handlers for external integrations (Jira, Linear)
 *
 * Exposes integration operations to the renderer process including:
 * - Credential management
 * - Task search and retrieval
 * - Worklog synchronization
 */

import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  hasCredentials,
  getIntegrationStatuses,
  createLinearIntegration,
  createJiraIntegration,
  type ApiTokenCredentials,
  type IntegrationTask,
  type IntegrationTeam,
  type WorklogSyncResult,
  type VerificationResult,
  type JiraProject,
} from "../services/integrations";
import type { TaskProvider, IntegrationAuthType } from "../../shared/taskTypes";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Input for saving integration credentials
 */
interface SaveCredentialsRequest {
  provider: TaskProvider;
  authType: IntegrationAuthType;
  apiToken: string;
  email?: string;
  baseUrl?: string;
}

/**
 * Input for task search
 */
interface SearchTasksRequest {
  provider: TaskProvider;
  query: string;
}

/**
 * Input for getting a single task
 */
interface GetTaskRequest {
  provider: TaskProvider;
  identifier: string;
}

/**
 * Input for adding a worklog
 */
interface AddWorklogRequest {
  provider: TaskProvider;
  issueId: string;
  timeSpentSeconds: number;
  description?: string;
  startedAt?: string;
}

/**
 * Integration status response
 */
interface IntegrationStatusResponse {
  provider: TaskProvider;
  isConfigured: boolean;
  isEnabled: boolean;
  lastVerifiedAt?: string;
}

// ============================================================================
// Integration Factory
// ============================================================================

/**
 * Common interface for integration services
 */
interface IntegrationServiceInterface {
  searchTasks: (query: string) => Promise<IntegrationTask[]>;
  getTask: (id: string) => Promise<IntegrationTask | null>;
  getAssignedTasks: () => Promise<IntegrationTask[]>;
  addWorklog: (input: {
    issueId: string;
    timeSpentSeconds: number;
    description?: string;
    startedAt?: string;
  }) => Promise<WorklogSyncResult>;
  verifyCredentials: () => Promise<VerificationResult>;
  isConfigured: () => Promise<boolean>;
}

/**
 * Extended interface for Linear with teams support
 */
interface LinearIntegrationInterface extends IntegrationServiceInterface {
  getTeams: () => Promise<IntegrationTeam[]>;
}

/**
 * Extended interface for Jira with projects support
 */
interface JiraIntegrationInterface extends IntegrationServiceInterface {
  getProjects: () => Promise<JiraProject[]>;
  searchByText: (text: string, projectKey?: string) => Promise<IntegrationTask[]>;
  getRecentTasks: () => Promise<IntegrationTask[]>;
  getSprintIssues: (projectKey?: string) => Promise<IntegrationTask[]>;
}

/**
 * Get the Linear integration service
 */
function getLinearIntegration(userId: string): LinearIntegrationInterface {
  return createLinearIntegration(userId);
}

/**
 * Get the Jira integration service
 */
function getJiraIntegration(userId: string): JiraIntegrationInterface {
  const jira = createJiraIntegration(userId);

  // Adapt the Jira integration to match the common interface
  return {
    searchTasks: (query: string) => jira.searchTasks(query),
    getTask: (id: string) => jira.getTask(id),
    getAssignedTasks: () => jira.getAssignedTasks(),
    addWorklog: async (input) => {
      const result = await jira.addWorklog({
        issueKey: input.issueId,
        timeSpentSeconds: input.timeSpentSeconds,
        description: input.description,
        startedAt: input.startedAt,
      });
      return result;
    },
    verifyCredentials: () => jira.verifyCredentials(),
    isConfigured: () => jira.isConfigured(),
    getProjects: () => jira.getProjects(),
    searchByText: (text: string, projectKey?: string) => jira.searchByText(text, projectKey),
    getRecentTasks: () => jira.getRecentTasks(),
    getSprintIssues: (projectKey?: string) => jira.getSprintIssues(projectKey),
  };
}

/**
 * Get the appropriate integration service for a provider
 */
function getIntegration(
  userId: string,
  provider: TaskProvider,
): IntegrationServiceInterface {
  switch (provider) {
    case "linear":
      return getLinearIntegration(userId);
    case "jira":
      return getJiraIntegration(userId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

export function registerIntegrationHandlers(): void {
  // --------------------------------------------------------------------------
  // Credential Management
  // --------------------------------------------------------------------------

  /**
   * Save integration credentials
   */
  ipcMain.handle(
    "integration:save-credentials",
    async (_event, request: SaveCredentialsRequest) => {
      const user = getOrCreateLocalUser();

      const credentials: ApiTokenCredentials = {
        apiToken: request.apiToken,
        email: request.email,
      };

      const saved = saveCredentials({
        userId: user.id,
        provider: request.provider,
        authType: request.authType,
        credentials,
        baseUrl: request.baseUrl,
      });

      // Verify the credentials immediately
      try {
        const integration = getIntegration(user.id, request.provider);
        const verification = await integration.verifyCredentials();

        return {
          success: true,
          credential: saved,
          verification,
        };
      } catch (error) {
        return {
          success: true,
          credential: saved,
          verification: {
            success: false,
            error: error instanceof Error ? error.message : "Verification failed",
          },
        };
      }
    },
  );

  /**
   * Get credentials for a provider (without decrypted data)
   */
  ipcMain.handle(
    "integration:get-credentials",
    (_event, provider: TaskProvider) => {
      const user = getOrCreateLocalUser();
      return getCredentials(user.id, provider);
    },
  );

  /**
   * Delete credentials for a provider
   */
  ipcMain.handle(
    "integration:delete-credentials",
    (_event, provider: TaskProvider) => {
      const user = getOrCreateLocalUser();
      return deleteCredentials(user.id, provider);
    },
  );

  /**
   * Check if credentials exist for a provider
   */
  ipcMain.handle(
    "integration:has-credentials",
    (_event, provider: TaskProvider) => {
      const user = getOrCreateLocalUser();
      return hasCredentials(user.id, provider);
    },
  );

  /**
   * Verify credentials for a provider
   */
  ipcMain.handle(
    "integration:verify-credentials",
    async (_event, provider: TaskProvider): Promise<VerificationResult> => {
      const user = getOrCreateLocalUser();

      if (!hasCredentials(user.id, provider)) {
        return { success: false, error: "No credentials configured" };
      }

      try {
        const integration = getIntegration(user.id, provider);
        return await integration.verifyCredentials();
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  /**
   * Get integration status for all providers
   */
  ipcMain.handle("integration:get-statuses", (): IntegrationStatusResponse[] => {
    const user = getOrCreateLocalUser();
    const statuses = getIntegrationStatuses(user.id);

    return Array.from(statuses.entries()).map(([provider, status]) => ({
      provider,
      ...status,
    }));
  });

  // --------------------------------------------------------------------------
  // Task Operations
  // --------------------------------------------------------------------------

  /**
   * Search for tasks
   */
  ipcMain.handle(
    "integration:search-tasks",
    async (_event, request: SearchTasksRequest): Promise<IntegrationTask[]> => {
      const user = getOrCreateLocalUser();
      const integration = getIntegration(user.id, request.provider);
      return integration.searchTasks(request.query);
    },
  );

  /**
   * Get a specific task by identifier
   */
  ipcMain.handle(
    "integration:get-task",
    async (_event, request: GetTaskRequest): Promise<IntegrationTask | null> => {
      const user = getOrCreateLocalUser();
      const integration = getIntegration(user.id, request.provider);
      return integration.getTask(request.identifier);
    },
  );

  /**
   * Get tasks assigned to the current user
   */
  ipcMain.handle(
    "integration:get-assigned-tasks",
    async (_event, provider: TaskProvider): Promise<IntegrationTask[]> => {
      const user = getOrCreateLocalUser();
      const integration = getIntegration(user.id, provider);
      return integration.getAssignedTasks();
    },
  );

  /**
   * Get teams from Linear
   */
  ipcMain.handle(
    "integration:get-teams",
    async (_event, provider: TaskProvider): Promise<IntegrationTeam[]> => {
      const user = getOrCreateLocalUser();

      if (provider !== "linear") {
        throw new Error("Teams are only available for Linear integration");
      }

      const integration = getLinearIntegration(user.id);
      return integration.getTeams();
    },
  );

  /**
   * Get projects from Jira
   */
  ipcMain.handle(
    "integration:get-projects",
    async (_event): Promise<JiraProject[]> => {
      const user = getOrCreateLocalUser();
      const integration = getJiraIntegration(user.id);
      return integration.getProjects();
    },
  );

  /**
   * Search tasks by text (Jira-specific)
   */
  ipcMain.handle(
    "integration:search-by-text",
    async (
      _event,
      request: { provider: TaskProvider; text: string; projectKey?: string },
    ): Promise<IntegrationTask[]> => {
      const user = getOrCreateLocalUser();

      if (request.provider !== "jira") {
        // For Linear, fall back to regular search
        const integration = getIntegration(user.id, request.provider);
        return integration.searchTasks(request.text);
      }

      const integration = getJiraIntegration(user.id);
      return integration.searchByText(request.text, request.projectKey);
    },
  );

  /**
   * Get recently viewed tasks (Jira-specific)
   */
  ipcMain.handle(
    "integration:get-recent-tasks",
    async (_event, provider: TaskProvider): Promise<IntegrationTask[]> => {
      const user = getOrCreateLocalUser();

      if (provider !== "jira") {
        // For Linear, fall back to assigned tasks
        const integration = getIntegration(user.id, provider);
        return integration.getAssignedTasks();
      }

      const integration = getJiraIntegration(user.id);
      return integration.getRecentTasks();
    },
  );

  /**
   * Get sprint issues (Jira-specific)
   */
  ipcMain.handle(
    "integration:get-sprint-issues",
    async (_event, projectKey?: string): Promise<IntegrationTask[]> => {
      const user = getOrCreateLocalUser();
      const integration = getJiraIntegration(user.id);
      return integration.getSprintIssues(projectKey);
    },
  );

  // --------------------------------------------------------------------------
  // Worklog Operations
  // --------------------------------------------------------------------------

  /**
   * Add a worklog to a task
   */
  ipcMain.handle(
    "integration:add-worklog",
    async (_event, request: AddWorklogRequest): Promise<WorklogSyncResult> => {
      const user = getOrCreateLocalUser();
      const integration = getIntegration(user.id, request.provider);

      return integration.addWorklog({
        issueId: request.issueId,
        timeSpentSeconds: request.timeSpentSeconds,
        description: request.description,
        startedAt: request.startedAt,
      });
    },
  );

  /**
   * Check if an integration is configured and ready to use
   */
  ipcMain.handle(
    "integration:is-configured",
    async (_event, provider: TaskProvider): Promise<boolean> => {
      const user = getOrCreateLocalUser();

      if (!hasCredentials(user.id, provider)) {
        return false;
      }

      try {
        const integration = getIntegration(user.id, provider);
        return integration.isConfigured();
      } catch {
        return false;
      }
    },
  );
}
