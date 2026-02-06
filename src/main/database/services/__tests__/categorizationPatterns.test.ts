import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  CategorizationPatternRow,
  PatternType,
} from "../../../../shared/categorizationTypes";

// Mock the database
const mockDb = {
  prepare: vi.fn(),
};

vi.mock("../../index", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

// Import after mocking
import {
  createPattern,
  updatePattern,
  findPatternById,
  findPatterns,
  findByTypeAndValue,
  findMatchingPatterns,
  incrementMatchCount,
  incrementCorrectionCount,
  updateConfidence,
  deletePattern,
  deleteAllPatternsForUser,
  getPatternStats,
  type FindPatternsOptions,
} from "../categorizationPatterns";

describe("categorizationPatterns database service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPattern", () => {
    it("should insert pattern with default confidence for user_correction", () => {
      const mockStmt = {
        run: vi.fn(() => ({ lastInsertRowid: 1 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = createPattern({
        userId: "user-1",
        patternType: "app",
        patternValue: "Chrome",
        categoryId: "category-1",
        source: "user_correction",
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO categorization_patterns"),
      );
      expect(mockStmt.run).toHaveBeenCalledWith(
        "user-1",
        "app",
        "Chrome",
        "category-1",
        0.5, // default confidence for user_correction
        0, // match_count
        1, // correction_count
        "user_correction",
        expect.any(String), // created_at
        expect.any(String), // updated_at
      );
      expect(result.id).toBe(1);
      expect(result.confidence).toBe(0.5);
    });

    it("should use custom confidence when provided", () => {
      const mockStmt = {
        run: vi.fn(() => ({ lastInsertRowid: 1 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = createPattern({
        userId: "user-1",
        patternType: "app",
        patternValue: "Chrome",
        categoryId: "category-1",
        confidence: 0.8,
        source: "manual",
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        0.8, // custom confidence
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(result.confidence).toBe(0.8);
    });

    it("should use different default confidence for template source", () => {
      const mockStmt = {
        run: vi.fn(() => ({ lastInsertRowid: 1 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      createPattern({
        userId: "user-1",
        patternType: "domain",
        patternValue: "github.com",
        categoryId: "category-1",
        source: "template",
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        0.3, // default confidence for template
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("updatePattern", () => {
    it("should update allowed fields", () => {
      const mockGetStmt = {
        get: vi.fn(() => ({
          id: 1,
          user_id: "user-1",
          pattern_type: "app",
          pattern_value: "Chrome",
          category_id: "category-1",
          confidence: 0.8,
          match_count: 5,
          correction_count: 2,
          source: "user_correction",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        })),
      };
      const mockUpdateStmt = {
        run: vi.fn(),
      };
      mockDb.prepare
        .mockReturnValueOnce(mockUpdateStmt)
        .mockReturnValueOnce(mockGetStmt);

      const result = updatePattern(1, {
        categoryId: "category-2",
        confidence: 0.9,
      });

      expect(mockUpdateStmt.run).toHaveBeenCalledWith(
        "category-2",
        0.9,
        expect.any(String), // updated_at
        1, // id
      );
      expect(result).toBeDefined();
    });

    it("should reject invalid column names", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const mockGetStmt = {
        get: vi.fn(() => ({
          id: 1,
          user_id: "user-1",
          pattern_type: "app",
          pattern_value: "Chrome",
          category_id: "category-1",
          confidence: 0.5,
          match_count: 0,
          correction_count: 1,
          source: "user_correction",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        })),
      };
      mockDb.prepare.mockReturnValue(mockGetStmt);

      // Try to update with invalid field
      updatePattern(1, { invalidField: "value" } as unknown as Parameters<
        typeof updatePattern
      >[1]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rejected invalid column name"),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("findPatternById", () => {
    it("should return pattern when found", () => {
      const mockStmt = {
        get: vi.fn(() => ({
          id: 1,
          user_id: "user-1",
          pattern_type: "app",
          pattern_value: "Chrome",
          category_id: "category-1",
          confidence: 0.5,
          match_count: 10,
          correction_count: 2,
          source: "user_correction",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
        })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = findPatternById(1);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.userId).toBe("user-1"); // Converted to camelCase
      expect(result!.patternType).toBe("app");
    });

    it("should return undefined when not found", () => {
      const mockStmt = {
        get: vi.fn(() => undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = findPatternById(999);

      expect(result).toBeUndefined();
    });
  });

  describe("findPatterns", () => {
    it("should find patterns with filters", () => {
      const mockRows: CategorizationPatternRow[] = [
        {
          id: 1,
          user_id: "user-1",
          pattern_type: "app",
          pattern_value: "Chrome",
          category_id: "category-1",
          confidence: 0.8,
          match_count: 10,
          correction_count: 2,
          source: "user_correction",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
        },
      ];
      const mockStmt = {
        all: vi.fn(() => mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const options: FindPatternsOptions = {
        patternType: "app",
        minConfidence: 0.5,
        limit: 10,
      };

      const result = findPatterns("user-1", options);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = ?"),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("AND pattern_type = ?"),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("AND confidence >= ?"),
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT ?"),
      );
      expect(result).toHaveLength(1);
      expect(result[0].patternType).toBe("app");
    });

    it("should order by confidence descending by default", () => {
      const mockStmt = {
        all: vi.fn(() => []),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      findPatterns("user-1");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY confidence DESC"),
      );
    });
  });

  describe("findByTypeAndValue", () => {
    it("should find pattern by type and value", () => {
      const mockStmt = {
        get: vi.fn(() => ({
          id: 1,
          user_id: "user-1",
          pattern_type: "domain",
          pattern_value: "github.com",
          category_id: "category-1",
          confidence: 0.7,
          match_count: 5,
          correction_count: 1,
          source: "user_correction",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
        })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = findByTypeAndValue("user-1", "domain", "github.com");

      expect(mockStmt.get).toHaveBeenCalledWith(
        "user-1",
        "domain",
        "github.com",
      );
      expect(result).toBeDefined();
      expect(result!.patternValue).toBe("github.com");
    });
  });

  describe("findMatchingPatterns", () => {
    it("should find patterns matching multiple type/value pairs", () => {
      const mockStmt = {
        all: vi.fn(() => [
          {
            id: 1,
            user_id: "user-1",
            pattern_type: "app",
            pattern_value: "chrome",
            category_id: "category-1",
            confidence: 0.8,
            match_count: 10,
            correction_count: 2,
            source: "user_correction",
            created_at: "2024-01-01",
            updated_at: "2024-01-02",
          },
          {
            id: 2,
            user_id: "user-1",
            pattern_type: "domain",
            pattern_value: "github.com",
            category_id: "category-2",
            confidence: 0.6,
            match_count: 5,
            correction_count: 1,
            source: "user_correction",
            created_at: "2024-01-01",
            updated_at: "2024-01-02",
          },
        ]),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = findMatchingPatterns("user-1", [
        { type: "app", value: "chrome" },
        { type: "domain", value: "github.com" },
      ]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("(pattern_type = ? AND pattern_value = ?)"),
      );
      expect(result).toHaveLength(2);
    });

    it("should return empty array for empty pattern matches", () => {
      const result = findMatchingPatterns("user-1", []);
      expect(result).toHaveLength(0);
    });
  });

  describe("incrementMatchCount", () => {
    it("should increment match count", () => {
      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      incrementMatchCount(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SET match_count = match_count + 1"),
      );
      expect(mockStmt.run).toHaveBeenCalledWith(expect.any(String), 1);
    });
  });

  describe("incrementCorrectionCount", () => {
    it("should increment correction count", () => {
      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      incrementCorrectionCount(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SET correction_count = correction_count + 1"),
      );
      expect(mockStmt.run).toHaveBeenCalledWith(expect.any(String), 1);
    });
  });

  describe("updateConfidence", () => {
    it("should update confidence with clamping", () => {
      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      updateConfidence(1, 0.75);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SET confidence = ?"),
      );
      expect(mockStmt.run).toHaveBeenCalledWith(0.75, expect.any(String), 1);
    });

    it("should clamp confidence to minimum 0.1", () => {
      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      updateConfidence(1, 0.05);

      expect(mockStmt.run).toHaveBeenCalledWith(0.1, expect.any(String), 1);
    });

    it("should clamp confidence to maximum 1.0", () => {
      const mockStmt = {
        run: vi.fn(),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      updateConfidence(1, 1.5);

      expect(mockStmt.run).toHaveBeenCalledWith(1.0, expect.any(String), 1);
    });
  });

  describe("deletePattern", () => {
    it("should delete pattern and return true when found", () => {
      const mockStmt = {
        run: vi.fn(() => ({ changes: 1 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = deletePattern(1);

      expect(mockStmt.run).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it("should return false when pattern not found", () => {
      const mockStmt = {
        run: vi.fn(() => ({ changes: 0 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = deletePattern(999);

      expect(result).toBe(false);
    });
  });

  describe("deleteAllPatternsForUser", () => {
    it("should delete all patterns for user", () => {
      const mockStmt = {
        run: vi.fn(() => ({ changes: 5 })),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = deleteAllPatternsForUser("user-1");

      expect(mockStmt.run).toHaveBeenCalledWith("user-1");
      expect(result).toBe(5);
    });
  });

  describe("getPatternStats", () => {
    it("should return pattern statistics", () => {
      mockDb.prepare
        .mockReturnValueOnce({ get: vi.fn(() => ({ count: 10 })) }) // total
        .mockReturnValueOnce({
          all: vi.fn(() => [
            { pattern_type: "app", count: 5 },
            { pattern_type: "domain", count: 3 },
          ]),
        }) // by type
        .mockReturnValueOnce({
          all: vi.fn(() => [
            { source: "user_correction", count: 8 },
            { source: "manual", count: 2 },
          ]),
        }) // by source
        .mockReturnValueOnce({ get: vi.fn(() => ({ avg_confidence: 0.65 })) }) // avg
        .mockReturnValueOnce({ get: vi.fn(() => ({ count: 4 })) }); // trusted

      const result = getPatternStats("user-1");

      expect(result.totalPatterns).toBe(10);
      expect(result.patternsByType.app).toBe(5);
      expect(result.patternsByType.domain).toBe(3);
      expect(result.patternsByType.url_path).toBe(0);
      expect(result.patternsByType.title_keyword).toBe(0);
      expect(result.patternsBySource.user_correction).toBe(8);
      expect(result.patternsBySource.manual).toBe(2);
      expect(result.patternsBySource.template).toBe(0);
      expect(result.averageConfidence).toBe(0.65);
      expect(result.trustedPatterns).toBe(4);
    });

    it("should handle null average confidence", () => {
      mockDb.prepare
        .mockReturnValueOnce({ get: vi.fn(() => ({ count: 0 })) })
        .mockReturnValueOnce({ all: vi.fn(() => []) })
        .mockReturnValueOnce({ all: vi.fn(() => []) })
        .mockReturnValueOnce({ get: vi.fn(() => ({ avg_confidence: null })) })
        .mockReturnValueOnce({ get: vi.fn(() => ({ count: 0 })) });

      const result = getPatternStats("user-1");

      expect(result.averageConfidence).toBe(0);
    });
  });
});
