/**
 * Database operations for categorization rules
 * Handles CRUD operations for user-defined and template rules
 */

import { getDatabase } from "../index";
import type {
  CategorizationRule,
  CategorizationRuleRow,
  CreateCategorizationRuleInput,
  UpdateCategorizationRuleInput,
  RuleSource,
  ConditionLogic,
} from "../../../shared/categorizationTypes";
import { rowToRule } from "../../../shared/categorizationTypes";

/**
 * Whitelist of column names allowed in dynamic UPDATE SET clauses.
 * Prevents SQL injection via crafted object keys.
 */
const ALLOWED_UPDATE_COLUMNS: readonly string[] = [
  "name",
  "description",
  "category_id",
  "conditions",
  "condition_logic",
  "priority",
  "confidence",
  "is_enabled",
  "match_count",
] as const;

/**
 * Options for finding rules
 */
export interface FindRulesOptions {
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by rule source */
  source?: RuleSource;
  /** Filter by enabled status */
  isEnabled?: boolean;
  /** Filter by system status */
  isSystem?: boolean;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of results */
  limit?: number;
  /** Order by field (default: priority DESC) */
  orderBy?:
    | "priority"
    | "confidence"
    | "match_count"
    | "created_at"
    | "updated_at";
  /** Order direction (default: DESC) */
  orderDirection?: "ASC" | "DESC";
}

/**
 * Create a new categorization rule
 */
export function createRule(
  input: CreateCategorizationRuleInput,
): CategorizationRule {
  const db = getDatabase();
  const now = new Date().toISOString();

  const conditionLogic = input.conditionLogic ?? "AND";
  const priority = input.priority ?? 0;
  const confidence = input.confidence ?? 1.0;
  const isEnabled = input.isEnabled ?? true;
  const isSystem = input.isSystem ?? false;

  const stmt = db.prepare(`
    INSERT INTO categorization_rules (
      user_id, name, description, category_id,
      conditions, condition_logic, priority, confidence,
      is_enabled, is_system, source, match_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.userId,
    input.name,
    input.description ?? null,
    input.categoryId,
    JSON.stringify(input.conditions),
    conditionLogic,
    priority,
    confidence,
    isEnabled ? 1 : 0,
    isSystem ? 1 : 0,
    input.source,
    0, // match_count
    now,
    now,
  );

  return {
    id: result.lastInsertRowid as number,
    userId: input.userId,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    conditions: input.conditions,
    conditionLogic,
    priority,
    confidence,
    isEnabled,
    isSystem,
    source: input.source,
    matchCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create multiple rules in a single transaction
 */
export function createRulesBatch(
  inputs: CreateCategorizationRuleInput[],
): CategorizationRule[] {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO categorization_rules (
      user_id, name, description, category_id,
      conditions, condition_logic, priority, confidence,
      is_enabled, is_system, source, match_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results: CategorizationRule[] = [];

  const transaction = db.transaction(() => {
    for (const input of inputs) {
      const conditionLogic = input.conditionLogic ?? "AND";
      const priority = input.priority ?? 0;
      const confidence = input.confidence ?? 1.0;
      const isEnabled = input.isEnabled ?? true;
      const isSystem = input.isSystem ?? false;

      const result = stmt.run(
        input.userId,
        input.name,
        input.description ?? null,
        input.categoryId,
        JSON.stringify(input.conditions),
        conditionLogic,
        priority,
        confidence,
        isEnabled ? 1 : 0,
        isSystem ? 1 : 0,
        input.source,
        0,
        now,
        now,
      );

      results.push({
        id: result.lastInsertRowid as number,
        userId: input.userId,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        conditions: input.conditions,
        conditionLogic,
        priority,
        confidence,
        isEnabled,
        isSystem,
        source: input.source,
        matchCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  transaction();
  return results;
}

/**
 * Update an existing categorization rule
 */
export function updateRule(
  id: number,
  updates: Partial<Omit<UpdateCategorizationRuleInput, "id">>,
): CategorizationRule | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  // Map camelCase to snake_case
  const fieldMapping: Record<string, string> = {
    name: "name",
    description: "description",
    categoryId: "category_id",
    conditions: "conditions",
    conditionLogic: "condition_logic",
    priority: "priority",
    confidence: "confidence",
    isEnabled: "is_enabled",
    matchCount: "match_count",
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const columnName = fieldMapping[key];
      if (!columnName || !ALLOWED_UPDATE_COLUMNS.includes(columnName)) {
        console.warn(
          `[categorizationRules] Rejected invalid column name in update: "${key}"`,
        );
        return;
      }

      fields.push(`${columnName} = ?`);

      // Handle special cases
      if (key === "conditions") {
        values.push(JSON.stringify(value));
      } else if (key === "isEnabled") {
        values.push(value ? 1 : 0);
      } else {
        values.push(value as string | number | null);
      }
    }
  });

  if (fields.length === 0) {
    return findRuleById(id);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE categorization_rules
    SET ${fields.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...values);

  return findRuleById(id);
}

/**
 * Find a rule by ID
 */
export function findRuleById(id: number): CategorizationRule | undefined {
  const db = getDatabase();

  const row = db
    .prepare("SELECT * FROM categorization_rules WHERE id = ?")
    .get(id) as CategorizationRuleRow | undefined;

  return row ? rowToRule(row) : undefined;
}

/**
 * Find rules for a user with optional filters
 */
export function findRules(
  userId: string,
  options: FindRulesOptions = {},
): CategorizationRule[] {
  const db = getDatabase();

  const {
    categoryId,
    source,
    isEnabled,
    isSystem,
    minConfidence,
    limit,
    orderBy = "priority",
    orderDirection = "DESC",
  } = options;

  let query = "SELECT * FROM categorization_rules WHERE user_id = ?";
  const params: (string | number)[] = [userId];

  if (categoryId) {
    query += " AND category_id = ?";
    params.push(categoryId);
  }

  if (source) {
    query += " AND source = ?";
    params.push(source);
  }

  if (isEnabled !== undefined) {
    query += " AND is_enabled = ?";
    params.push(isEnabled ? 1 : 0);
  }

  if (isSystem !== undefined) {
    query += " AND is_system = ?";
    params.push(isSystem ? 1 : 0);
  }

  if (minConfidence !== undefined) {
    query += " AND confidence >= ?";
    params.push(minConfidence);
  }

  // Map orderBy to snake_case
  const orderByColumn = {
    priority: "priority",
    confidence: "confidence",
    match_count: "match_count",
    created_at: "created_at",
    updated_at: "updated_at",
  }[orderBy];

  query += ` ORDER BY ${orderByColumn} ${orderDirection}`;

  if (limit !== undefined && limit > 0) {
    query += " LIMIT ?";
    params.push(limit);
  }

  const rows = db.prepare(query).all(...params) as CategorizationRuleRow[];

  return rows.map(rowToRule);
}

/**
 * Find rules by source for a user
 */
export function findRulesBySource(
  userId: string,
  source: RuleSource,
): CategorizationRule[] {
  return findRules(userId, { source });
}

/**
 * Delete a rule by ID
 */
export function deleteRule(id: number): boolean {
  const db = getDatabase();

  const result = db
    .prepare("DELETE FROM categorization_rules WHERE id = ?")
    .run(id);

  return result.changes > 0;
}

/**
 * Delete all rules for a user
 */
export function deleteAllRulesForUser(userId: string): number {
  const db = getDatabase();

  const result = db
    .prepare("DELETE FROM categorization_rules WHERE user_id = ?")
    .run(userId);

  return result.changes;
}

/**
 * Delete all template rules for a user (keeps user-created rules)
 */
export function deleteTemplateRulesForUser(userId: string): number {
  const db = getDatabase();

  const result = db
    .prepare(
      "DELETE FROM categorization_rules WHERE user_id = ? AND source = 'template'",
    )
    .run(userId);

  return result.changes;
}

/**
 * Increment the match count for a rule
 */
export function incrementMatchCount(id: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE categorization_rules
    SET match_count = match_count + 1, updated_at = ?
    WHERE id = ?
  `,
  ).run(now, id);
}

/**
 * Enable or disable a rule
 */
export function setRuleEnabled(id: number, enabled: boolean): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE categorization_rules
    SET is_enabled = ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(enabled ? 1 : 0, now, id);
}

/**
 * Get rule statistics for a user
 */
export interface RuleStats {
  totalRules: number;
  enabledRules: number;
  rulesBySource: Record<RuleSource, number>;
  averageConfidence: number;
  totalMatches: number;
}

export function getRuleStats(userId: string): RuleStats {
  const db = getDatabase();

  // Get total and enabled counts
  const countResult = db
    .prepare(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled
      FROM categorization_rules
      WHERE user_id = ?
    `,
    )
    .get(userId) as { total: number; enabled: number };

  // Get counts by source
  const sourceResults = db
    .prepare(
      `
      SELECT source, COUNT(*) as count
      FROM categorization_rules
      WHERE user_id = ?
      GROUP BY source
    `,
    )
    .all(userId) as Array<{ source: RuleSource; count: number }>;

  // Get average confidence and total matches
  const avgResult = db
    .prepare(
      `
      SELECT AVG(confidence) as avg_confidence, SUM(match_count) as total_matches
      FROM categorization_rules
      WHERE user_id = ?
    `,
    )
    .get(userId) as {
    avg_confidence: number | null;
    total_matches: number | null;
  };

  // Build rulesBySource with all sources defaulting to 0
  const rulesBySource: Record<RuleSource, number> = {
    user: 0,
    template: 0,
  };
  sourceResults.forEach((r) => {
    rulesBySource[r.source] = r.count;
  });

  return {
    totalRules: countResult.total,
    enabledRules: countResult.enabled,
    rulesBySource,
    averageConfidence: avgResult.avg_confidence ?? 0,
    totalMatches: avgResult.total_matches ?? 0,
  };
}

/**
 * Check if a user has any template rules
 */
export function hasTemplateRules(userId: string): boolean {
  const db = getDatabase();

  const result = db
    .prepare(
      "SELECT COUNT(*) as count FROM categorization_rules WHERE user_id = ? AND source = 'template'",
    )
    .get(userId) as { count: number };

  return result.count > 0;
}
