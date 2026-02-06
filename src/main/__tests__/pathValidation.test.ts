import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// The electron mock at src/main/__mocks__/electron.ts provides:
//   app.getPath: vi.fn().mockReturnValue('/tmp/test-user-data')
// This means app.getPath('userData') returns '/tmp/test-user-data'
// and the allowed directory becomes '/tmp/test-user-data/screenshots'

import { isPathAllowed } from "../pathValidation";

const MOCK_USER_DATA = "/tmp/test-user-data";
const SCREENSHOTS_DIR = path.join(MOCK_USER_DATA, "screenshots");

describe("pathValidation", () => {
  describe("isPathAllowed", () => {
    describe("valid paths", () => {
      it("should allow a file directly inside the screenshots directory", () => {
        const filePath = path.join(
          SCREENSHOTS_DIR,
          "screenshot-2024-01-01.png",
        );
        expect(isPathAllowed(filePath)).toBe(true);
      });

      it("should allow a file in a subdirectory of screenshots", () => {
        const filePath = path.join(SCREENSHOTS_DIR, "daily", "screenshot.png");
        expect(isPathAllowed(filePath)).toBe(true);
      });

      it("should allow the screenshots directory itself", () => {
        expect(isPathAllowed(SCREENSHOTS_DIR)).toBe(true);
      });

      it("should allow deeply nested files within screenshots", () => {
        const filePath = path.join(SCREENSHOTS_DIR, "a", "b", "c", "file.png");
        expect(isPathAllowed(filePath)).toBe(true);
      });
    });

    describe("paths outside allowed directories", () => {
      it("should deny access to /etc/passwd", () => {
        expect(isPathAllowed("/etc/passwd")).toBe(false);
      });

      it("should deny access to the home directory", () => {
        expect(isPathAllowed("/Users/someone/.ssh/id_rsa")).toBe(false);
      });

      it("should deny access to the userData directory itself (not screenshots)", () => {
        expect(isPathAllowed(MOCK_USER_DATA)).toBe(false);
      });

      it("should deny access to a file directly in userData (not in screenshots)", () => {
        const filePath = path.join(MOCK_USER_DATA, "config.json");
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny access to sibling directories of screenshots", () => {
        const filePath = path.join(MOCK_USER_DATA, "logs", "app.log");
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny access to root path", () => {
        expect(isPathAllowed("/")).toBe(false);
      });
    });

    describe("path traversal attacks", () => {
      it("should deny path traversal via ../ from screenshots directory", () => {
        const filePath = path.join(SCREENSHOTS_DIR, "..", "config.json");
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny path traversal to /etc/passwd from screenshots", () => {
        const filePath = path.join(
          SCREENSHOTS_DIR,
          "..",
          "..",
          "..",
          "etc",
          "passwd",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny double traversal attempts", () => {
        const filePath = path.join(
          SCREENSHOTS_DIR,
          "..",
          "..",
          "etc",
          "shadow",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny traversal with intermediate valid directory", () => {
        const filePath = path.join(
          SCREENSHOTS_DIR,
          "subdir",
          "..",
          "..",
          "secrets.txt",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });
    });

    describe("prefix attacks", () => {
      it("should deny access to a directory named screenshots-evil", () => {
        const filePath = path.join(
          MOCK_USER_DATA,
          "screenshots-evil",
          "file.png",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny access to a directory named screenshotsBackup", () => {
        const filePath = path.join(
          MOCK_USER_DATA,
          "screenshotsBackup",
          "file.png",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });

      it("should deny access to screenshots_old directory", () => {
        const filePath = path.join(
          MOCK_USER_DATA,
          "screenshots_old",
          "file.png",
        );
        expect(isPathAllowed(filePath)).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should deny an empty string path", () => {
        expect(isPathAllowed("")).toBe(false);
      });

      it("should deny a relative path that does not resolve into screenshots", () => {
        expect(isPathAllowed("relative/path/file.png")).toBe(false);
      });

      it("should deny a path with only dots", () => {
        expect(isPathAllowed("..")).toBe(false);
      });

      it("should deny a path with spaces that resolves outside screenshots", () => {
        expect(isPathAllowed("/tmp/test-user-data/ screenshots/file.png")).toBe(
          false,
        );
      });

      it("should handle paths with redundant separators", () => {
        // path.resolve normalizes double separators, so this resolves to the screenshots dir
        const filePath = SCREENSHOTS_DIR + "//file.png";
        expect(isPathAllowed(filePath)).toBe(true);
      });

      it("should handle path with trailing separator in screenshots dir", () => {
        const filePath = SCREENSHOTS_DIR + path.sep + "file.png";
        expect(isPathAllowed(filePath)).toBe(true);
      });
    });
  });
});
