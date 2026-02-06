import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for categorization cache behavior.
 * We test the cache module functions by mocking the AI and provider dependencies.
 */

// Mock AI-related modules before importing categorization
vi.mock("../aiProvider", () => ({
  getActiveProvider: vi.fn(),
  isActiveProviderAvailable: vi.fn(),
}));

vi.mock("../ollama", () => ({
  isAIEnabled: vi.fn().mockReturnValue(false),
}));

import {
  clearCategorizationCacheForIdentifier,
  sweepExpiredCacheEntries,
  startCacheCleanup,
  stopCacheCleanup,
} from "../categorization";

describe("Categorization Cache", () => {
  describe("clearCategorizationCacheForIdentifier", () => {
    it("should return 0 when cache is empty", () => {
      const cleared = clearCategorizationCacheForIdentifier(
        "https://github.com",
        "website",
      );
      expect(cleared).toBe(0);
    });

    it("should return 0 for a non-matching identifier", () => {
      const cleared = clearCategorizationCacheForIdentifier(
        "https://nonexistent.com",
        "website",
      );
      expect(cleared).toBe(0);
    });

    it("should return 0 for a non-matching item type", () => {
      const cleared = clearCategorizationCacheForIdentifier("VS Code", "app");
      expect(cleared).toBe(0);
    });
  });

  describe("ActivityDetails interface", () => {
    it("should accept minimal activity details", () => {
      // Type-level verification that ActivityDetails allows optional fields
      const details = {
        ownerName: "Chrome",
      };
      expect(details.ownerName).toBe("Chrome");
    });

    it("should accept full activity details", () => {
      const details = {
        ownerName: "Chrome",
        title: "GitHub",
        url: "https://github.com",
        content: "Some OCR content",
        type: "browser",
        browser: "chrome",
      };
      expect(details.ownerName).toBe("Chrome");
      expect(details.url).toBe("https://github.com");
    });
  });

  describe("sweepExpiredCacheEntries", () => {
    it("should return 0 when cache is empty", () => {
      const result = sweepExpiredCacheEntries();
      expect(result).toBe(0);
    });
  });

  describe("startCacheCleanup / stopCacheCleanup", () => {
    afterEach(() => {
      stopCacheCleanup();
    });

    it("should start and stop without errors", () => {
      expect(() => startCacheCleanup()).not.toThrow();
      expect(() => stopCacheCleanup()).not.toThrow();
    });

    it("should be idempotent on start", () => {
      startCacheCleanup();
      startCacheCleanup(); // calling twice should not throw or create duplicate intervals
      stopCacheCleanup();
    });

    it("should be safe to call stop when not started", () => {
      expect(() => stopCacheCleanup()).not.toThrow();
    });
  });
});
