import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

/**
 * Linear Integration Service tests
 *
 * Tests cover:
 * - API authentication and verification
 * - Task search and retrieval
 * - Team listing
 * - Worklog creation (as comments)
 * - Error handling
 */

let db: Database.Database;

// Mock the database module
vi.mock("../../../database/index", () => ({
  getDatabase: () => db,
  initDatabase: () => db,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Electron's safeStorage
vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => false, // Use base64 fallback in tests
    encryptString: (str: string) => Buffer.from(str),
    decryptString: (buf: Buffer) => buf.toString(),
  },
}));

// Import after mocks are set up
import {
  LinearIntegration,
  createLinearIntegration,
  type IntegrationTask,
} from "../linearIntegration";
import { saveCredentials } from "../integrationCredentials";

function applyMigrations(database: Database.Database): void {
  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Integration credentials table
    CREATE TABLE IF NOT EXISTS integration_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('jira', 'linear')),
      auth_type TEXT NOT NULL CHECK (auth_type IN ('api_token', 'oauth')),
      encrypted_credentials TEXT NOT NULL,
      base_url TEXT,
      is_enabled INTEGER DEFAULT 1,
      last_verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, provider)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_integration_creds_user_id ON integration_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_integration_creds_provider ON integration_credentials(provider);
  `);
}

function createTestUser(id: string): void {
  db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
    id,
    `${id}@test.com`,
    "Test User",
  );
}

function setupCredentials(userId: string): void {
  saveCredentials({
    userId,
    provider: "linear",
    authType: "api_token",
    credentials: {
      apiToken: "lin_api_test_token_12345",
    },
  });
}

// Helper to create mock GraphQL responses
function mockGraphQLResponse<T>(data: T): Response {
  return {
    ok: true,
    json: () => Promise.resolve({ data }),
    text: () => Promise.resolve(JSON.stringify({ data })),
  } as Response;
}

function mockGraphQLError(message: string): Response {
  return {
    ok: true,
    json: () => Promise.resolve({ errors: [{ message }] }),
    text: () => Promise.resolve(JSON.stringify({ errors: [{ message }] })),
  } as Response;
}

function mockHttpError(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(statusText),
  } as Response;
}

describe("LinearIntegration", () => {
  const userId = "user-1";
  let integration: LinearIntegration;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    createTestUser(userId);
    setupCredentials(userId);
    integration = createLinearIntegration(userId);
    mockFetch.mockReset();
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe("Credential Verification", () => {
    it("should verify credentials successfully", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          viewer: {
            id: "user-uuid",
            name: "Test User",
            email: "test@example.com",
          },
        }),
      );

      const result = await integration.verifyCredentials();

      expect(result.success).toBe(true);
      expect(result.userInfo).toEqual({
        id: "user-uuid",
        name: "Test User",
        email: "test@example.com",
      });
    });

    it("should handle verification failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLError("Invalid API key"),
      );

      const result = await integration.verifyCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should handle network errors during verification", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await integration.verifyCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should return error when no credentials configured", async () => {
      // Create integration for user without credentials
      const unconfiguredIntegration = createLinearIntegration("user-no-creds");
      createTestUser("user-no-creds");

      const result = await unconfiguredIntegration.verifyCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No credentials configured");
    });
  });

  describe("Task Search", () => {
    it("should search tasks by query", async () => {
      const mockIssues = [
        {
          id: "issue-1",
          identifier: "VIB-50",
          title: "Fix bug in login",
          description: "Login button not working",
          url: "https://linear.app/team/issue/VIB-50",
          state: { id: "state-1", name: "In Progress" },
          assignee: { id: "user-1", name: "John Doe", email: "john@example.com" },
          labels: { nodes: [{ id: "label-1", name: "bug" }] },
          priority: 2,
          estimate: 3,
          team: { id: "team-1", name: "Vibes", key: "VIB" },
        },
        {
          id: "issue-2",
          identifier: "VIB-51",
          title: "Add new feature",
          description: null,
          url: "https://linear.app/team/issue/VIB-51",
          state: { id: "state-2", name: "Todo" },
          assignee: null,
          labels: { nodes: [] },
          priority: 3,
          estimate: null,
          team: { id: "team-1", name: "Vibes", key: "VIB" },
        },
      ];

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issueSearch: { nodes: mockIssues },
        }),
      );

      const tasks = await integration.searchTasks("VIB");

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({
        id: "issue-1",
        identifier: "VIB-50",
        title: "Fix bug in login",
        description: "Login button not working",
        status: "In Progress",
        assignee: "John Doe",
        projectKey: "VIB",
        projectName: "Vibes",
        url: "https://linear.app/team/issue/VIB-50",
        labels: ["bug"],
        priority: "High",
        estimateSeconds: 10800, // 3 hours
        provider: "linear",
      });
      expect(tasks[1].assignee).toBeUndefined();
      expect(tasks[1].labels).toEqual([]);
    });

    it("should handle empty search results", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issueSearch: { nodes: [] },
        }),
      );

      const tasks = await integration.searchTasks("nonexistent");

      expect(tasks).toEqual([]);
    });

    it("should handle search errors", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLError("Rate limit exceeded"),
      );

      await expect(integration.searchTasks("test")).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });

  describe("Get Task by Identifier", () => {
    it("should get task by identifier (e.g., VIB-50)", async () => {
      const mockIssue = {
        id: "issue-uuid",
        identifier: "VIB-50",
        title: "Test Issue",
        description: "Test description",
        url: "https://linear.app/team/issue/VIB-50",
        state: { id: "state-1", name: "Done" },
        assignee: { id: "user-1", name: "Jane Doe", email: "jane@example.com" },
        labels: { nodes: [{ id: "label-1", name: "feature" }] },
        priority: 1,
        estimate: 5,
        team: { id: "team-1", name: "Vibes", key: "VIB" },
      };

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issues: { nodes: [mockIssue] },
        }),
      );

      const task = await integration.getTask("VIB-50");

      expect(task).not.toBeNull();
      expect(task!.identifier).toBe("VIB-50");
      expect(task!.priority).toBe("Urgent");
    });

    it("should get task by UUID", async () => {
      const mockIssue = {
        id: "issue-uuid-123",
        identifier: "VIB-51",
        title: "UUID Test",
        url: "https://linear.app/team/issue/VIB-51",
        state: { id: "state-1", name: "In Progress" },
        team: { id: "team-1", name: "Vibes", key: "VIB" },
      };

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issue: mockIssue,
        }),
      );

      const task = await integration.getTask("issue-uuid-123");

      expect(task).not.toBeNull();
      expect(task!.id).toBe("issue-uuid-123");
    });

    it("should return null for non-existent task", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issues: { nodes: [] },
        }),
      );

      const task = await integration.getTask("VIB-9999");

      expect(task).toBeNull();
    });
  });

  describe("Get Assigned Tasks", () => {
    it("should get tasks assigned to current user", async () => {
      const mockIssues = [
        {
          id: "issue-1",
          identifier: "VIB-100",
          title: "My Task",
          url: "https://linear.app/team/issue/VIB-100",
          state: { id: "state-1", name: "In Progress" },
          assignee: { id: "me", name: "Current User", email: "me@example.com" },
          labels: { nodes: [] },
          team: { id: "team-1", name: "Vibes", key: "VIB" },
        },
      ];

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          viewer: { assignedIssues: { nodes: mockIssues } },
        }),
      );

      const tasks = await integration.getAssignedTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].identifier).toBe("VIB-100");
    });

    it("should handle no assigned tasks", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          viewer: { assignedIssues: { nodes: [] } },
        }),
      );

      const tasks = await integration.getAssignedTasks();

      expect(tasks).toEqual([]);
    });
  });

  describe("Get Teams", () => {
    it("should get all teams", async () => {
      const mockTeams = [
        { id: "team-1", name: "Vibes", key: "VIB" },
        { id: "team-2", name: "Platform", key: "PLT" },
      ];

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          teams: { nodes: mockTeams },
        }),
      );

      const teams = await integration.getTeams();

      expect(teams).toHaveLength(2);
      expect(teams[0]).toEqual({ id: "team-1", name: "Vibes", key: "VIB" });
      expect(teams[1]).toEqual({ id: "team-2", name: "Platform", key: "PLT" });
    });

    it("should handle empty teams list", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          teams: { nodes: [] },
        }),
      );

      const teams = await integration.getTeams();

      expect(teams).toEqual([]);
    });
  });

  describe("Add Worklog", () => {
    it("should add worklog as formatted comment", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: true,
            comment: { id: "comment-123" },
          },
        }),
      );

      const result = await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 5400, // 1h 30m
        description: "Worked on bug fix",
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("comment-123");

      // Verify the API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.linear.app/graphql");

      const body = JSON.parse(options.body);
      expect(body.variables.issueId).toBe("issue-uuid");
      expect(body.variables.body).toContain("Logged 1 hour 30 minutes");
      expect(body.variables.body).toContain("Worked on bug fix");
    });

    it("should format time correctly for hours only", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: true,
            comment: { id: "comment-124" },
          },
        }),
      );

      await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 7200, // 2 hours exactly
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.body).toContain("Logged 2 hours");
      expect(body.variables.body).not.toContain("minute");
    });

    it("should format time correctly for minutes only", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: true,
            comment: { id: "comment-125" },
          },
        }),
      );

      await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 1800, // 30 minutes
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.body).toContain("Logged 30 minutes");
      expect(body.variables.body).not.toContain("hour");
    });

    it("should handle singular hour/minute", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: true,
            comment: { id: "comment-126" },
          },
        }),
      );

      await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 3660, // 1 hour 1 minute
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.body).toContain("Logged 1 hour 1 minute");
    });

    it("should handle very short time", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: true,
            comment: { id: "comment-127" },
          },
        }),
      );

      await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 30, // 30 seconds
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.body).toContain("Logged less than 1 minute");
    });

    it("should handle worklog creation failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          commentCreate: {
            success: false,
            comment: null,
          },
        }),
      );

      const result = await integration.addWorklog({
        issueId: "issue-uuid",
        timeSpentSeconds: 3600,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create comment");
    });

    it("should handle API errors during worklog creation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLError("Issue not found"),
      );

      const result = await integration.addWorklog({
        issueId: "nonexistent-issue",
        timeSpentSeconds: 3600,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Issue not found");
    });
  });

  describe("Priority Conversion", () => {
    it.each([
      [0, "No priority"],
      [1, "Urgent"],
      [2, "High"],
      [3, "Medium"],
      [4, "Low"],
      [5, undefined], // Unknown priority
      [undefined, undefined],
    ])("should convert priority %s to %s", async (priority, expected) => {
      const mockIssue = {
        id: "issue-1",
        identifier: "VIB-1",
        title: "Test",
        url: "https://linear.app/issue/VIB-1",
        priority,
        team: { id: "team-1", name: "Vibes", key: "VIB" },
      };

      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issueSearch: { nodes: [mockIssue] },
        }),
      );

      const tasks = await integration.searchTasks("test");

      expect(tasks[0].priority).toBe(expected);
    });
  });

  describe("isConfigured", () => {
    it("should return true when credentials are configured", async () => {
      const isConfigured = await integration.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it("should return false when no credentials", async () => {
      const unconfiguredIntegration = createLinearIntegration("user-no-creds");
      createTestUser("user-no-creds");

      const isConfigured = await unconfiguredIntegration.isConfigured();
      expect(isConfigured).toBe(false);
    });
  });

  describe("HTTP Error Handling", () => {
    it("should handle HTTP 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce(
        mockHttpError(401, "Unauthorized"),
      );

      await expect(integration.searchTasks("test")).rejects.toThrow(
        "Linear API error: 401",
      );
    });

    it("should handle HTTP 500 Server Error", async () => {
      mockFetch.mockResolvedValueOnce(
        mockHttpError(500, "Internal Server Error"),
      );

      await expect(integration.searchTasks("test")).rejects.toThrow(
        "Linear API error: 500",
      );
    });
  });

  describe("Authorization Header", () => {
    it("should send API token in Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGraphQLResponse({
          issueSearch: { nodes: [] },
        }),
      );

      await integration.searchTasks("test");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("lin_api_test_token_12345");
    });
  });
});

describe("Integration Credentials", () => {
  const userId = "user-creds";

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS integration_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL CHECK (provider IN ('jira', 'linear')),
        auth_type TEXT NOT NULL CHECK (auth_type IN ('api_token', 'oauth')),
        encrypted_credentials TEXT NOT NULL,
        base_url TEXT,
        is_enabled INTEGER DEFAULT 1,
        last_verified_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, provider)
      );
    `);
    createTestUser(userId);
  });

  afterEach(() => {
    db.close();
  });

  it("should save and retrieve credentials", async () => {
    const { getCredentials } = await import("../integrationCredentials");

    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: {
        apiToken: "test_token_123",
      },
    });

    const cred = getCredentials(userId, "linear");

    expect(cred).not.toBeNull();
    expect(cred!.provider).toBe("linear");
    expect(cred!.authType).toBe("api_token");
    expect(cred!.isEnabled).toBe(true);
  });

  it("should upsert credentials on conflict", async () => {
    const { getCredentials, getDecryptedCredentials } = await import(
      "../integrationCredentials"
    );

    // Save initial credentials
    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: { apiToken: "token_v1" },
    });

    // Save updated credentials
    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: { apiToken: "token_v2" },
    });

    const cred = getCredentials(userId, "linear");
    expect(cred).not.toBeNull();

    const decrypted = getDecryptedCredentials(userId, "linear");
    expect(decrypted).not.toBeNull();
    expect((decrypted!.data as { apiToken: string }).apiToken).toBe("token_v2");
  });

  it("should delete credentials", async () => {
    const { deleteCredentials, getCredentials } = await import(
      "../integrationCredentials"
    );

    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: { apiToken: "test" },
    });

    const deleted = deleteCredentials(userId, "linear");
    expect(deleted).toBe(true);

    const cred = getCredentials(userId, "linear");
    expect(cred).toBeNull();
  });

  it("should check if credentials exist", async () => {
    const { hasCredentials } = await import("../integrationCredentials");

    expect(hasCredentials(userId, "linear")).toBe(false);

    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: { apiToken: "test" },
    });

    expect(hasCredentials(userId, "linear")).toBe(true);
  });

  it("should get integration statuses", async () => {
    const { getIntegrationStatuses } = await import(
      "../integrationCredentials"
    );

    // Initially no integrations configured
    let statuses = getIntegrationStatuses(userId);
    expect(statuses.get("linear")!.isConfigured).toBe(false);
    expect(statuses.get("jira")!.isConfigured).toBe(false);

    // Configure Linear
    saveCredentials({
      userId,
      provider: "linear",
      authType: "api_token",
      credentials: { apiToken: "test" },
    });

    statuses = getIntegrationStatuses(userId);
    expect(statuses.get("linear")!.isConfigured).toBe(true);
    expect(statuses.get("linear")!.isEnabled).toBe(true);
    expect(statuses.get("jira")!.isConfigured).toBe(false);
  });
});
