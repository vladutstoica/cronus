/**
 * Jira Integration Service
 *
 * Integrates with Jira Cloud REST API v3 for task search, sync, and worklog operations.
 * Supports API token authentication (email + token).
 */

import {
  getDecryptedCredentials,
  updateLastVerified,
  type ApiTokenCredentials,
  type VerificationResult,
} from "./integrationCredentials";
import type { TaskProvider } from "../../../shared/taskTypes";

// Import types from linearIntegration for consistency
import type {
  IntegrationTask as LinearIntegrationTask,
  IntegrationTeam,
  WorklogSyncResult,
  AddWorklogInput,
} from "./linearIntegration";

// Re-export for external use
export type { IntegrationTeam, WorklogSyncResult, AddWorklogInput };

// ============================================================================
// Types
// ============================================================================

/**
 * Jira-specific project information
 */
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Jira user information
 */
interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    "48x48"?: string;
    "32x32"?: string;
    "24x24"?: string;
    "16x16"?: string;
  };
  active: boolean;
}

/**
 * Jira issue type
 */
interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
}

/**
 * Jira priority
 */
interface JiraPriority {
  id: string;
  name: string;
}

/**
 * Jira status
 */
interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
  };
}

/**
 * Jira sprint
 */
interface JiraSprint {
  id: number;
  name: string;
  state: string;
}

/**
 * Jira issue fields
 */
interface JiraIssueFields {
  summary: string;
  description?: string | { content: unknown[] }; // Can be string or ADF
  status: JiraStatus;
  issuetype: JiraIssueType;
  priority?: JiraPriority;
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  project: {
    id: string;
    key: string;
    name: string;
    avatarUrls?: {
      "48x48"?: string;
    };
  };
  labels?: string[];
  created: string;
  updated: string;
  timeestimate?: number | null;
  timespent?: number | null;
  parent?: {
    key: string;
  };
  sprint?: JiraSprint[];
}

/**
 * Jira issue
 */
interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

/**
 * Jira search response
 */
interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

/**
 * Jira worklog
 */
interface JiraWorklog {
  id: string;
  issueId: string;
  self: string;
  author: JiraUser;
  timeSpentSeconds: number;
  comment?: string | { content: unknown[] };
  started: string;
  created: string;
  updated: string;
}

// ============================================================================
// Constants
// ============================================================================

const API_VERSION = "3";
const DEFAULT_MAX_RESULTS = 50;
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Fields to request when fetching issues
 */
const ISSUE_FIELDS = [
  "summary",
  "description",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "reporter",
  "project",
  "labels",
  "created",
  "updated",
  "timeestimate",
  "timespent",
  "parent",
  "sprint",
].join(",");

// Use the same IntegrationTask interface as Linear for consistency
export type IntegrationTask = LinearIntegrationTask;

// ============================================================================
// Jira Integration Class
// ============================================================================

/**
 * Jira integration service for task management
 */
export class JiraIntegration {
  private userId: string;
  private apiToken: string | null = null;
  private email: string | null = null;
  private baseUrl: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the integration by loading credentials
   */
  private async ensureAuthenticated(): Promise<boolean> {
    if (this.apiToken && this.email && this.baseUrl) {
      return true;
    }

    const result = getDecryptedCredentials(this.userId, "jira");
    if (!result) {
      return false;
    }

    const credentials = result.data as ApiTokenCredentials;
    this.apiToken = credentials.apiToken;
    this.email = credentials.email ?? null;
    this.baseUrl = result.credential.baseUrl ?? null;

    return !!(this.apiToken && this.email && this.baseUrl);
  }

  /**
   * Get the base API URL
   */
  private get apiBaseUrl(): string {
    const baseUrl = this.baseUrl?.replace(/\/+$/, "") ?? "";
    return `${baseUrl}/rest/api/${API_VERSION}`;
  }

  /**
   * Get authorization header for Basic Auth
   */
  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString("base64")}`;
  }

  /**
   * Make an authenticated request to the Jira API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    if (!this.apiToken || !this.email || !this.baseUrl) {
      throw new Error("Not authenticated with Jira");
    }

    const url = `${this.apiBaseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        // Extract error message from Jira response
        let message = `Jira API error: ${response.status}`;
        if (errorBody && typeof errorBody === "object") {
          const body = errorBody as Record<string, unknown>;
          if (typeof body.message === "string") {
            message = body.message;
          } else if (Array.isArray(body.errorMessages) && body.errorMessages.length > 0) {
            message = body.errorMessages.join(", ");
          }
        }

        throw new Error(message);
      }

      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw error;
      }

      throw new Error("Unknown error occurred");
    }
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  private extractTextFromAdf(adf: { content: unknown[] }): string {
    const extractText = (node: unknown): string => {
      if (!node || typeof node !== "object") {
        return "";
      }

      const n = node as Record<string, unknown>;

      if (n.type === "text" && typeof n.text === "string") {
        return n.text;
      }

      if (Array.isArray(n.content)) {
        return n.content.map(extractText).join("");
      }

      return "";
    };

    return adf.content.map(extractText).join("\n").trim();
  }

  /**
   * Convert Jira issue to unified IntegrationTask format
   */
  private issueToTask(issue: JiraIssue): IntegrationTask {
    const fields = issue.fields;

    // Extract description (handle ADF format)
    let description: string | undefined;
    if (fields.description) {
      if (typeof fields.description === "string") {
        description = fields.description;
      } else if (fields.description.content) {
        description = this.extractTextFromAdf(fields.description);
      }
    }

    return {
      id: issue.id,
      identifier: issue.key,
      title: fields.summary,
      description,
      status: fields.status.name,
      assignee: fields.assignee?.displayName,
      projectKey: fields.project.key,
      projectName: fields.project.name,
      url: `${this.baseUrl}/browse/${issue.key}`,
      labels: fields.labels ?? [],
      priority: fields.priority?.name,
      estimateSeconds: fields.timeestimate ?? undefined,
      provider: "jira",
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Verify credentials and get user info
   */
  async verifyCredentials(): Promise<VerificationResult> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      return { success: false, error: "No credentials configured" };
    }

    try {
      const user = await this.request<JiraUser>("/myself");

      // Update last verified timestamp
      updateLastVerified(this.userId, "jira");

      return {
        success: true,
        userInfo: {
          id: user.accountId,
          name: user.displayName,
          email: user.emailAddress ?? "",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Search for issues using JQL
   */
  async searchTasks(jql: string): Promise<IntegrationTask[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Jira");
    }

    const params = new URLSearchParams({
      jql,
      startAt: "0",
      maxResults: String(DEFAULT_MAX_RESULTS),
      fields: ISSUE_FIELDS,
    });

    const response = await this.request<JiraSearchResponse>(
      `/search?${params.toString()}`,
    );

    return response.issues.map((issue) => this.issueToTask(issue));
  }

  /**
   * Search issues by text in summary or description
   */
  async searchByText(text: string, projectKey?: string): Promise<IntegrationTask[]> {
    // Escape special JQL characters
    const escapedText = text.replace(/["\\]/g, "\\$&");

    let jql = `(summary ~ "${escapedText}" OR description ~ "${escapedText}")`;

    if (projectKey) {
      jql = `project = ${projectKey} AND ${jql}`;
    }

    jql += " ORDER BY updated DESC";

    return this.searchTasks(jql);
  }

  /**
   * Get a specific issue by key (e.g., "PROJ-123")
   */
  async getTask(issueKey: string): Promise<IntegrationTask | null> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Jira");
    }

    try {
      const params = new URLSearchParams({
        fields: ISSUE_FIELDS,
      });

      const issue = await this.request<JiraIssue>(
        `/issue/${issueKey}?${params.toString()}`,
      );

      return this.issueToTask(issue);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get issues assigned to the current user
   */
  async getAssignedTasks(): Promise<IntegrationTask[]> {
    const jql = "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC";
    return this.searchTasks(jql);
  }

  /**
   * Get recently viewed issues
   */
  async getRecentTasks(): Promise<IntegrationTask[]> {
    const jql = "issuekey IN issueHistory() ORDER BY lastViewed DESC";
    return this.searchTasks(jql);
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<JiraProject[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Jira");
    }

    const params = new URLSearchParams({
      orderBy: "name",
      maxResults: "100",
    });

    interface JiraProjectResponse {
      id: string;
      key: string;
      name: string;
      avatarUrls?: {
        "48x48"?: string;
      };
    }

    const projects = await this.request<JiraProjectResponse[]>(
      `/project/search?${params.toString()}`,
    );

    return projects.map((project) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      avatarUrl: project.avatarUrls?.["48x48"],
    }));
  }

  /**
   * Add a worklog to an issue
   */
  async addWorklog(input: {
    issueKey: string;
    timeSpentSeconds: number;
    description?: string;
    startedAt?: string;
  }): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      return { success: false, error: "Not authenticated with Jira" };
    }

    try {
      // Validate time spent (Jira requires at least 60 seconds)
      if (input.timeSpentSeconds < 60) {
        return { success: false, error: "Time spent must be at least 60 seconds" };
      }

      // Build the request body
      const body: Record<string, unknown> = {
        timeSpentSeconds: input.timeSpentSeconds,
        started: input.startedAt ?? new Date().toISOString().replace("Z", "+0000"),
      };

      // Add comment if provided (using ADF format)
      if (input.description) {
        body.comment = {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: input.description,
                },
              ],
            },
          ],
        };
      }

      const worklog = await this.request<JiraWorklog>(
        `/issue/${input.issueKey}/worklog`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      return {
        success: true,
        externalId: worklog.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get worklogs for an issue
   */
  async getWorklogs(issueKey: string): Promise<{
    id: string;
    timeSpentSeconds: number;
    description?: string;
    started: string;
    author?: string;
  }[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Jira");
    }

    const response = await this.request<{
      worklogs: JiraWorklog[];
      total: number;
    }>(`/issue/${issueKey}/worklog`);

    return response.worklogs.map((worklog) => {
      let description: string | undefined;
      if (worklog.comment) {
        if (typeof worklog.comment === "string") {
          description = worklog.comment;
        } else if (worklog.comment.content) {
          description = this.extractTextFromAdf(worklog.comment);
        }
      }

      return {
        id: worklog.id,
        timeSpentSeconds: worklog.timeSpentSeconds,
        description,
        started: worklog.started,
        author: worklog.author.displayName,
      };
    });
  }

  /**
   * Get issues for a specific project
   */
  async getProjectIssues(
    projectKey: string,
    options?: { status?: string },
  ): Promise<IntegrationTask[]> {
    let jql = `project = ${projectKey}`;

    if (options?.status) {
      jql += ` AND status = "${options.status}"`;
    }

    jql += " ORDER BY updated DESC";

    return this.searchTasks(jql);
  }

  /**
   * Get issues in the current sprint
   */
  async getSprintIssues(projectKey?: string): Promise<IntegrationTask[]> {
    let jql = "sprint in openSprints()";

    if (projectKey) {
      jql = `project = ${projectKey} AND ${jql}`;
    }

    jql += " ORDER BY rank ASC";

    return this.searchTasks(jql);
  }

  /**
   * Check if the integration is configured
   */
  async isConfigured(): Promise<boolean> {
    return this.ensureAuthenticated();
  }

  /**
   * Get the current user's account ID
   */
  async getCurrentUser(): Promise<{ accountId: string; displayName: string; email?: string }> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Jira");
    }

    const user = await this.request<JiraUser>("/myself");

    return {
      accountId: user.accountId,
      displayName: user.displayName,
      email: user.emailAddress,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Jira integration instance for a user
 */
export function createJiraIntegration(userId: string): JiraIntegration {
  return new JiraIntegration(userId);
}
