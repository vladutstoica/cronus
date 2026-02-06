/**
 * Linear Integration Service
 *
 * Integrates with Linear's GraphQL API for task search, sync, and time logging.
 * Linear uses GraphQL exclusively, so all operations use the GraphQL endpoint.
 */

import {
  getDecryptedCredentials,
  updateLastVerified,
  type ApiTokenCredentials,
  type VerificationResult,
} from "./integrationCredentials";
import type { TaskProvider } from "../../../shared/taskTypes";

// ============================================================================
// Types
// ============================================================================

/**
 * Unified task interface for integration tasks
 * Used to normalize data from different providers (Jira, Linear)
 */
export interface IntegrationTask {
  id: string;
  identifier: string; // e.g., "VIB-50" or "PROJ-123"
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
  projectKey?: string;
  projectName?: string;
  url?: string;
  labels: string[];
  priority?: string;
  estimateSeconds?: number;
  provider: TaskProvider;
}

/**
 * Team/Project information from Linear
 */
export interface IntegrationTeam {
  id: string;
  name: string;
  key: string;
}

/**
 * Result of a worklog sync operation
 */
export interface WorklogSyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Input for adding a worklog
 */
export interface AddWorklogInput {
  issueId: string;
  timeSpentSeconds: number;
  description?: string;
  startedAt?: string;
}

// ============================================================================
// GraphQL Response Types
// ============================================================================

interface LinearUser {
  id: string;
  name: string;
  email: string;
}

interface LinearState {
  id: string;
  name: string;
}

interface LinearLabel {
  id: string;
  name: string;
}

interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state?: LinearState;
  assignee?: LinearUser;
  labels?: { nodes: LinearLabel[] };
  priority?: number;
  estimate?: number;
  team?: LinearTeam;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const SEARCH_ISSUES_QUERY = `
  query SearchIssues($query: String!) {
    issueSearch(query: $query, first: 50) {
      nodes {
        id
        identifier
        title
        description
        url
        state { id name }
        assignee { id name email }
        labels { nodes { id name } }
        priority
        estimate
        team { id name key }
      }
    }
  }
`;

const GET_ISSUE_QUERY = `
  query GetIssue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      url
      state { id name }
      assignee { id name email }
      labels { nodes { id name } }
      priority
      estimate
      team { id name key }
    }
  }
`;

const GET_ISSUE_BY_IDENTIFIER_QUERY = `
  query GetIssueByIdentifier($filter: IssueFilter!) {
    issues(filter: $filter, first: 1) {
      nodes {
        id
        identifier
        title
        description
        url
        state { id name }
        assignee { id name email }
        labels { nodes { id name } }
        priority
        estimate
        team { id name key }
      }
    }
  }
`;

const ASSIGNED_ISSUES_QUERY = `
  query AssignedIssues {
    viewer {
      assignedIssues(first: 50, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
        nodes {
          id
          identifier
          title
          description
          url
          state { id name }
          assignee { id name email }
          labels { nodes { id name } }
          priority
          estimate
          team { id name key }
        }
      }
    }
  }
`;

const TEAMS_QUERY = `
  query Teams {
    teams {
      nodes {
        id
        name
        key
      }
    }
  }
`;

const VIEWER_QUERY = `
  query Viewer {
    viewer {
      id
      name
      email
    }
  }
`;

const CREATE_COMMENT_MUTATION = `
  mutation CreateComment($issueId: String!, $body: String!) {
    commentCreate(input: { issueId: $issueId, body: $body }) {
      success
      comment {
        id
      }
    }
  }
`;

// ============================================================================
// Linear Integration Class
// ============================================================================

/**
 * Linear integration service for task management
 */
export class LinearIntegration {
  private readonly apiUrl = "https://api.linear.app/graphql";
  private userId: string;
  private apiToken: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the integration by loading credentials
   */
  private async ensureAuthenticated(): Promise<boolean> {
    if (this.apiToken) {
      return true;
    }

    const result = getDecryptedCredentials(this.userId, "linear");
    if (!result) {
      return false;
    }

    const credentials = result.data as ApiTokenCredentials;
    this.apiToken = credentials.apiToken;
    return true;
  }

  /**
   * Execute a GraphQL query/mutation against Linear's API
   */
  private async executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    if (!this.apiToken) {
      throw new Error("Not authenticated with Linear");
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Linear API error: ${response.status} ${text}`);
    }

    return (await response.json()) as GraphQLResponse<T>;
  }

  /**
   * Convert Linear priority number to string
   */
  private priorityToString(priority?: number): string | undefined {
    if (priority === undefined || priority === null) return undefined;

    switch (priority) {
      case 0:
        return "No priority";
      case 1:
        return "Urgent";
      case 2:
        return "High";
      case 3:
        return "Medium";
      case 4:
        return "Low";
      default:
        return undefined;
    }
  }

  /**
   * Convert Linear issue to unified IntegrationTask format
   */
  private issueToTask(issue: LinearIssue): IntegrationTask {
    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: issue.state?.name,
      assignee: issue.assignee?.name,
      projectKey: issue.team?.key,
      projectName: issue.team?.name,
      url: issue.url,
      labels: issue.labels?.nodes.map((l) => l.name) ?? [],
      priority: this.priorityToString(issue.priority),
      // Linear estimates are in story points, not seconds - we'll convert or leave as-is
      estimateSeconds: issue.estimate
        ? issue.estimate * 3600
        : undefined, // Assume 1 point = 1 hour
      provider: "linear",
    };
  }

  /**
   * Verify credentials and get user info
   */
  async verifyCredentials(): Promise<VerificationResult> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      return { success: false, error: "No credentials configured" };
    }

    try {
      const response = await this.executeGraphQL<{ viewer: LinearUser }>(
        VIEWER_QUERY,
      );

      if (response.errors && response.errors.length > 0) {
        return {
          success: false,
          error: response.errors[0].message,
        };
      }

      if (!response.data?.viewer) {
        return { success: false, error: "Failed to get user info" };
      }

      // Update last verified timestamp
      updateLastVerified(this.userId, "linear");

      return {
        success: true,
        userInfo: {
          id: response.data.viewer.id,
          name: response.data.viewer.name,
          email: response.data.viewer.email,
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
   * Search for issues by text query
   */
  async searchTasks(query: string): Promise<IntegrationTask[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Linear");
    }

    const response = await this.executeGraphQL<{
      issueSearch: { nodes: LinearIssue[] };
    }>(SEARCH_ISSUES_QUERY, { query });

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    const issues = response.data?.issueSearch?.nodes ?? [];
    return issues.map((issue) => this.issueToTask(issue));
  }

  /**
   * Get a specific issue by ID or identifier (e.g., "VIB-50")
   */
  async getTask(identifier: string): Promise<IntegrationTask | null> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Linear");
    }

    // Check if this looks like an identifier (e.g., "VIB-50") or a UUID
    const isIdentifier = /^[A-Z]+-\d+$/i.test(identifier);

    if (isIdentifier) {
      // Parse the identifier to get team key and issue number
      const [teamKey, numberStr] = identifier.split("-");
      const number = parseInt(numberStr, 10);

      const response = await this.executeGraphQL<{
        issues: { nodes: LinearIssue[] };
      }>(GET_ISSUE_BY_IDENTIFIER_QUERY, {
        filter: {
          team: { key: { eq: teamKey.toUpperCase() } },
          number: { eq: number },
        },
      });

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }

      const issue = response.data?.issues?.nodes?.[0];
      return issue ? this.issueToTask(issue) : null;
    } else {
      // Treat as UUID
      const response = await this.executeGraphQL<{ issue: LinearIssue }>(
        GET_ISSUE_QUERY,
        { id: identifier },
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }

      const issue = response.data?.issue;
      return issue ? this.issueToTask(issue) : null;
    }
  }

  /**
   * Get issues assigned to the current user
   */
  async getAssignedTasks(): Promise<IntegrationTask[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Linear");
    }

    const response = await this.executeGraphQL<{
      viewer: { assignedIssues: { nodes: LinearIssue[] } };
    }>(ASSIGNED_ISSUES_QUERY);

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    const issues = response.data?.viewer?.assignedIssues?.nodes ?? [];
    return issues.map((issue) => this.issueToTask(issue));
  }

  /**
   * Get all teams (Linear's equivalent of projects)
   */
  async getTeams(): Promise<IntegrationTeam[]> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Linear");
    }

    const response = await this.executeGraphQL<{
      teams: { nodes: LinearTeam[] };
    }>(TEAMS_QUERY);

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    return (
      response.data?.teams?.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
      })) ?? []
    );
  }

  /**
   * Add a worklog by creating a comment with formatted time
   * Linear doesn't have native time tracking, so we add a formatted comment
   */
  async addWorklog(input: AddWorklogInput): Promise<WorklogSyncResult> {
    const authenticated = await this.ensureAuthenticated();
    if (!authenticated) {
      return { success: false, error: "Not authenticated with Linear" };
    }

    try {
      // Format time as hours and minutes
      const hours = Math.floor(input.timeSpentSeconds / 3600);
      const minutes = Math.floor((input.timeSpentSeconds % 3600) / 60);

      let timeStr = "";
      if (hours > 0) {
        timeStr += `${hours} hour${hours !== 1 ? "s" : ""}`;
      }
      if (minutes > 0) {
        if (timeStr) timeStr += " ";
        timeStr += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
      if (!timeStr) {
        timeStr = "less than 1 minute";
      }

      // Build the comment body
      let body = `Logged ${timeStr}`;
      if (input.description) {
        body += `\n\n${input.description}`;
      }

      const response = await this.executeGraphQL<{
        commentCreate: { success: boolean; comment?: { id: string } };
      }>(CREATE_COMMENT_MUTATION, {
        issueId: input.issueId,
        body,
      });

      if (response.errors && response.errors.length > 0) {
        return { success: false, error: response.errors[0].message };
      }

      if (!response.data?.commentCreate?.success) {
        return { success: false, error: "Failed to create comment" };
      }

      return {
        success: true,
        externalId: response.data.commentCreate.comment?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if the integration is configured
   */
  async isConfigured(): Promise<boolean> {
    return this.ensureAuthenticated();
  }
}

/**
 * Create a Linear integration instance for a user
 */
export function createLinearIntegration(userId: string): LinearIntegration {
  return new LinearIntegration(userId);
}
