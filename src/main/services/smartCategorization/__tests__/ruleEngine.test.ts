import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RuleEngine,
  getRuleEngine,
  resetRuleEngine,
} from "../ruleEngine";
import type {
  ActivityForMatching,
  CategorizationRule,
  RuleCondition,
} from "../types";

// Mock the database module
vi.mock("../../../database/index", () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      run: vi.fn(),
    })),
  })),
}));

/**
 * Helper to inject rules into the engine for testing
 * This avoids TypeScript errors with direct private property access
 */
function setEngineRules(engine: RuleEngine, rules: CategorizationRule[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (engine as unknown as { rules: CategorizationRule[] }).rules = rules;
}

/**
 * Helper to create a rule for testing
 */
function createTestRule(
  overrides: Partial<CategorizationRule> = {}
): CategorizationRule {
  return {
    id: 1,
    userId: "user-1",
    name: "Test Rule",
    description: "A test rule",
    categoryId: "category-1",
    conditions: [],
    conditionLogic: "AND",
    priority: 0,
    confidence: 1.0,
    isEnabled: true,
    isSystem: false,
    source: "user",
    matchCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create a condition
 */
function createCondition(
  overrides: Partial<RuleCondition> = {}
): RuleCondition {
  return {
    field: "app_name",
    operator: "equals",
    value: "Chrome",
    caseSensitive: false,
    ...overrides,
  };
}

/**
 * Helper to create an activity for matching
 */
function createActivity(
  overrides: Partial<ActivityForMatching> = {}
): ActivityForMatching {
  return {
    appName: "Chrome",
    url: null,
    title: "Test Window",
    content: null,
    browserType: null,
    ...overrides,
  };
}

describe("RuleEngine", () => {
  let engine: RuleEngine;

  beforeEach(() => {
    resetRuleEngine();
    engine = new RuleEngine();
  });

  afterEach(() => {
    resetRuleEngine();
  });

  describe("constructor and initialization", () => {
    it("should create an instance with empty rules", () => {
      expect(engine.getRules()).toHaveLength(0);
    });

    it("should have zero evaluations initially", () => {
      const stats = engine.getStats();
      expect(stats.totalEvaluations).toBe(0);
      expect(stats.rulesLoaded).toBe(0);
    });
  });

  describe("evaluateCondition", () => {
    describe("equals operator", () => {
      it("should match when values are equal (case insensitive)", () => {
        const condition = createCondition({
          field: "app_name",
          operator: "equals",
          value: "chrome",
          caseSensitive: false,
        });
        const activity = createActivity({ appName: "Chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when values differ (case insensitive)", () => {
        const condition = createCondition({
          field: "app_name",
          operator: "equals",
          value: "Firefox",
          caseSensitive: false,
        });
        const activity = createActivity({ appName: "Chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });

      it("should respect case sensitivity when enabled", () => {
        const condition = createCondition({
          field: "app_name",
          operator: "equals",
          value: "chrome",
          caseSensitive: true,
        });
        const activity = createActivity({ appName: "Chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("not_equals operator", () => {
      it("should match when values are different", () => {
        const condition = createCondition({
          field: "app_name",
          operator: "not_equals",
          value: "Firefox",
        });
        const activity = createActivity({ appName: "Chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when values are equal", () => {
        const condition = createCondition({
          field: "app_name",
          operator: "not_equals",
          value: "chrome",
        });
        const activity = createActivity({ appName: "Chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });

      it("should match when field value is null", () => {
        const condition = createCondition({
          field: "url",
          operator: "not_equals",
          value: "https://example.com",
        });
        const activity = createActivity({ url: null });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });
    });

    describe("contains operator", () => {
      it("should match when value contains pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "contains",
          value: "GitHub",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when value does not contain pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "contains",
          value: "Jira",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("not_contains operator", () => {
      it("should match when value does not contain pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "not_contains",
          value: "Jira",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when value contains pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "not_contains",
          value: "GitHub",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("starts_with operator", () => {
      it("should match when value starts with pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "starts_with",
          value: "Pull Request",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when value does not start with pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "starts_with",
          value: "GitHub",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("ends_with operator", () => {
      it("should match when value ends with pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "ends_with",
          value: "GitHub",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when value does not end with pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "ends_with",
          value: "Jira",
        });
        const activity = createActivity({
          title: "Pull Request #42 - GitHub",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("matches_regex operator", () => {
      it("should match when value matches regex pattern", () => {
        const condition = createCondition({
          field: "title",
          operator: "matches_regex",
          value: "PR #\\d+",
        });
        const activity = createActivity({ title: "PR #42 - Fix bug" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should not match when value does not match regex", () => {
        const condition = createCondition({
          field: "title",
          operator: "matches_regex",
          value: "JIRA-\\d+",
        });
        const activity = createActivity({ title: "PR #42 - Fix bug" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });

      it("should handle invalid regex gracefully", () => {
        const condition = createCondition({
          field: "title",
          operator: "matches_regex",
          value: "[invalid",
        });
        const activity = createActivity({ title: "Some title" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });

      it("should respect case sensitivity for regex", () => {
        const condition = createCondition({
          field: "title",
          operator: "matches_regex",
          value: "^PR",
          caseSensitive: true,
        });
        const activity = createActivity({ title: "pr #42" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
      });
    });

    describe("domain field extraction", () => {
      it("should extract domain from URL", () => {
        const condition = createCondition({
          field: "domain",
          operator: "equals",
          value: "github.com",
        });
        const activity = createActivity({
          url: "https://github.com/user/repo",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should handle subdomain matching", () => {
        const condition = createCondition({
          field: "domain",
          operator: "contains",
          value: "github",
        });
        const activity = createActivity({
          url: "https://api.github.com/repos",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should return null for invalid URL", () => {
        const condition = createCondition({
          field: "domain",
          operator: "equals",
          value: "example.com",
        });
        const activity = createActivity({ url: "not-a-valid-url" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(false);
        expect(result.testedValue).toBeNull();
      });
    });

    describe("url_path field extraction", () => {
      it("should extract path from URL", () => {
        const condition = createCondition({
          field: "url_path",
          operator: "contains",
          value: "/pull/",
        });
        const activity = createActivity({
          url: "https://github.com/user/repo/pull/42",
        });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should match root path", () => {
        const condition = createCondition({
          field: "url_path",
          operator: "equals",
          value: "/",
        });
        const activity = createActivity({ url: "https://example.com/" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });
    });

    describe("browser field", () => {
      it("should match browser type", () => {
        const condition = createCondition({
          field: "browser",
          operator: "equals",
          value: "chrome",
        });
        const activity = createActivity({ browserType: "chrome" });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });

      it("should handle null browser type with negation", () => {
        const condition = createCondition({
          field: "browser",
          operator: "not_equals",
          value: "firefox",
        });
        const activity = createActivity({ browserType: null });

        const result = engine.evaluateCondition(condition, activity);
        expect(result.matched).toBe(true);
      });
    });
  });

  describe("evaluate (full rule evaluation)", () => {
    describe("AND logic", () => {
      it("should match when all conditions are true", () => {
        const rule = createTestRule({
          conditionLogic: "AND",
          conditions: [
            createCondition({
              field: "app_name",
              operator: "equals",
              value: "Chrome",
            }),
            createCondition({
              field: "domain",
              operator: "equals",
              value: "github.com",
            }),
          ],
        });

        // Inject rule directly for testing
        setEngineRules(engine, [rule]);

        const activity = createActivity({
          appName: "Chrome",
          url: "https://github.com/user/repo",
        });

        const matches = engine.evaluate(activity);
        expect(matches).toHaveLength(1);
        expect(matches[0].rule.id).toBe(rule.id);
      });

      it("should not match when any condition is false", () => {
        const rule = createTestRule({
          conditionLogic: "AND",
          conditions: [
            createCondition({
              field: "app_name",
              operator: "equals",
              value: "Chrome",
            }),
            createCondition({
              field: "domain",
              operator: "equals",
              value: "gitlab.com",
            }),
          ],
        });

        setEngineRules(engine, [rule]);

        const activity = createActivity({
          appName: "Chrome",
          url: "https://github.com/user/repo",
        });

        const matches = engine.evaluate(activity);
        expect(matches).toHaveLength(0);
      });
    });

    describe("OR logic", () => {
      it("should match when any condition is true", () => {
        const rule = createTestRule({
          conditionLogic: "OR",
          conditions: [
            createCondition({
              field: "app_name",
              operator: "equals",
              value: "Firefox",
            }),
            createCondition({
              field: "domain",
              operator: "equals",
              value: "github.com",
            }),
          ],
        });

        setEngineRules(engine, [rule]);

        const activity = createActivity({
          appName: "Chrome",
          url: "https://github.com/user/repo",
        });

        const matches = engine.evaluate(activity);
        expect(matches).toHaveLength(1);
      });

      it("should not match when all conditions are false", () => {
        const rule = createTestRule({
          conditionLogic: "OR",
          conditions: [
            createCondition({
              field: "app_name",
              operator: "equals",
              value: "Firefox",
            }),
            createCondition({
              field: "domain",
              operator: "equals",
              value: "gitlab.com",
            }),
          ],
        });

        setEngineRules(engine, [rule]);

        const activity = createActivity({
          appName: "Chrome",
          url: "https://github.com/user/repo",
        });

        const matches = engine.evaluate(activity);
        expect(matches).toHaveLength(0);
      });
    });

    describe("rule filtering", () => {
      // Helper to create a condition that always matches Chrome
      const chromeCondition = createCondition({
        field: "app_name",
        operator: "equals",
        value: "Chrome",
      });

      it("should skip disabled rules by default", () => {
        const enabledRule = createTestRule({
          id: 1,
          isEnabled: true,
          conditions: [chromeCondition],
        });
        const disabledRule = createTestRule({
          id: 2,
          isEnabled: false,
          conditions: [chromeCondition],
        });

        setEngineRules(engine, [
          enabledRule,
          disabledRule,
        ]);
        

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity);

        expect(matches).toHaveLength(1);
        expect(matches[0].rule.id).toBe(1);
      });

      it("should include disabled rules when option is set", () => {
        const enabledRule = createTestRule({
          id: 1,
          isEnabled: true,
          conditions: [chromeCondition],
        });
        const disabledRule = createTestRule({
          id: 2,
          isEnabled: false,
          conditions: [chromeCondition],
        });

        setEngineRules(engine, [
          enabledRule,
          disabledRule,
        ]);
        

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity, { includeDisabled: true });

        expect(matches).toHaveLength(2);
      });

      it("should filter by minimum confidence", () => {
        const highConfRule = createTestRule({
          id: 1,
          confidence: 0.9,
          conditions: [chromeCondition],
        });
        const lowConfRule = createTestRule({
          id: 2,
          confidence: 0.3,
          conditions: [chromeCondition],
        });

        setEngineRules(engine, [highConfRule, lowConfRule]);

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity, { minConfidence: 0.5 });

        expect(matches).toHaveLength(1);
        expect(matches[0].rule.id).toBe(1);
      });

      it("should limit results when maxResults is set", () => {
        const rules = [
          createTestRule({
            id: 1,
            priority: 100,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 2,
            priority: 50,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 3,
            priority: 25,
            conditions: [chromeCondition],
          }),
        ];

        setEngineRules(engine, rules);

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity, { maxResults: 2 });

        expect(matches).toHaveLength(2);
      });
    });

    describe("sorting", () => {
      // Helper to create a condition that always matches Chrome
      const chromeCondition = createCondition({
        field: "app_name",
        operator: "equals",
        value: "Chrome",
      });

      it("should sort by score (highest first)", () => {
        const rules = [
          createTestRule({
            id: 1,
            confidence: 0.5,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 2,
            confidence: 0.9,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 3,
            confidence: 0.7,
            conditions: [chromeCondition],
          }),
        ];

        setEngineRules(engine, rules);

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity);

        expect(matches[0].rule.id).toBe(2);
        expect(matches[1].rule.id).toBe(3);
        expect(matches[2].rule.id).toBe(1);
      });

      it("should use priority as tiebreaker", () => {
        const rules = [
          createTestRule({
            id: 1,
            confidence: 0.8,
            priority: 10,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 2,
            confidence: 0.8,
            priority: 50,
            conditions: [chromeCondition],
          }),
          createTestRule({
            id: 3,
            confidence: 0.8,
            priority: 30,
            conditions: [chromeCondition],
          }),
        ];

        setEngineRules(engine, rules);

        const activity = createActivity({ appName: "Chrome" });
        const matches = engine.evaluate(activity);

        expect(matches[0].rule.id).toBe(2);
        expect(matches[1].rule.id).toBe(3);
        expect(matches[2].rule.id).toBe(1);
      });
    });
  });

  describe("calculateScore", () => {
    it("should return base confidence for simple match", () => {
      const rule = createTestRule({ confidence: 0.8 });
      const evalResult = {
        matched: true,
        conditionResults: [],
        matchedConditionCount: 1,
        totalConditionCount: 1,
      };

      const score = engine.calculateScore(rule, evalResult);
      expect(score).toBeCloseTo(0.8, 1);
    });

    it("should boost score for OR logic with multiple matches", () => {
      const rule = createTestRule({
        confidence: 0.8,
        conditionLogic: "OR",
      });
      const evalResult = {
        matched: true,
        conditionResults: [],
        matchedConditionCount: 3,
        totalConditionCount: 4,
      };

      const score = engine.calculateScore(rule, evalResult);
      expect(score).toBeGreaterThan(0.8);
    });

    it("should boost score based on priority", () => {
      const lowPriorityRule = createTestRule({
        confidence: 0.8,
        priority: 10,
      });
      const highPriorityRule = createTestRule({
        confidence: 0.8,
        priority: 90,
      });
      const evalResult = {
        matched: true,
        conditionResults: [],
        matchedConditionCount: 1,
        totalConditionCount: 1,
      };

      const lowScore = engine.calculateScore(lowPriorityRule, evalResult);
      const highScore = engine.calculateScore(highPriorityRule, evalResult);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("should boost score for system rules with high match count", () => {
      const newRule = createTestRule({
        confidence: 0.8,
        isSystem: true,
        matchCount: 0,
      });
      const popularRule = createTestRule({
        confidence: 0.8,
        isSystem: true,
        matchCount: 1000,
      });
      const evalResult = {
        matched: true,
        conditionResults: [],
        matchedConditionCount: 1,
        totalConditionCount: 1,
      };

      const newScore = engine.calculateScore(newRule, evalResult);
      const popularScore = engine.calculateScore(popularRule, evalResult);

      expect(popularScore).toBeGreaterThan(newScore);
    });
  });

  describe("findBestMatch", () => {
    // Helper to create a condition that always matches Chrome
    const chromeCondition = createCondition({
      field: "app_name",
      operator: "equals",
      value: "Chrome",
    });

    it("should return the highest scoring match", () => {
      const rules = [
        createTestRule({
          id: 1,
          confidence: 0.5,
          conditions: [chromeCondition],
        }),
        createTestRule({
          id: 2,
          confidence: 0.9,
          conditions: [chromeCondition],
        }),
        createTestRule({
          id: 3,
          confidence: 0.7,
          conditions: [chromeCondition],
        }),
      ];

      setEngineRules(engine, rules);

      const activity = createActivity({ appName: "Chrome" });
      const match = engine.findBestMatch(activity);

      expect(match).not.toBeNull();
      expect(match!.rule.id).toBe(2);
    });

    it("should return null when no rules match", () => {
      const rule = createTestRule({
        conditions: [
          createCondition({
            field: "app_name",
            operator: "equals",
            value: "Firefox",
          }),
        ],
      });

      setEngineRules(engine, [rule]);

      const activity = createActivity({ appName: "Chrome" });
      const match = engine.findBestMatch(activity);

      expect(match).toBeNull();
    });
  });

  describe("hasMatch", () => {
    it("should return true when any rule matches", () => {
      const rule = createTestRule({
        conditions: [
          createCondition({
            field: "app_name",
            operator: "equals",
            value: "Chrome",
          }),
        ],
      });

      setEngineRules(engine, [rule]);

      const activity = createActivity({ appName: "Chrome" });
      expect(engine.hasMatch(activity)).toBe(true);
    });

    it("should return false when no rules match", () => {
      const rule = createTestRule({
        conditions: [
          createCondition({
            field: "app_name",
            operator: "equals",
            value: "Firefox",
          }),
        ],
      });

      setEngineRules(engine, [rule]);

      const activity = createActivity({ appName: "Chrome" });
      expect(engine.hasMatch(activity)).toBe(false);
    });
  });

  describe("regex caching", () => {
    it("should cache compiled regex patterns", () => {
      const condition = createCondition({
        field: "title",
        operator: "matches_regex",
        value: "\\d+",
      });

      const activity = createActivity({ title: "Test 123" });

      // First evaluation
      engine.evaluateCondition(condition, activity);
      const stats1 = engine.getStats();
      expect(stats1.regexCacheHitRate).toBe(0);

      // Second evaluation with same regex
      engine.evaluateCondition(condition, activity);
      const stats2 = engine.getStats();
      expect(stats2.regexCacheHitRate).toBeGreaterThan(0);
    });

    it("should clear regex cache", () => {
      const condition = createCondition({
        field: "title",
        operator: "matches_regex",
        value: "\\d+",
      });

      const activity = createActivity({ title: "Test 123" });
      engine.evaluateCondition(condition, activity);

      expect(engine.getStats().cachedRegexPatterns).toBe(1);

      engine.clearRegexCache();
      expect(engine.getStats().cachedRegexPatterns).toBe(0);
    });
  });

  describe("statistics", () => {
    it("should track total evaluations", () => {
      const rule = createTestRule();
      setEngineRules(engine, [rule]);

      expect(engine.getStats().totalEvaluations).toBe(0);

      engine.evaluate(createActivity());
      expect(engine.getStats().totalEvaluations).toBe(1);

      engine.evaluate(createActivity());
      expect(engine.getStats().totalEvaluations).toBe(2);
    });

    it("should reset statistics", () => {
      const rule = createTestRule();
      setEngineRules(engine, [rule]);

      engine.evaluate(createActivity());
      expect(engine.getStats().totalEvaluations).toBe(1);

      engine.resetStats();
      expect(engine.getStats().totalEvaluations).toBe(0);
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const engine1 = getRuleEngine();
      const engine2 = getRuleEngine();

      expect(engine1).toBe(engine2);
    });

    it("should create new instance after reset", () => {
      const engine1 = getRuleEngine();
      resetRuleEngine();
      const engine2 = getRuleEngine();

      expect(engine1).not.toBe(engine2);
    });
  });

  describe("getRuleById", () => {
    it("should return rule when found", () => {
      const rule = createTestRule({ id: 42 });
      setEngineRules(engine, [rule]);

      const found = engine.getRuleById(42);
      expect(found).toBe(rule);
    });

    it("should return undefined when not found", () => {
      const rule = createTestRule({ id: 42 });
      setEngineRules(engine, [rule]);

      const found = engine.getRuleById(999);
      expect(found).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle rule with no conditions", () => {
      const rule = createTestRule({ conditions: [] });
      setEngineRules(engine, [rule]);

      const activity = createActivity();
      const matches = engine.evaluate(activity);

      // Rule with no conditions should not match
      expect(matches).toHaveLength(0);
    });

    it("should handle activity with all null fields", () => {
      const rule = createTestRule({
        conditions: [
          createCondition({
            field: "url",
            operator: "not_equals",
            value: "https://example.com",
          }),
        ],
      });
      setEngineRules(engine, [rule]);

      const activity: ActivityForMatching = {
        appName: "",
        url: null,
        title: "",
        content: null,
        browserType: null,
      };

      const matches = engine.evaluate(activity);
      // Should match because null not_equals any value
      expect(matches).toHaveLength(1);
    });

    it("should handle empty string values", () => {
      const condition = createCondition({
        field: "title",
        operator: "contains",
        value: "",
      });
      const activity = createActivity({ title: "Some Title" });

      const result = engine.evaluateCondition(condition, activity);
      // Empty string is contained in any string
      expect(result.matched).toBe(true);
    });
  });
});
