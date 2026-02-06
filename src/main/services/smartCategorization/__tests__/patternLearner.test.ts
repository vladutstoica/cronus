import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PatternLearner,
  getPatternLearner,
  clearPatternLearnerCache,
  type ExtractedPattern,
} from "../patternLearner";
import type { ActivityForMatching } from "../types";
import type {
  CategorizationPattern,
  PatternType,
} from "../../../../shared/categorizationTypes";

// Track mock pattern storage for testing
let mockPatternStore: Map<string, CategorizationPattern[]>;
let nextPatternId: number;

// Mock the database service
vi.mock("../../../database/services/categorizationPatterns", () => ({
  createPattern: vi.fn((input) => {
    const userId = input.userId;
    const pattern: CategorizationPattern = {
      id: nextPatternId++,
      userId: input.userId,
      patternType: input.patternType,
      patternValue: input.patternValue,
      categoryId: input.categoryId,
      confidence: input.confidence ?? 0.5,
      matchCount: 0,
      correctionCount: 1,
      source: input.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!mockPatternStore.has(userId)) {
      mockPatternStore.set(userId, []);
    }
    mockPatternStore.get(userId)!.push(pattern);
    return pattern;
  }),
  findByTypeAndValue: vi.fn((userId, patternType, patternValue) => {
    const patterns = mockPatternStore.get(userId) ?? [];
    return patterns.find(
      (p) => p.patternType === patternType && p.patternValue === patternValue,
    );
  }),
  findMatchingPatterns: vi.fn((userId, patternMatches) => {
    const patterns = mockPatternStore.get(userId) ?? [];
    return patterns
      .filter((p) =>
        patternMatches.some(
          (m: { type: PatternType; value: string }) =>
            m.type === p.patternType && m.value === p.patternValue,
        ),
      )
      .sort((a, b) => b.confidence - a.confidence);
  }),
  updatePattern: vi.fn((id, updates) => {
    for (const patterns of mockPatternStore.values()) {
      const pattern = patterns.find((p) => p.id === id);
      if (pattern) {
        if (updates.categoryId !== undefined)
          pattern.categoryId = updates.categoryId;
        if (updates.confidence !== undefined)
          pattern.confidence = updates.confidence;
        if (updates.matchCount !== undefined)
          pattern.matchCount = updates.matchCount;
        if (updates.correctionCount !== undefined)
          pattern.correctionCount = updates.correctionCount;
        return pattern;
      }
    }
    return undefined;
  }),
  updateConfidence: vi.fn((id, newConfidence) => {
    for (const patterns of mockPatternStore.values()) {
      const pattern = patterns.find((p) => p.id === id);
      if (pattern) {
        pattern.confidence = Math.max(0.1, Math.min(1.0, newConfidence));
        return;
      }
    }
  }),
  incrementMatchCount: vi.fn((id) => {
    for (const patterns of mockPatternStore.values()) {
      const pattern = patterns.find((p) => p.id === id);
      if (pattern) {
        pattern.matchCount++;
        return;
      }
    }
  }),
  incrementCorrectionCount: vi.fn((id) => {
    for (const patterns of mockPatternStore.values()) {
      const pattern = patterns.find((p) => p.id === id);
      if (pattern) {
        pattern.correctionCount++;
        return;
      }
    }
  }),
  findPatterns: vi.fn((userId, options) => {
    const patterns = mockPatternStore.get(userId) ?? [];
    let filtered = [...patterns];

    if (options?.minConfidence !== undefined) {
      filtered = filtered.filter((p) => p.confidence >= options.minConfidence);
    }
    if (options?.categoryId !== undefined) {
      filtered = filtered.filter((p) => p.categoryId === options.categoryId);
    }

    return filtered.sort((a, b) => b.confidence - a.confidence);
  }),
}));

/**
 * Helper to create an activity for matching
 */
function createActivity(
  overrides: Partial<ActivityForMatching> = {},
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

/**
 * Helper to create a mock pattern
 */
function createMockPattern(
  userId: string,
  overrides: Partial<CategorizationPattern> = {},
): CategorizationPattern {
  const pattern: CategorizationPattern = {
    id: nextPatternId++,
    userId,
    patternType: "app",
    patternValue: "chrome",
    categoryId: "category-1",
    confidence: 0.5,
    matchCount: 0,
    correctionCount: 1,
    source: "user_correction",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  if (!mockPatternStore.has(userId)) {
    mockPatternStore.set(userId, []);
  }
  mockPatternStore.get(userId)!.push(pattern);

  return pattern;
}

describe("PatternLearner", () => {
  let learner: PatternLearner;
  const testUserId = "test-user-1";

  beforeEach(() => {
    clearPatternLearnerCache();
    mockPatternStore = new Map();
    nextPatternId = 1;
    learner = new PatternLearner(testUserId);
  });

  afterEach(() => {
    clearPatternLearnerCache();
    vi.clearAllMocks();
  });

  describe("extractPatterns", () => {
    it("should extract app pattern from activity", () => {
      const activity = createActivity({ appName: "VS Code" });
      const patterns = learner.extractPatterns(activity);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: "app",
          value: "vs code",
          signalStrength: 0.9,
        }),
      );
    });

    it("should extract domain pattern from URL", () => {
      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const patterns = learner.extractPatterns(activity);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: "domain",
          value: "github.com",
          signalStrength: 0.85,
        }),
      );
    });

    it("should extract URL path pattern from URL", () => {
      const activity = createActivity({
        url: "https://github.com/pulls/123",
      });
      const patterns = learner.extractPatterns(activity);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: "url_path",
          value: "/pulls",
          signalStrength: 0.6,
        }),
      );
    });

    it("should extract title keywords", () => {
      const activity = createActivity({
        title: "GitHub - Pull Request Review",
      });
      const patterns = learner.extractPatterns(activity);

      const keywordPatterns = patterns.filter(
        (p) => p.type === "title_keyword",
      );
      expect(keywordPatterns.length).toBeGreaterThan(0);
      expect(keywordPatterns[0].signalStrength).toBe(0.4);
    });

    it("should not extract short words or stop words from title", () => {
      const activity = createActivity({
        title: "The Quick Brown Fox - New Tab",
      });
      const patterns = learner.extractPatterns(activity);

      const keywordPatterns = patterns.filter(
        (p) => p.type === "title_keyword",
      );
      const keywords = keywordPatterns.map((p) => p.value);

      // Should not include "the", "new", "tab"
      expect(keywords).not.toContain("the");
      expect(keywords).not.toContain("new");
      expect(keywords).not.toContain("tab");
      // Should include "quick", "brown", "fox"
      expect(keywords).toContain("quick");
      expect(keywords).toContain("brown");
      expect(keywords).toContain("fox");
    });

    it("should return patterns sorted by signal strength", () => {
      const activity = createActivity({
        appName: "Chrome",
        url: "https://github.com/pulls",
        title: "Pull Request Review",
      });
      const patterns = learner.extractPatterns(activity);

      // Verify sorted by signal strength (descending)
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i - 1].signalStrength).toBeGreaterThanOrEqual(
          patterns[i].signalStrength,
        );
      }

      // App should be first (highest signal)
      expect(patterns[0].type).toBe("app");
    });

    it("should handle activity with no extractable patterns", () => {
      const activity = createActivity({
        appName: "",
        url: null,
        title: "",
      });
      const patterns = learner.extractPatterns(activity);

      expect(patterns).toHaveLength(0);
    });

    it("should handle invalid URL gracefully", () => {
      const activity = createActivity({
        url: "not-a-valid-url",
      });
      const patterns = learner.extractPatterns(activity);

      // Should still have app pattern, but no domain/path
      const domainPatterns = patterns.filter((p) => p.type === "domain");
      const pathPatterns = patterns.filter((p) => p.type === "url_path");

      expect(domainPatterns).toHaveLength(0);
      expect(pathPatterns).toHaveLength(0);
    });

    it("should limit title keywords to 3", () => {
      const activity = createActivity({
        title: "Alpha Beta Gamma Delta Epsilon Zeta Theta",
      });
      const patterns = learner.extractPatterns(activity);

      const keywordPatterns = patterns.filter(
        (p) => p.type === "title_keyword",
      );
      expect(keywordPatterns.length).toBeLessThanOrEqual(3);
    });
  });

  describe("recordCorrection", () => {
    it("should create new patterns when none exist", () => {
      const activity = createActivity({
        appName: "Slack",
        url: "https://app.slack.com/client",
      });

      const patterns = learner.recordCorrection(activity, "category-comm");

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].categoryId).toBe("category-comm");
      expect(patterns[0].confidence).toBe(0.5); // Initial confidence for user_correction
      expect(patterns[0].source).toBe("user_correction");
    });

    it("should increase confidence for existing pattern with same category", () => {
      // Create existing pattern
      const existingPattern = createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-comm",
        confidence: 0.5,
      });

      const activity = createActivity({ appName: "Slack" });
      const updatedPatterns = learner.recordCorrection(
        activity,
        "category-comm",
      );

      // Find the updated app pattern
      const appPattern = updatedPatterns.find((p) => p.patternType === "app");
      expect(appPattern).toBeDefined();
      expect(appPattern!.confidence).toBe(0.6); // 0.5 + 0.1 increase
    });

    it("should update pattern to new category when corrected", () => {
      // Create existing pattern pointing to wrong category
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-work",
        confidence: 0.7,
      });

      const activity = createActivity({ appName: "Slack" });
      const updatedPatterns = learner.recordCorrection(
        activity,
        "category-comm",
        "category-work",
      );

      const appPattern = updatedPatterns.find((p) => p.patternType === "app");
      expect(appPattern).toBeDefined();
      expect(appPattern!.categoryId).toBe("category-comm");
      expect(appPattern!.confidence).toBe(0.5); // Reset to initial confidence
    });

    it("should decrease confidence when old category matches pattern category", async () => {
      // Create existing pattern that led to wrong categorization
      const existingPattern = createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-work",
        confidence: 0.7,
      });

      const activity = createActivity({ appName: "Slack" });
      learner.recordCorrection(activity, "category-comm", "category-work");

      // The pattern confidence should have been decreased
      const { updateConfidence } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(updateConfidence).toHaveBeenCalledWith(
        existingPattern.id,
        expect.any(Number),
      );
    });

    it("should cap confidence at maximum 1.0", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-comm",
        confidence: 0.95,
      });

      const activity = createActivity({ appName: "Slack" });
      const updatedPatterns = learner.recordCorrection(
        activity,
        "category-comm",
      );

      const appPattern = updatedPatterns.find((p) => p.patternType === "app");
      expect(appPattern!.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("findMatchingPatterns", () => {
    it("should find patterns matching activity", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "chrome",
        categoryId: "category-1",
        confidence: 0.8,
      });

      const activity = createActivity({ appName: "Chrome" });
      const matches = learner.findMatchingPatterns(activity);

      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.patternValue).toBe("chrome");
    });

    it("should return matches sorted by score", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "chrome",
        categoryId: "category-1",
        confidence: 0.5,
      });
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-2",
        confidence: 0.9,
      });

      const activity = createActivity({
        appName: "Chrome",
        url: "https://github.com/repo",
      });
      const matches = learner.findMatchingPatterns(activity);

      expect(matches.length).toBeGreaterThan(0);
      // Verify sorted by score (descending)
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it("should calculate score as confidence * signal strength", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "chrome",
        categoryId: "category-1",
        confidence: 0.8,
      });

      const activity = createActivity({ appName: "Chrome" });
      const matches = learner.findMatchingPatterns(activity);

      expect(matches).toHaveLength(1);
      // Score = 0.8 (confidence) * 0.9 (app signal strength) = 0.72
      expect(matches[0].score).toBeCloseTo(0.72, 2);
    });

    it("should return empty array when no patterns match", () => {
      const activity = createActivity({ appName: "Firefox" });
      const matches = learner.findMatchingPatterns(activity);

      expect(matches).toHaveLength(0);
    });

    it("should include reasoning in matches", () => {
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-1",
        confidence: 0.7,
        matchCount: 15,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const matches = learner.findMatchingPatterns(activity);

      expect(matches).toHaveLength(1);
      expect(matches[0].reasoning).toContain("website domain");
      expect(matches[0].reasoning).toContain("github.com");
      expect(matches[0].reasoning).toContain("70%");
      expect(matches[0].reasoning).toContain("15");
    });
  });

  describe("suggestCategory", () => {
    it("should suggest category based on highest scoring patterns", () => {
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-work",
        confidence: 0.9,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.categoryId).toBe("category-work");
    });

    it("should return null when no confident patterns match", () => {
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "other.com",
        categoryId: "category-1",
        confidence: 0.1,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);

      expect(suggestion).toBeNull();
    });

    it("should respect minimum confidence threshold", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "chrome",
        categoryId: "category-1",
        confidence: 0.4, // Will result in score ~0.36 (below 0.5 threshold)
      });

      const activity = createActivity({ appName: "Chrome" });
      const suggestion = learner.suggestCategory(activity, 0.5);

      expect(suggestion).toBeNull();
    });

    it("should boost confidence when multiple patterns agree", () => {
      createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "chrome",
        categoryId: "category-1",
        confidence: 0.5,
      });
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-1",
        confidence: 0.5,
      });

      const activity = createActivity({
        appName: "Chrome",
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);

      expect(suggestion).not.toBeNull();
      // Should have boost from multiple patterns
      expect(suggestion!.matchedPatterns.length).toBe(2);
    });

    it("should include matched patterns in suggestion", () => {
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-1",
        confidence: 0.8,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.matchedPatterns).toHaveLength(1);
      expect(suggestion!.matchedPatterns[0].pattern.patternValue).toBe(
        "github.com",
      );
    });

    it("should include reasoning in suggestion", () => {
      createMockPattern(testUserId, {
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-1",
        confidence: 0.8,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.reasoning).toContain("Suggested based on");
    });
  });

  describe("suggestionToResult", () => {
    it("should convert suggestion to CategorizationResult", () => {
      createMockPattern(testUserId, {
        id: 42,
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-work",
        confidence: 0.8,
      });

      const activity = createActivity({
        url: "https://github.com/user/repo",
      });
      const suggestion = learner.suggestCategory(activity);
      expect(suggestion).not.toBeNull();

      const result = learner.suggestionToResult(suggestion!);

      expect(result.categoryId).toBe("category-work");
      expect(result.source).toBe("pattern");
      expect(result.matchedPatternId).toBe(42);
      expect(result.reasoning).toContain("Suggested based on");
    });
  });

  describe("adjustConfidenceOnMatch", () => {
    it("should increase confidence on correct match", async () => {
      const pattern = createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-comm",
        confidence: 0.5,
      });

      learner.adjustConfidenceOnMatch(pattern.id, true);

      const { updateConfidence, incrementMatchCount } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(updateConfidence).toHaveBeenCalledWith(
        pattern.id,
        expect.closeTo(0.55, 1), // 0.5 + (0.1 * 0.5)
      );
      expect(incrementMatchCount).toHaveBeenCalledWith(pattern.id);
    });

    it("should decrease confidence on incorrect match", async () => {
      const pattern = createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        categoryId: "category-comm",
        confidence: 0.5,
      });

      learner.adjustConfidenceOnMatch(pattern.id, false);

      const { updateConfidence } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(updateConfidence).toHaveBeenCalledWith(
        pattern.id,
        expect.closeTo(0.35, 1), // 0.5 - 0.15
      );
    });

    it("should handle non-existent pattern gracefully", () => {
      // Should not throw
      expect(() => {
        learner.adjustConfidenceOnMatch(99999, true);
      }).not.toThrow();
    });
  });

  describe("recordMatch", () => {
    it("should increment match count", async () => {
      const pattern = createMockPattern(testUserId, {
        patternType: "app",
        patternValue: "slack",
        matchCount: 5,
      });

      learner.recordMatch(pattern.id);

      const { incrementMatchCount } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(incrementMatchCount).toHaveBeenCalledWith(pattern.id);
    });
  });

  describe("isPatternTrusted", () => {
    it("should return true for high confidence patterns", () => {
      const pattern = createMockPattern(testUserId, { confidence: 0.8 });
      expect(learner.isPatternTrusted(pattern)).toBe(true);
    });

    it("should return false for low confidence patterns", () => {
      const pattern = createMockPattern(testUserId, { confidence: 0.5 });
      expect(learner.isPatternTrusted(pattern)).toBe(false);
    });

    it("should return true at exactly threshold", () => {
      const pattern = createMockPattern(testUserId, { confidence: 0.7 });
      expect(learner.isPatternTrusted(pattern)).toBe(true);
    });
  });

  describe("getTrustedPatterns", () => {
    it("should return only patterns with confidence > 0.7", async () => {
      createMockPattern(testUserId, { confidence: 0.8 });
      createMockPattern(testUserId, { confidence: 0.5 });
      createMockPattern(testUserId, { confidence: 0.9 });

      const trusted = learner.getTrustedPatterns();

      const { findPatterns } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(findPatterns).toHaveBeenCalledWith(testUserId, {
        minConfidence: 0.7,
      });
    });
  });

  describe("getPatternsForCategory", () => {
    it("should return patterns for specific category", async () => {
      learner.getPatternsForCategory("category-work");

      const { findPatterns } = await import(
        "../../../database/services/categorizationPatterns"
      );
      expect(findPatterns).toHaveBeenCalledWith(testUserId, {
        categoryId: "category-work",
      });
    });
  });

  describe("getConfidenceConfig", () => {
    it("should return configuration values", () => {
      const config = learner.getConfidenceConfig();

      expect(config.initialUserCorrection).toBe(0.5);
      expect(config.initialAutomatic).toBe(0.3);
      expect(config.increaseOnCorrection).toBe(0.1);
      expect(config.decreaseOnWrongMatch).toBe(0.15);
      expect(config.minimum).toBe(0.1);
      expect(config.maximum).toBe(1.0);
      expect(config.trustedThreshold).toBe(0.7);
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance for same user", () => {
      const learner1 = getPatternLearner("user-1");
      const learner2 = getPatternLearner("user-1");

      expect(learner1).toBe(learner2);
    });

    it("should return different instances for different users", () => {
      const learner1 = getPatternLearner("user-1");
      const learner2 = getPatternLearner("user-2");

      expect(learner1).not.toBe(learner2);
    });

    it("should create new instance after cache clear", () => {
      const learner1 = getPatternLearner("user-1");
      clearPatternLearnerCache();
      const learner2 = getPatternLearner("user-1");

      expect(learner1).not.toBe(learner2);
    });
  });

  describe("learning flow integration", () => {
    it("should learn and improve from repeated corrections", () => {
      const activity = createActivity({
        appName: "Slack",
        url: "https://app.slack.com/client/T123/C456",
      });

      // First correction
      const patterns1 = learner.recordCorrection(activity, "category-comm");
      const initialConfidence = patterns1.find(
        (p) => p.patternType === "app",
      )!.confidence;
      expect(initialConfidence).toBe(0.5);

      // Second correction to same category
      const patterns2 = learner.recordCorrection(activity, "category-comm");
      const updatedConfidence = patterns2.find(
        (p) => p.patternType === "app",
      )!.confidence;
      expect(updatedConfidence).toBe(0.6);

      // Third correction
      const patterns3 = learner.recordCorrection(activity, "category-comm");
      const finalConfidence = patterns3.find(
        (p) => p.patternType === "app",
      )!.confidence;
      expect(finalConfidence).toBe(0.7);
    });

    it("should suggest category after learning", () => {
      // Record a correction
      const correctionActivity = createActivity({
        appName: "Linear",
        url: "https://linear.app/team/issues",
      });
      learner.recordCorrection(correctionActivity, "category-work");

      // Now test suggestion for similar activity
      const newActivity = createActivity({
        appName: "Linear",
        url: "https://linear.app/team/project",
      });
      const suggestion = learner.suggestCategory(newActivity);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.categoryId).toBe("category-work");
    });
  });
});
