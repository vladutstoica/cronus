import { describe, it, expect } from "vitest";
import { snakeToCamel } from "../utils/snakeToCamel";

describe("snakeToCamel", () => {
  it("should convert snake_case keys to camelCase", () => {
    const input = { user_id: "123", created_at: "now", first_name: "John" };
    const result = snakeToCamel(input);
    expect(result).toEqual({
      userId: "123",
      createdAt: "now",
      firstName: "John",
    });
  });

  it("should not change already camelCase keys", () => {
    const input = { userId: "123", createdAt: "now" };
    const result = snakeToCamel(input);
    expect(result).toEqual({ userId: "123", createdAt: "now" });
  });

  it("should handle keys with no underscores", () => {
    const input = { id: "123", name: "Test" };
    const result = snakeToCamel(input);
    expect(result).toEqual({ id: "123", name: "Test" });
  });

  it("should handle multiple underscores", () => {
    const input = { old_category_id: "cat-1", last_categorization_at: "now" };
    const result = snakeToCamel(input);
    expect(result).toEqual({
      oldCategoryId: "cat-1",
      lastCategorizationAt: "now",
    });
  });

  it("should preserve null and undefined values", () => {
    const input = { user_id: null, created_at: undefined };
    const result = snakeToCamel(input);
    expect(result).toEqual({ userId: null, createdAt: undefined });
  });

  it("should handle empty object", () => {
    const result = snakeToCamel({});
    expect(result).toEqual({});
  });

  it("should preserve nested objects without converting their keys", () => {
    const input = { user_data: { nested_key: "value" } };
    const result = snakeToCamel(input);
    expect(result.userData).toEqual({ nested_key: "value" });
  });
});
