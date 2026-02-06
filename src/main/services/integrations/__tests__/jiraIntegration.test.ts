import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";

/**
 * JiraIntegration tests
 * Tests for the Jira Cloud API integration service
 */

let db: Database.Database;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the database module (use correct relative path from test file location)
vi.mock("../../../database", () => ({
  getDatabase: () => db,
  initDatabase: () => db,
}));

// Import after mocks are set up
import { JiraIntegration, createJiraIntegration } from "../jiraIntegration";
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
    provider: "jira",
    authType: "api_token",
    credentials: {
      apiToken: "test-api-token",
      email: "test@example.com",
    },
    baseUrl: "https://test.atlassian.net",
  });
}

// Helper to create mock Jira API responses
function createMockJiraIssue(key: string, summary: string) {
  return {
    id: "10001",
    key,
    self: `https://test.atlassian.net/rest/api/3/issue/${key}`,
    fields: {
      summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Test description" }],
          },
        ],
      },
      status: {
        id: "1",
        name: "To Do",
        statusCategory: {
          id: 2,
          key: "new",
          name: "To Do",
        },
      },
      issuetype: {
        id: "10001",
        name: "Story",
        subtask: false,
      },
      priority: {
        id: "3",
        name: "Medium",
      },
      assignee: {
        accountId: "user-123",
        displayName: "John Doe",
        emailAddress: "john@example.com",
      },
      reporter: {
        accountId: "user-456",
        displayName: "Jane Smith",
        emailAddress: "jane@example.com",
      },
      project: {
        id: "10000",
        key: "TEST",
        name: "Test Project",
      },
      labels: ["backend", "urgent"],
      created: "2024-01-15T09:00:00.000Z",
      updated: "2024-01-15T10:00:00.000Z",
      timeestimate: 14400, // 4 hours
      timespent: 3600, // 1 hour
    },
  };
}

describe("JiraIntegration", () => {
  const userId = "user-1";

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    createTestUser(userId);
    mockFetch.mockReset();
  });

  afterEach(() => {
    db.close();
  });

  describe("Factory Function", () => {
    it("should create a JiraIntegration instance", () => {
      const integration = createJiraIntegration(userId);
      expect(integration).toBeInstanceOf(JiraIntegration);
    });
  });

  describe("Authentication", () => {
    it("should return false for isConfigured when no credentials", async () => {
      const integration = createJiraIntegration(userId);
      const configured = await integration.isConfigured();
      expect(configured).toBe(false);
    });

    it("should return true for isConfigured when credentials exist", async () => {
      setupCredentials(userId);
      const integration = createJiraIntegration(userId);
      const configured = await integration.isConfigured();
      expect(configured).toBe(true);
    });
  });

  describe("Verify Credentials", () => {
    it("should return error when no credentials configured", async () => {
      const integration = createJiraIntegration(userId);
      const result = await integration.verifyCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No credentials configured");
    });

    it("should verify credentials successfully", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accountId: "user-123",
          displayName: "John Doe",
          emailAddress: "john@example.com",
        }),
      });

      const integration = createJiraIntegration(userId);
      const result = await integration.verifyCredentials();

      expect(result.success).toBe(true);
      expect(result.userInfo).toEqual({
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
      });
    });

    it("should handle verification failure", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: "Invalid credentials",
        }),
      });

      const integration = createJiraIntegration(userId);
      const result = await integration.verifyCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });
  });

  describe("Search Tasks", () => {
    it("should throw error when not authenticated", async () => {
      const integration = createJiraIntegration(userId);

      await expect(
        integration.searchTasks("project = TEST"),
      ).rejects.toThrow("Not authenticated with Jira");
    });

    it("should search tasks by JQL", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 2,
          issues: [
            createMockJiraIssue("TEST-1", "First task"),
            createMockJiraIssue("TEST-2", "Second task"),
          ],
        }),
      });

      const integration = createJiraIntegration(userId);
      const tasks = await integration.searchTasks("project = TEST");

      expect(tasks).toHaveLength(2);
      expect(tasks[0].identifier).toBe("TEST-1");
      expect(tasks[0].title).toBe("First task");
      expect(tasks[0].provider).toBe("jira");
      expect(tasks[0].projectKey).toBe("TEST");
      expect(tasks[0].labels).toEqual(["backend", "urgent"]);
    });

    it("should include correct query parameters in request", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 0,
          issues: [],
        }),
      });

      const integration = createJiraIntegration(userId);
      await integration.searchTasks("project = TEST ORDER BY created DESC");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/rest/api/3/search");
      expect(url).toContain("jql=");
      expect(url).toContain("maxResults=50");
      expect(url).toContain("fields=");
    });
  });

  describe("Search By Text", () => {
    it("should search by text in summary and description", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [createMockJiraIssue("TEST-1", "Login bug")],
        }),
      });

      const integration = createJiraIntegration(userId);
      const tasks = await integration.searchByText("login");

      expect(tasks).toHaveLength(1);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("summary");
      expect(url).toContain("description");
      expect(url).toContain("login");
    });

    it("should filter by project when specified", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 0,
          issues: [],
        }),
      });

      const integration = createJiraIntegration(userId);
      await integration.searchByText("bug", "MYPROJ");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("project%20%3D%20MYPROJ");
    });
  });

  describe("Get Task", () => {
    it("should get a single task by key", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockJiraIssue("TEST-123", "Test issue"),
      });

      const integration = createJiraIntegration(userId);
      const task = await integration.getTask("TEST-123");

      expect(task).not.toBeNull();
      expect(task?.identifier).toBe("TEST-123");
      expect(task?.title).toBe("Test issue");
      expect(task?.status).toBe("To Do");
      expect(task?.assignee).toBe("John Doe");
    });

    it("should return null for non-existent task", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          errorMessages: ["Issue does not exist"],
        }),
      });

      const integration = createJiraIntegration(userId);
      const task = await integration.getTask("TEST-999");

      expect(task).toBeNull();
    });
  });

  describe("Get Assigned Tasks", () => {
    it("should get tasks assigned to current user", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [createMockJiraIssue("TEST-1", "My assigned task")],
        }),
      });

      const integration = createJiraIntegration(userId);
      const tasks = await integration.getAssignedTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("My assigned task");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("assignee%20%3D%20currentUser()");
    });
  });

  describe("Get Projects", () => {
    it("should get all projects", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "10000",
            key: "TEST",
            name: "Test Project",
            avatarUrls: {
              "48x48": "https://example.com/avatar.png",
            },
          },
          {
            id: "10001",
            key: "DEMO",
            name: "Demo Project",
          },
        ],
      });

      const integration = createJiraIntegration(userId);
      const projects = await integration.getProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0].key).toBe("TEST");
      expect(projects[0].name).toBe("Test Project");
      expect(projects[0].avatarUrl).toBe("https://example.com/avatar.png");
      expect(projects[1].key).toBe("DEMO");
    });
  });

  describe("Add Worklog", () => {
    it("should return error when not authenticated", async () => {
      const integration = createJiraIntegration(userId);
      const result = await integration.addWorklog({
        issueKey: "TEST-1",
        timeSpentSeconds: 3600,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated with Jira");
    });

    it("should add worklog successfully", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "worklog-123",
          issueId: "10001",
          self: "https://test.atlassian.net/rest/api/3/issue/TEST-1/worklog/worklog-123",
          author: {
            accountId: "user-123",
            displayName: "John Doe",
          },
          timeSpentSeconds: 3600,
          started: "2024-01-15T09:00:00.000+0000",
          created: "2024-01-15T10:00:00.000+0000",
          updated: "2024-01-15T10:00:00.000+0000",
        }),
      });

      const integration = createJiraIntegration(userId);
      const result = await integration.addWorklog({
        issueKey: "TEST-1",
        timeSpentSeconds: 3600,
        description: "Worked on feature",
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe("worklog-123");

      // Verify request body
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.timeSpentSeconds).toBe(3600);
      expect(body.comment).toBeDefined();
    });

    it("should reject worklog with time less than 60 seconds", async () => {
      setupCredentials(userId);

      const integration = createJiraIntegration(userId);
      const result = await integration.addWorklog({
        issueKey: "TEST-1",
        timeSpentSeconds: 30,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Time spent must be at least 60 seconds");
    });

    it("should handle worklog creation failure", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errorMessages: ["Time tracking is not enabled for this issue"],
        }),
      });

      const integration = createJiraIntegration(userId);
      const result = await integration.addWorklog({
        issueKey: "TEST-1",
        timeSpentSeconds: 3600,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Time tracking is not enabled");
    });
  });

  describe("Get Worklogs", () => {
    it("should get worklogs for an issue", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          worklogs: [
            {
              id: "worklog-1",
              issueId: "10001",
              author: {
                accountId: "user-123",
                displayName: "John Doe",
              },
              timeSpentSeconds: 3600,
              comment: "First worklog",
              started: "2024-01-15T09:00:00.000+0000",
              created: "2024-01-15T10:00:00.000+0000",
              updated: "2024-01-15T10:00:00.000+0000",
            },
            {
              id: "worklog-2",
              issueId: "10001",
              author: {
                accountId: "user-456",
                displayName: "Jane Smith",
              },
              timeSpentSeconds: 1800,
              comment: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "ADF comment" }],
                  },
                ],
              },
              started: "2024-01-15T14:00:00.000+0000",
              created: "2024-01-15T15:00:00.000+0000",
              updated: "2024-01-15T15:00:00.000+0000",
            },
          ],
          total: 2,
        }),
      });

      const integration = createJiraIntegration(userId);
      const worklogs = await integration.getWorklogs("TEST-1");

      expect(worklogs).toHaveLength(2);
      expect(worklogs[0].id).toBe("worklog-1");
      expect(worklogs[0].timeSpentSeconds).toBe(3600);
      expect(worklogs[0].description).toBe("First worklog");
      expect(worklogs[0].author).toBe("John Doe");
      expect(worklogs[1].description).toBe("ADF comment");
    });
  });

  describe("Get Sprint Issues", () => {
    it("should get issues in open sprints", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [createMockJiraIssue("TEST-1", "Sprint task")],
        }),
      });

      const integration = createJiraIntegration(userId);
      const tasks = await integration.getSprintIssues();

      expect(tasks).toHaveLength(1);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("sprint%20in%20openSprints()");
    });

    it("should filter by project when specified", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          startAt: 0,
          maxResults: 50,
          total: 0,
          issues: [],
        }),
      });

      const integration = createJiraIntegration(userId);
      await integration.getSprintIssues("MYPROJ");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("project%20%3D%20MYPROJ");
      expect(url).toContain("sprint%20in%20openSprints()");
    });
  });

  describe("Get Current User", () => {
    it("should get current user info", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accountId: "user-123",
          displayName: "John Doe",
          emailAddress: "john@example.com",
        }),
      });

      const integration = createJiraIntegration(userId);
      const user = await integration.getCurrentUser();

      expect(user.accountId).toBe("user-123");
      expect(user.displayName).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      setupCredentials(userId);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const integration = createJiraIntegration(userId);

      await expect(
        integration.searchTasks("project = TEST"),
      ).rejects.toThrow("Network error");
    });

    it("should handle timeout", async () => {
      setupCredentials(userId);

      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const integration = createJiraIntegration(userId);

      await expect(
        integration.searchTasks("project = TEST"),
      ).rejects.toThrow("Request timed out");
    });

    it("should extract error message from Jira error response", async () => {
      setupCredentials(userId);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errorMessages: ["JQL query is invalid", "Another error"],
        }),
      });

      const integration = createJiraIntegration(userId);

      await expect(
        integration.searchTasks("invalid jql"),
      ).rejects.toThrow("JQL query is invalid, Another error");
    });
  });

  describe("ADF Description Extraction", () => {
    it("should extract text from ADF description", async () => {
      setupCredentials(userId);

      const issueWithAdfDescription = {
        ...createMockJiraIssue("TEST-1", "Test"),
        fields: {
          ...createMockJiraIssue("TEST-1", "Test").fields,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "First paragraph. " },
                  { type: "text", text: "More text." },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Second paragraph." }],
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issueWithAdfDescription,
      });

      const integration = createJiraIntegration(userId);
      const task = await integration.getTask("TEST-1");

      expect(task?.description).toBe(
        "First paragraph. More text.\nSecond paragraph.",
      );
    });

    it("should handle plain text description", async () => {
      setupCredentials(userId);

      const issueWithTextDescription = {
        ...createMockJiraIssue("TEST-1", "Test"),
        fields: {
          ...createMockJiraIssue("TEST-1", "Test").fields,
          description: "Plain text description",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issueWithTextDescription,
      });

      const integration = createJiraIntegration(userId);
      const task = await integration.getTask("TEST-1");

      expect(task?.description).toBe("Plain text description");
    });

    it("should handle null description", async () => {
      setupCredentials(userId);

      const issueWithNullDescription = {
        ...createMockJiraIssue("TEST-1", "Test"),
        fields: {
          ...createMockJiraIssue("TEST-1", "Test").fields,
          description: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issueWithNullDescription,
      });

      const integration = createJiraIntegration(userId);
      const task = await integration.getTask("TEST-1");

      expect(task?.description).toBeUndefined();
    });
  });
});
