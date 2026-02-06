import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TaskDetectionEngine,
  getTaskDetectionEngine,
  resetTaskDetectionEngine,
  extractTaskId,
  extractAllTaskIds,
} from "../taskDetectionEngine";
import type {
  ActivityForTaskDetection,
  TaskDetectionRule,
  TaskDetectionRuleType,
} from "../types";
import {
  AUTO_ASSOCIATE_THRESHOLD,
  SUGGEST_THRESHOLD,
  DEFAULT_CONFIDENCE,
  NATIVE_APP_CONFIDENCE_BOOST,
  GIT_CACHE_TTL_MS,
} from "../types";

// Mock child_process execSync
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "child_process";
const mockExecSync = vi.mocked(execSync);

/**
 * Helper to create an activity for testing
 */
function createActivity(
  overrides: Partial<ActivityForTaskDetection> = {},
): ActivityForTaskDetection {
  return {
    appName: "Chrome",
    url: null,
    title: "Test Window",
    ...overrides,
  };
}

/**
 * Helper to create a custom rule for testing
 */
function createCustomRule(
  overrides: Partial<TaskDetectionRule> = {},
): TaskDetectionRule {
  return {
    id: 1,
    userId: "user-1",
    ruleType: "window_title_pattern" as TaskDetectionRuleType,
    pattern: ".*",
    priority: 0,
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("TaskDetectionEngine", () => {
  let engine: TaskDetectionEngine;

  beforeEach(() => {
    resetTaskDetectionEngine();
    engine = new TaskDetectionEngine();
    mockExecSync.mockReset();
  });

  afterEach(() => {
    resetTaskDetectionEngine();
  });

  // ==========================================================================
  // Singleton Pattern
  // ==========================================================================

  describe("Singleton", () => {
    it("should return the same instance from getTaskDetectionEngine", () => {
      const instance1 = getTaskDetectionEngine();
      const instance2 = getTaskDetectionEngine();
      expect(instance1).toBe(instance2);
    });

    it("should create a new instance after reset", () => {
      const instance1 = getTaskDetectionEngine();
      resetTaskDetectionEngine();
      const instance2 = getTaskDetectionEngine();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // Task ID Extraction
  // ==========================================================================

  describe("extractTaskId", () => {
    it("should extract task ID from simple format", () => {
      const result = extractTaskId("VIB-123");
      expect(result).toEqual({ taskId: "VIB-123", projectKey: "VIB" });
    });

    it("should extract task ID with text around it", () => {
      const result = extractTaskId("Working on VIB-456 feature");
      expect(result).toEqual({ taskId: "VIB-456", projectKey: "VIB" });
    });

    it("should handle Jira-style project keys", () => {
      const result = extractTaskId("PROJ-789");
      expect(result).toEqual({ taskId: "PROJ-789", projectKey: "PROJ" });
    });

    it("should handle longer project keys", () => {
      const result = extractTaskId("MYPROJECT-123");
      expect(result).toEqual({
        taskId: "MYPROJECT-123",
        projectKey: "MYPROJECT",
      });
    });

    it("should normalize to uppercase", () => {
      const result = extractTaskId("vib-123");
      expect(result).toEqual({ taskId: "VIB-123", projectKey: "VIB" });
    });

    it("should return null for no match", () => {
      const result = extractTaskId("no task here");
      expect(result).toBeNull();
    });

    it("should return null for partial matches", () => {
      const result = extractTaskId("A-123"); // Single letter project key
      expect(result).toBeNull();
    });

    it("should handle task ID at end of string", () => {
      const result = extractTaskId("Fix bug VIB-999");
      expect(result).toEqual({ taskId: "VIB-999", projectKey: "VIB" });
    });
  });

  describe("extractAllTaskIds", () => {
    it("should extract multiple task IDs", () => {
      const result = extractAllTaskIds("VIB-123 depends on PROJ-456");
      expect(result).toEqual([
        { taskId: "VIB-123", projectKey: "VIB" },
        { taskId: "PROJ-456", projectKey: "PROJ" },
      ]);
    });

    it("should return empty array for no matches", () => {
      const result = extractAllTaskIds("no tasks here");
      expect(result).toEqual([]);
    });

    it("should handle duplicate task IDs", () => {
      const result = extractAllTaskIds("VIB-123 and VIB-123 again");
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Active Session Detection
  // ==========================================================================

  describe("Active Session Detection", () => {
    it("should detect task from active session with 100% confidence", () => {
      engine.setActiveSession("VIB-123", 1, "linear");

      const result = engine.detectTask(createActivity());

      expect(result.taskId).toBe("VIB-123");
      expect(result.confidence).toBe(DEFAULT_CONFIDENCE.active_session);
      expect(result.method).toBe("active_session");
      expect(result.shouldAutoAssociate).toBe(true);
    });

    it("should clear active session", () => {
      engine.setActiveSession("VIB-123");
      expect(engine.hasActiveSession()).toBe(true);

      engine.clearActiveSession();
      expect(engine.hasActiveSession()).toBe(false);
    });

    it("should get active session details", () => {
      engine.setActiveSession("VIB-123", 5, "jira");

      const session = engine.getActiveSession();

      expect(session).not.toBeNull();
      expect(session?.taskId).toBe("VIB-123");
      expect(session?.externalTaskId).toBe(5);
      expect(session?.provider).toBe("jira");
      expect(session?.startedAt).toBeLessThanOrEqual(Date.now());
    });

    it("should prioritize active session over other detection methods", () => {
      engine.setActiveSession("VIB-100");
      mockExecSync.mockReturnValue("feature/VIB-200-something\n");

      const result = engine.detectTask(
        createActivity({
          url: "https://linear.app/team/issue/VIB-300",
          title: "VIB-400 - Some Task",
        }),
      );

      // Active session should win
      expect(result.taskId).toBe("VIB-100");
      expect(result.method).toBe("active_session");
      // But all results should be present
      expect(result.allResults.length).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Git Branch Detection
  // ==========================================================================

  describe("Git Branch Detection", () => {
    it("should detect task from feature branch", () => {
      mockExecSync.mockReturnValue("feature/VIB-123-add-feature\n");

      const result = engine.detectFromGitBranch();

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("VIB-123");
      expect(result?.projectKey).toBe("VIB");
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE.git_branch);
      expect(result?.method).toBe("git_branch");
    });

    it("should detect task from fix branch", () => {
      mockExecSync.mockReturnValue("fix/PROJ-456-bugfix\n");

      const result = engine.detectFromGitBranch();

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("PROJ-456");
    });

    it("should detect task from user prefixed branch", () => {
      mockExecSync.mockReturnValue("vladstoica/vib-789-something\n");

      const result = engine.detectFromGitBranch();

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("VIB-789");
    });

    it("should detect task from simple branch name", () => {
      mockExecSync.mockReturnValue("VIB-999-description\n");

      const result = engine.detectFromGitBranch();

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("VIB-999");
    });

    it("should return null for branch without task ID", () => {
      mockExecSync.mockReturnValue("main\n");

      const result = engine.detectFromGitBranch();

      expect(result).toBeNull();
    });

    it("should return null for detached HEAD", () => {
      mockExecSync.mockReturnValue("HEAD\n");

      const result = engine.detectFromGitBranch();

      expect(result).toBeNull();
    });

    it("should return null when not in git repo", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Not a git repository");
      });

      const result = engine.detectFromGitBranch();

      expect(result).toBeNull();
    });

    describe("Git Branch Caching", () => {
      it("should cache git branch result", () => {
        mockExecSync.mockReturnValue("feature/VIB-123-test\n");

        // First call
        engine.detectFromGitBranch();
        // Second call - should use cache
        engine.detectFromGitBranch();

        expect(mockExecSync).toHaveBeenCalledTimes(1);
      });

      it("should use cache hit stats", () => {
        mockExecSync.mockReturnValue("feature/VIB-123-test\n");

        engine.detectFromGitBranch();
        engine.detectFromGitBranch();

        const stats = engine.getStats();
        expect(stats.gitCacheHits).toBe(1);
        expect(stats.gitCacheMisses).toBe(1);
      });

      it("should refresh cache when forceRefresh is true", () => {
        mockExecSync.mockReturnValue("feature/VIB-123-test\n");

        engine.detectFromGitBranch();
        engine.detectFromGitBranch({ forceRefresh: true });

        expect(mockExecSync).toHaveBeenCalledTimes(2);
      });

      it("should invalidate cache for different cwd", () => {
        mockExecSync.mockReturnValue("feature/VIB-123-test\n");

        engine.detectFromGitBranch({ cwd: "/path/one" });
        engine.detectFromGitBranch({ cwd: "/path/two" });

        expect(mockExecSync).toHaveBeenCalledTimes(2);
      });

      it("should clear cache on clearGitCache", () => {
        mockExecSync.mockReturnValue("feature/VIB-123-test\n");

        engine.detectFromGitBranch();
        engine.clearGitCache();
        engine.detectFromGitBranch();

        expect(mockExecSync).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // URL Pattern Detection
  // ==========================================================================

  describe("URL Pattern Detection", () => {
    it("should detect Linear issue URL", () => {
      const result = engine.detectFromUrl(
        "https://linear.app/company/issue/VIB-50",
      );

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("VIB-50");
      expect(result?.provider).toBe("linear");
      expect(result?.projectKey).toBe("VIB");
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE.url_pattern);
    });

    it("should detect Linear URL without team", () => {
      const result = engine.detectFromUrl("https://linear.app/issue/ENG-123");

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("ENG-123");
      expect(result?.provider).toBe("linear");
    });

    it("should detect Jira Cloud URL", () => {
      const result = engine.detectFromUrl(
        "https://mycompany.atlassian.net/browse/PROJ-123",
      );

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("PROJ-123");
      expect(result?.provider).toBe("jira");
      expect(result?.projectKey).toBe("PROJ");
    });

    it("should detect Jira Server URL", () => {
      const result = engine.detectFromUrl(
        "https://jira.company.com/browse/TASK-456",
      );

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("TASK-456");
      expect(result?.provider).toBe("jira");
    });

    it("should return null for non-matching URLs", () => {
      const result = engine.detectFromUrl("https://github.com/user/repo");

      expect(result).toBeNull();
    });

    it("should return null for malformed URLs", () => {
      const result = engine.detectFromUrl("not-a-url");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Window Title Detection
  // ==========================================================================

  describe("Window Title Detection", () => {
    it("should detect task ID in window title", () => {
      const result = engine.detectFromWindowTitle(
        "VIB-123 - Add new feature",
        "Chrome",
      );

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("VIB-123");
      expect(result?.method).toBe("window_title");
    });

    it("should have higher confidence for Linear native app", () => {
      const result = engine.detectFromWindowTitle("VIB-123 - Task", "Linear");

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(
        DEFAULT_CONFIDENCE.window_title + NATIVE_APP_CONFIDENCE_BOOST,
      );
      expect(result?.provider).toBe("linear");
    });

    it("should have higher confidence for Jira native app", () => {
      const result = engine.detectFromWindowTitle("PROJ-456 - Bug Fix", "Jira");

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(
        DEFAULT_CONFIDENCE.window_title + NATIVE_APP_CONFIDENCE_BOOST,
      );
      expect(result?.provider).toBe("jira");
    });

    it("should detect task ID at end of title", () => {
      const result = engine.detectFromWindowTitle(
        "Working on feature PROJ-789",
        "VS Code",
      );

      expect(result).not.toBeNull();
      expect(result?.taskId).toBe("PROJ-789");
    });

    it("should return null for title without task ID", () => {
      const result = engine.detectFromWindowTitle("No task here", "Chrome");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Custom Rules Detection
  // ==========================================================================

  describe("Custom Rules Detection", () => {
    it("should detect from custom window title rule", () => {
      const rule = createCustomRule({
        ruleType: "window_title_pattern",
        pattern: ".*VIB-\\d+.*",
        priority: 10,
      });

      engine.loadCustomRules("user-1", [rule]);

      const result = engine.detectTask(
        createActivity({ title: "Working on VIB-123" }),
      );

      expect(result.taskId).toBe("VIB-123");
    });

    it("should detect from custom URL rule", () => {
      const rule = createCustomRule({
        ruleType: "url_pattern",
        pattern: ".*internal\\.company\\.com.*",
        priority: 10,
      });

      engine.loadCustomRules("user-1", [rule]);

      const result = engine.detectTask(
        createActivity({
          url: "https://internal.company.com/tasks/PROJ-456",
          title: "Internal Tool",
        }),
      );

      expect(result.taskId).toBe("PROJ-456");
    });

    it("should respect rule priority", () => {
      const rules = [
        createCustomRule({
          id: 1,
          ruleType: "window_title_pattern",
          pattern: ".*",
          priority: 1,
        }),
        createCustomRule({
          id: 2,
          ruleType: "window_title_pattern",
          pattern: ".*",
          priority: 10,
        }),
      ];

      engine.loadCustomRules("user-1", rules);

      // Higher priority rule should be evaluated first
      expect(engine.getCustomRules()[0]).toBeDefined();
    });

    it("should skip disabled rules", () => {
      const rule = createCustomRule({
        ruleType: "window_title_pattern",
        pattern: ".*VIB-\\d+.*",
        isEnabled: false,
      });

      engine.loadCustomRules("user-1", [rule]);

      expect(engine.getCustomRules()).toHaveLength(0);
    });

    it("should handle invalid regex gracefully", () => {
      const rule = createCustomRule({
        ruleType: "window_title_pattern",
        pattern: "[invalid(regex",
        priority: 10,
      });

      engine.loadCustomRules("user-1", [rule]);

      // Should not throw
      const result = engine.detectTask(createActivity({ title: "VIB-123" }));

      // Should still detect via other methods
      expect(result.taskId).toBe("VIB-123");
    });
  });

  // ==========================================================================
  // Combined Detection
  // ==========================================================================

  describe("Combined Detection", () => {
    it("should collect results from all strategies", () => {
      mockExecSync.mockReturnValue("feature/VIB-100-test\n");

      const result = engine.detectTask(
        createActivity({
          url: "https://linear.app/team/issue/VIB-200",
          title: "VIB-300 - Task Title",
        }),
      );

      // Should have results from git, URL, and title
      expect(result.allResults.length).toBeGreaterThanOrEqual(3);
    });

    it("should select highest confidence result", () => {
      // URL pattern has 95% confidence, same as git
      // Active session has 100% confidence
      engine.setActiveSession("VIB-999");
      mockExecSync.mockReturnValue("feature/VIB-100-test\n");

      const result = engine.detectTask(
        createActivity({
          url: "https://linear.app/team/issue/VIB-200",
        }),
      );

      // Active session should win
      expect(result.taskId).toBe("VIB-999");
      expect(result.confidence).toBe(1.0);
    });

    it("should set shouldAutoAssociate for high confidence", () => {
      mockExecSync.mockReturnValue("feature/VIB-123-test\n");

      const result = engine.detectTask(createActivity());

      expect(result.confidence).toBeGreaterThanOrEqual(
        AUTO_ASSOCIATE_THRESHOLD,
      );
      expect(result.shouldAutoAssociate).toBe(true);
      expect(result.shouldSuggest).toBe(false);
    });

    it("should set shouldSuggest for medium confidence", () => {
      // Window title without native app has 70% confidence
      mockExecSync.mockImplementation(() => {
        throw new Error("Not a git repo");
      });

      const result = engine.detectTask(
        createActivity({
          appName: "Chrome",
          title: "VIB-123 in Chrome",
        }),
      );

      expect(result.confidence).toBeGreaterThanOrEqual(SUGGEST_THRESHOLD);
      expect(result.confidence).toBeLessThan(AUTO_ASSOCIATE_THRESHOLD);
      expect(result.shouldAutoAssociate).toBe(false);
      expect(result.shouldSuggest).toBe(true);
    });

    it("should return null result when no task detected", () => {
      mockExecSync.mockReturnValue("main\n");

      const result = engine.detectTask(
        createActivity({
          appName: "Chrome",
          url: "https://google.com",
          title: "Google",
        }),
      );

      expect(result.taskId).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.shouldAutoAssociate).toBe(false);
      expect(result.shouldSuggest).toBe(false);
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe("Statistics", () => {
    it("should track total detections", () => {
      mockExecSync.mockReturnValue("main\n");

      engine.detectTask(createActivity());
      engine.detectTask(createActivity());
      engine.detectTask(createActivity());

      const stats = engine.getStats();
      expect(stats.totalDetections).toBe(3);
    });

    it("should track detections by method", () => {
      engine.setActiveSession("VIB-123");

      engine.detectTask(createActivity());

      const stats = engine.getStats();
      expect(stats.detectionsByMethod.active_session).toBe(1);
    });

    it("should track auto associations", () => {
      engine.setActiveSession("VIB-123");

      engine.detectTask(createActivity());

      const stats = engine.getStats();
      expect(stats.autoAssociations).toBe(1);
    });

    it("should reset statistics", () => {
      engine.detectTask(createActivity());
      engine.resetStats();

      const stats = engine.getStats();
      expect(stats.totalDetections).toBe(0);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe("Reset", () => {
    it("should reset all state", () => {
      engine.setActiveSession("VIB-123");
      mockExecSync.mockReturnValue("feature/VIB-100\n");
      engine.detectFromGitBranch();
      engine.loadCustomRules("user-1", [createCustomRule()]);

      engine.reset();

      expect(engine.hasActiveSession()).toBe(false);
      expect(engine.getCustomRules()).toHaveLength(0);
      expect(engine.getStats().totalDetections).toBe(0);
    });
  });
});
