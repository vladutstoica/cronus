/**
 * Tests for category templates
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  getAvailableTemplates,
  getTemplateById,
  applyTemplate,
  hasAppliedTemplate,
  type CategoryTemplate,
} from "../templates";

// Mock the database services
vi.mock("../../../database/services/categories", () => ({
  createCategory: vi.fn((category) => ({
    ...category,
    id: `cat-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  getCategoriesByUserId: vi.fn(() => []),
}));

vi.mock("../../../database/services/categorizationRules", () => ({
  createRulesBatch: vi.fn((inputs) =>
    inputs.map((input: Record<string, unknown>, index: number) => ({
      ...input,
      id: index + 1,
      matchCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  ),
  deleteTemplateRulesForUser: vi.fn(() => 0),
  hasTemplateRules: vi.fn(() => false),
}));

import {
  createCategory,
  getCategoriesByUserId,
} from "../../../database/services/categories";
import {
  createRulesBatch,
  deleteTemplateRulesForUser,
  hasTemplateRules,
} from "../../../database/services/categorizationRules";

describe("Category Templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableTemplates", () => {
    it("should return all 5 templates", () => {
      const templates = getAvailableTemplates();

      expect(templates).toHaveLength(5);
      expect(templates.map((t) => t.id)).toEqual([
        "developer",
        "designer",
        "manager",
        "writer",
        "simple",
      ]);
    });

    it("should include template metadata", () => {
      const templates = getAvailableTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("targetAudience");
        expect(template).toHaveProperty("categoryCount");
        expect(template).toHaveProperty("ruleCount");
        expect(template.categoryCount).toBeGreaterThan(0);
        expect(template.ruleCount).toBeGreaterThan(0);
      });
    });

    it("should have 50+ rules for professional templates", () => {
      const templates = getAvailableTemplates();

      const professionalTemplates = templates.filter((t) => t.id !== "simple");

      professionalTemplates.forEach((template) => {
        expect(template.ruleCount).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe("getTemplateById", () => {
    it("should return developer template", () => {
      const template = getTemplateById("developer");

      expect(template).toBeDefined();
      expect(template?.name).toBe("Developer");
      expect(template?.categories).toHaveLength(8);
    });

    it("should return designer template", () => {
      const template = getTemplateById("designer");

      expect(template).toBeDefined();
      expect(template?.name).toBe("Designer");
      expect(template?.categories).toHaveLength(7);
    });

    it("should return manager template", () => {
      const template = getTemplateById("manager");

      expect(template).toBeDefined();
      expect(template?.name).toBe("Manager");
      expect(template?.categories).toHaveLength(7);
    });

    it("should return writer template", () => {
      const template = getTemplateById("writer");

      expect(template).toBeDefined();
      expect(template?.name).toBe("Writer");
      expect(template?.categories).toHaveLength(7);
    });

    it("should return simple template", () => {
      const template = getTemplateById("simple");

      expect(template).toBeDefined();
      expect(template?.name).toBe("Simple");
      expect(template?.categories).toHaveLength(2);
    });

    it("should return undefined for unknown template", () => {
      const template = getTemplateById("unknown");

      expect(template).toBeUndefined();
    });
  });

  describe("Template Structure", () => {
    const templateIds = [
      "developer",
      "designer",
      "manager",
      "writer",
      "simple",
    ];

    templateIds.forEach((templateId) => {
      describe(`${templateId} template`, () => {
        let template: CategoryTemplate;

        beforeAll(() => {
          template = getTemplateById(templateId)!;
        });

        it("should have valid category definitions", () => {
          template.categories.forEach((category) => {
            expect(category.name).toBeTruthy();
            expect(category.description).toBeTruthy();
            expect([-1, 0, 1]).toContain(category.productivityScore);
            expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          });
        });

        it("should have a Distraction category", () => {
          const hasDistraction = template.categories.some(
            (c) => c.name === "Distraction",
          );
          expect(hasDistraction).toBe(true);
        });

        it("should have valid rule definitions", () => {
          template.rules.forEach((rule) => {
            expect(rule.name).toBeTruthy();
            expect(rule.categoryName).toBeTruthy();
            expect(rule.conditions).toBeDefined();
            expect(rule.conditions.length).toBeGreaterThan(0);

            // Verify each condition has required fields
            rule.conditions.forEach((condition) => {
              expect(condition.field).toBeTruthy();
              expect(condition.operator).toBeTruthy();
              expect(condition.value).toBeDefined();
            });

            // Verify category exists in template
            const categoryNames = template.categories.map((c) => c.name);
            expect(categoryNames).toContain(rule.categoryName);
          });
        });

        it("should have distraction rules", () => {
          const distractionRules = template.rules.filter(
            (r) => r.categoryName === "Distraction",
          );
          expect(distractionRules.length).toBeGreaterThan(10);
        });
      });
    });
  });

  describe("applyTemplate", () => {
    const mockUserId = "user-123";

    it("should apply developer template successfully", () => {
      const result = applyTemplate(mockUserId, "developer");

      expect(result.success).toBe(true);
      expect(result.categoriesCreated).toBe(8);
      expect(result.rulesCreated).toBeGreaterThan(50);
      expect(result.error).toBeUndefined();
    });

    it("should apply simple template successfully", () => {
      const result = applyTemplate(mockUserId, "simple");

      expect(result.success).toBe(true);
      expect(result.categoriesCreated).toBe(2);
      expect(result.rulesCreated).toBeGreaterThan(10);
    });

    it("should return error for unknown template", () => {
      const result = applyTemplate(mockUserId, "unknown");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should delete existing template rules when replaceExisting is true", () => {
      vi.mocked(hasTemplateRules).mockReturnValueOnce(true);

      applyTemplate(mockUserId, "developer", { replaceExisting: true });

      expect(deleteTemplateRulesForUser).toHaveBeenCalledWith(mockUserId);
    });

    it("should not delete existing template rules when replaceExisting is false", () => {
      applyTemplate(mockUserId, "developer", { replaceExisting: false });

      expect(deleteTemplateRulesForUser).not.toHaveBeenCalled();
    });

    it("should use existing categories when they exist", () => {
      const existingCategory = {
        id: "existing-cat-1",
        name: "Coding",
        user_id: mockUserId,
      };

      vi.mocked(getCategoriesByUserId).mockReturnValueOnce([
        existingCategory,
      ] as never);

      const result = applyTemplate(mockUserId, "developer", {
        keepExistingCategories: true,
      });

      expect(result.success).toBe(true);
      // Should create 7 categories (8 - 1 existing)
      expect(result.categoriesCreated).toBe(7);
    });

    it("should call createCategory for each template category", () => {
      applyTemplate(mockUserId, "simple");

      expect(createCategory).toHaveBeenCalledTimes(2);
    });

    it("should call createRulesBatch with all rules", () => {
      const template = getTemplateById("simple")!;

      applyTemplate(mockUserId, "simple");

      expect(createRulesBatch).toHaveBeenCalledTimes(1);
      const calledWithRules = vi.mocked(createRulesBatch).mock.calls[0][0];
      expect(calledWithRules.length).toBe(template.rules.length);
    });
  });

  describe("hasAppliedTemplate", () => {
    it("should return false when no template rules exist", () => {
      vi.mocked(hasTemplateRules).mockReturnValueOnce(false);

      const result = hasAppliedTemplate("user-123");

      expect(result).toBe(false);
    });

    it("should return true when template rules exist", () => {
      vi.mocked(hasTemplateRules).mockReturnValueOnce(true);

      const result = hasAppliedTemplate("user-123");

      expect(result).toBe(true);
    });
  });

  describe("Rule Coverage", () => {
    describe("Developer template", () => {
      let template: CategoryTemplate;

      beforeAll(() => {
        template = getTemplateById("developer")!;
      });

      it("should include VS Code rule", () => {
        const vsCodeRule = template.rules.find((r) => r.name === "VS Code");
        expect(vsCodeRule).toBeDefined();
        expect(vsCodeRule?.categoryName).toBe("Coding");
      });

      it("should include GitHub PR rule", () => {
        const ghPrRule = template.rules.find((r) => r.name === "GitHub PR");
        expect(ghPrRule).toBeDefined();
        expect(ghPrRule?.categoryName).toBe("Code Review");
      });

      it("should include AWS Console rule", () => {
        const awsRule = template.rules.find((r) => r.name === "AWS Console");
        expect(awsRule).toBeDefined();
        expect(awsRule?.categoryName).toBe("DevOps");
      });

      it("should include Slack rule", () => {
        const slackRule = template.rules.find((r) => r.name === "Slack");
        expect(slackRule).toBeDefined();
        expect(slackRule?.categoryName).toBe("Communication");
      });

      it("should include Zoom rule", () => {
        const zoomRule = template.rules.find((r) => r.name === "Zoom");
        expect(zoomRule).toBeDefined();
        expect(zoomRule?.categoryName).toBe("Meetings");
      });
    });

    describe("Designer template", () => {
      let template: CategoryTemplate;

      beforeAll(() => {
        template = getTemplateById("designer")!;
      });

      it("should include Figma rule", () => {
        const figmaRule = template.rules.find((r) => r.name === "Figma App");
        expect(figmaRule).toBeDefined();
        expect(figmaRule?.categoryName).toBe("Design");
      });

      it("should include Framer rule", () => {
        const framerRule = template.rules.find((r) => r.name === "Framer");
        expect(framerRule).toBeDefined();
        expect(framerRule?.categoryName).toBe("Prototyping");
      });

      it("should include Dribbble rule", () => {
        const dribbbleRule = template.rules.find((r) => r.name === "Dribbble");
        expect(dribbbleRule).toBeDefined();
        expect(dribbbleRule?.categoryName).toBe("Research");
      });
    });

    describe("Manager template", () => {
      let template: CategoryTemplate;

      beforeAll(() => {
        template = getTemplateById("manager")!;
      });

      it("should include Asana rule", () => {
        const asanaRule = template.rules.find((r) => r.name === "Asana");
        expect(asanaRule).toBeDefined();
        expect(asanaRule?.categoryName).toBe("Planning");
      });

      it("should include Google Calendar rule", () => {
        const calendarRule = template.rules.find(
          (r) => r.name === "Google Calendar",
        );
        expect(calendarRule).toBeDefined();
        expect(calendarRule?.categoryName).toBe("Meetings");
      });

      it("should include BambooHR rule", () => {
        const bambooRule = template.rules.find((r) => r.name === "BambooHR");
        expect(bambooRule).toBeDefined();
        expect(bambooRule?.categoryName).toBe("HR/Admin");
      });
    });

    describe("Writer template", () => {
      let template: CategoryTemplate;

      beforeAll(() => {
        template = getTemplateById("writer")!;
      });

      it("should include Google Docs rule", () => {
        const docsRule = template.rules.find((r) => r.name === "Google Docs");
        expect(docsRule).toBeDefined();
        expect(docsRule?.categoryName).toBe("Writing");
      });

      it("should include Grammarly rule", () => {
        const grammarlyRule = template.rules.find(
          (r) => r.name === "Grammarly",
        );
        expect(grammarlyRule).toBeDefined();
        expect(grammarlyRule?.categoryName).toBe("Editing");
      });

      it("should include WordPress rule", () => {
        const wpRule = template.rules.find((r) => r.name === "WordPress");
        expect(wpRule).toBeDefined();
        expect(wpRule?.categoryName).toBe("Publishing");
      });

      it("should include Google Analytics rule", () => {
        const analyticsRule = template.rules.find(
          (r) => r.name === "Google Analytics",
        );
        expect(analyticsRule).toBeDefined();
        expect(analyticsRule?.categoryName).toBe("Analytics");
      });
    });

    describe("Distraction rules (shared)", () => {
      it("should include social media distractions in all templates", () => {
        const templateIds = ["developer", "designer", "manager", "writer"];
        const socialMedia = ["Facebook", "Instagram", "Twitter/X", "TikTok"];

        templateIds.forEach((templateId) => {
          const template = getTemplateById(templateId)!;

          socialMedia.forEach((platform) => {
            const rule = template.rules.find((r) => r.name === platform);
            expect(rule).toBeDefined();
            expect(rule?.categoryName).toBe("Distraction");
          });
        });
      });

      it("should include streaming distractions", () => {
        const template = getTemplateById("developer")!;
        const streamingServices = ["Netflix", "YouTube", "Twitch"];

        streamingServices.forEach((service) => {
          const rule = template.rules.find((r) => r.name === service);
          expect(rule).toBeDefined();
          expect(rule?.categoryName).toBe("Distraction");
        });
      });

      it("should include gaming distractions", () => {
        const template = getTemplateById("developer")!;
        const gamingApps = ["Steam", "Epic Games"];

        gamingApps.forEach((app) => {
          const rule = template.rules.find((r) => r.name === app);
          expect(rule).toBeDefined();
          expect(rule?.categoryName).toBe("Distraction");
        });
      });
    });
  });
});
