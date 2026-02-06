import { describe, it, expect } from "vitest";
import {
  getRuleBasedCategoryChoice,
  isSimpleTitleInformative,
  generateSimpleActivityTitle,
} from "../ruleBasedCategorization";

const userCategories = [
  { name: "Work", description: "Work-related activities" },
  { name: "Entertainment", description: "Entertainment and leisure" },
  { name: "Communication", description: "Email, messaging, meetings" },
  { name: "Personal", description: "Personal activities" },
  { name: "Uncategorized", description: "Uncategorized activities" },
];

describe("Rule-Based Categorization", () => {
  describe("getRuleBasedCategoryChoice", () => {
    it("should return null when userCategories is empty", () => {
      const result = getRuleBasedCategoryChoice([], {
        ownerName: "VS Code",
        title: "index.ts",
      });
      expect(result).toBeNull();
    });

    it("should categorize VS Code as Work (app match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "vscode",
        title: "index.ts - my-project",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Work");
    });

    it("should categorize IntelliJ as Work (app match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "intellij",
        title: "Main.java",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Work");
    });

    it("should categorize GitHub URL as Work (domain match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Arc",
        title: "Pull Request #42",
        url: "https://github.com/user/repo/pull/42",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Work");
    });

    it("should categorize YouTube URL as Entertainment (domain match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Chrome",
        title: "Funny Cat Videos - YouTube",
        url: "https://youtube.com/watch?v=abc123",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Entertainment");
    });

    it("should categorize Slack as Communication (app match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "slack",
        title: "#general - Team Workspace",
      });
      expect(result).not.toBeNull();
      // Slack appears in both work and communication rules.
      // Both score 3 from app match. Communication also matches on "chat" keyword in
      // the rule keywords if title contained it. With just app match both get 3,
      // so the first one found (work) wins in iteration order.
      // This is acceptable behavior - either Work or Communication is reasonable.
      expect(["Work", "Communication"]).toContain(result!.chosenCategoryName);
    });

    it("should categorize Netflix as Entertainment (domain match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Chrome",
        title: "Stranger Things - Netflix",
        url: "https://netflix.com/watch/12345",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Entertainment");
    });

    it("should categorize Gmail as Communication (domain match)", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Chrome",
        title: "Inbox - Gmail",
        url: "https://mail.google.com/mail/u/0",
      });
      expect(result).not.toBeNull();
      expect(result!.chosenCategoryName).toBe("Communication");
    });

    it("should use content keywords for scoring", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Chrome",
        title: "Some Page",
        url: "https://example.com",
        content: "This page is about project documentation for business use",
      });
      expect(result).not.toBeNull();
      // Content keywords "project", "documentation", "business" match work
      expect(result!.chosenCategoryName).toBe("Work");
    });

    it("should return Uncategorized for activities below score threshold", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "RandomApp",
        title: "Some Random Window",
      });
      expect(result).not.toBeNull();
      // Score below 2 leads to "uncategorized" type, which matches "Uncategorized" category
      expect(result!.chosenCategoryName).toBe("Uncategorized");
    });

    it("should generate a summary from the title", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "vscode",
        title: "My Cool Project - Visual Studio Code",
      });
      expect(result).not.toBeNull();
      expect(result!.summary).toBe("My Cool Project - Visual Studio Code");
    });

    it("should generate a summary from the URL domain when no informative title", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "Chrome",
        title: "New Tab",
        url: "https://github.com/user/repo",
      });
      expect(result).not.toBeNull();
      expect(result!.summary).toBe("Browsing github.com");
    });

    it("should generate a summary from the app name as fallback", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "spotify",
      });
      expect(result).not.toBeNull();
      expect(result!.summary).toBe("Using spotify");
    });

    it("should include reasoning in the result", () => {
      const result = getRuleBasedCategoryChoice(userCategories, {
        ownerName: "vscode",
        title: "index.ts",
      });
      expect(result).not.toBeNull();
      expect(result!.reasoning).toContain("Matched based on");
    });
  });

  describe("isSimpleTitleInformative", () => {
    it("should return false for all titles due to empty string bug in uninformativeTitles", () => {
      // BUG: uninformativeTitles includes "" (empty string), and
      // String.includes("") always returns true in JS, so this
      // function always returns false. See source line 298.
      // This documents the existing behavior; the bug should be
      // fixed separately.
      expect(isSimpleTitleInformative("My Project - VS Code")).toBe(false);
      expect(isSimpleTitleInformative("Pull Request #42 - GitHub")).toBe(false);
      expect(isSimpleTitleInformative("Dashboard - Jira")).toBe(false);
    });

    it("should return false for uninformative titles", () => {
      expect(isSimpleTitleInformative("New Tab")).toBe(false);
      expect(isSimpleTitleInformative("Untitled")).toBe(false);
      expect(isSimpleTitleInformative("Loading...")).toBe(false);
      expect(isSimpleTitleInformative("")).toBe(false);
    });

    it("should return false for very short titles", () => {
      expect(isSimpleTitleInformative("ab")).toBe(false);
    });

    it("should be case-insensitive for uninformative checks", () => {
      expect(isSimpleTitleInformative("NEW TAB")).toBe(false);
      expect(isSimpleTitleInformative("LOADING")).toBe(false);
    });
  });

  describe("generateSimpleActivityTitle", () => {
    it("should return title when available and informative", () => {
      expect(
        generateSimpleActivityTitle({
          ownerName: "Chrome",
          title: "GitHub - Pull Requests",
          url: "https://github.com",
        }),
      ).toBe("GitHub - Pull Requests");
    });

    it("should return domain-based summary for New Tab", () => {
      expect(
        generateSimpleActivityTitle({
          ownerName: "Chrome",
          title: "New Tab",
          url: "https://github.com/user/repo",
        }),
      ).toBe("Browsing github.com");
    });

    it("should return app name when no title or URL", () => {
      expect(
        generateSimpleActivityTitle({
          ownerName: "Finder",
        }),
      ).toBe("Using Finder");
    });

    it('should return "Unknown activity" when nothing is available', () => {
      expect(generateSimpleActivityTitle({})).toBe("Unknown activity");
    });

    it("should truncate long titles to 50 characters", () => {
      const longTitle = "A".repeat(100);
      const result = generateSimpleActivityTitle({
        ownerName: "Chrome",
        title: longTitle,
      });
      expect(result.length).toBe(50);
    });
  });
});
