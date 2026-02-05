import { describe, it, expect, vi } from "vitest";
import {
  ExportFormat,
  ExportDataType,
  ExportOptions,
} from "../../../shared/exportTypes";

// Import the function to test
import { generateExportFilename } from "../exportService";

/**
 * ExportService tests.
 * Tests cover the filename generation and type definitions.
 * Full integration tests require the database to be initialized.
 */

describe("ExportService", () => {
  describe("generateExportFilename", () => {
    it("should generate CSV filename for activities", () => {
      const filename = generateExportFilename(
        ExportFormat.CSV,
        ExportDataType.Activities,
      );
      expect(filename).toMatch(/^cronus-export-activities-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should generate JSON filename for all data", () => {
      const filename = generateExportFilename(
        ExportFormat.JSON,
        ExportDataType.All,
      );
      expect(filename).toMatch(/^cronus-export-all-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("should generate correct filename for categories", () => {
      const filename = generateExportFilename(
        ExportFormat.CSV,
        ExportDataType.Categories,
      );
      expect(filename).toMatch(/^cronus-export-categories-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should include current date in filename", () => {
      const today = new Date().toISOString().substring(0, 10);
      const filename = generateExportFilename(
        ExportFormat.JSON,
        ExportDataType.All,
      );
      expect(filename).toContain(today);
    });
  });

  describe("ExportOptions type", () => {
    it("should accept valid export options", () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        dataType: ExportDataType.All,
        privacy: {
          excludeOcrContent: true,
          excludeUrls: false,
          excludeScreenshots: true,
        },
      };

      expect(options.format).toBe(ExportFormat.CSV);
      expect(options.dataType).toBe(ExportDataType.All);
      expect(options.privacy.excludeOcrContent).toBe(true);
      expect(options.privacy.excludeUrls).toBe(false);
    });

    it("should accept date range in options", () => {
      const options: ExportOptions = {
        format: ExportFormat.JSON,
        dataType: ExportDataType.Activities,
        dateRange: {
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-31T23:59:59.999Z",
        },
        privacy: {
          excludeOcrContent: false,
          excludeUrls: false,
          excludeScreenshots: false,
        },
      };

      expect(options.dateRange?.startDate).toBe("2024-01-01T00:00:00.000Z");
      expect(options.dateRange?.endDate).toBe("2024-01-31T23:59:59.999Z");
    });
  });

  describe("ExportFormat enum", () => {
    it("should have correct values", () => {
      expect(ExportFormat.CSV).toBe("csv");
      expect(ExportFormat.JSON).toBe("json");
    });
  });

  describe("ExportDataType enum", () => {
    it("should have correct values", () => {
      expect(ExportDataType.Activities).toBe("activities");
      expect(ExportDataType.Categories).toBe("categories");
      expect(ExportDataType.All).toBe("all");
    });
  });
});
