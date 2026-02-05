/**
 * Types for the self-driven categorization system
 * Used by both main and renderer processes
 */

// Pattern types for learned categorization patterns
export type PatternType = "app" | "domain" | "url_path" | "title_keyword";

// Source of how a pattern was created
export type PatternSource = "user_correction" | "manual" | "template";

// Source of how a rule was created
export type RuleSource = "user" | "template";

// Logic for combining multiple conditions
export type ConditionLogic = "AND" | "OR";

// Condition field types for matching
export type ConditionField =
  | "app_name"
  | "domain"
  | "url"
  | "url_path"
  | "title"
  | "browser";

// Condition operators for matching
export type ConditionOperator =
  | "equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "matches_regex"
  | "not_equals"
  | "not_contains";

/**
 * A single condition within a categorization rule
 */
export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  caseSensitive?: boolean;
}

/**
 * Learned pattern from user corrections
 * Stored in categorization_patterns table
 */
export interface CategorizationPattern {
  id: number;
  userId: string;
  patternType: PatternType;
  patternValue: string;
  categoryId: string;
  confidence: number;
  matchCount: number;
  correctionCount: number;
  source: PatternSource;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for categorization_patterns
 * Uses snake_case column names
 */
export interface CategorizationPatternRow {
  id: number;
  user_id: string;
  pattern_type: PatternType;
  pattern_value: string;
  category_id: string;
  confidence: number;
  match_count: number;
  correction_count: number;
  source: PatternSource;
  created_at: string;
  updated_at: string;
}

/**
 * User-defined or template categorization rule
 * Stored in categorization_rules table
 */
export interface CategorizationRule {
  id: number;
  userId: string;
  name: string;
  description?: string;
  categoryId: string;
  conditions: RuleCondition[];
  conditionLogic: ConditionLogic;
  priority: number;
  confidence: number;
  isEnabled: boolean;
  isSystem: boolean;
  source: RuleSource;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for categorization_rules
 * Uses snake_case column names and stores conditions as JSON string
 */
export interface CategorizationRuleRow {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  category_id: string;
  conditions: string; // JSON string of RuleCondition[]
  condition_logic: ConditionLogic;
  priority: number;
  confidence: number;
  is_enabled: number; // SQLite boolean (0 or 1)
  is_system: number; // SQLite boolean (0 or 1)
  source: RuleSource;
  match_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new categorization pattern
 */
export interface CreateCategorizationPatternInput {
  userId: string;
  patternType: PatternType;
  patternValue: string;
  categoryId: string;
  confidence?: number;
  source: PatternSource;
}

/**
 * Input for updating an existing categorization pattern
 */
export interface UpdateCategorizationPatternInput {
  id: number;
  categoryId?: string;
  confidence?: number;
  matchCount?: number;
  correctionCount?: number;
}

/**
 * Input for creating a new categorization rule
 */
export interface CreateCategorizationRuleInput {
  userId: string;
  name: string;
  description?: string;
  categoryId: string;
  conditions: RuleCondition[];
  conditionLogic?: ConditionLogic;
  priority?: number;
  confidence?: number;
  isEnabled?: boolean;
  isSystem?: boolean;
  source: RuleSource;
}

/**
 * Input for updating an existing categorization rule
 */
export interface UpdateCategorizationRuleInput {
  id: number;
  name?: string;
  description?: string;
  categoryId?: string;
  conditions?: RuleCondition[];
  conditionLogic?: ConditionLogic;
  priority?: number;
  confidence?: number;
  isEnabled?: boolean;
  matchCount?: number;
}

/**
 * Result of applying categorization rules/patterns to an activity
 */
export interface CategorizationResult {
  categoryId: string;
  confidence: number;
  source: "pattern" | "rule" | "llm" | "default";
  matchedPatternId?: number;
  matchedRuleId?: number;
  reasoning?: string;
}

/**
 * Convert a database row to a CategorizationPattern object
 */
export function rowToPattern(row: CategorizationPatternRow): CategorizationPattern {
  return {
    id: row.id,
    userId: row.user_id,
    patternType: row.pattern_type,
    patternValue: row.pattern_value,
    categoryId: row.category_id,
    confidence: row.confidence,
    matchCount: row.match_count,
    correctionCount: row.correction_count,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a database row to a CategorizationRule object
 */
export function rowToRule(row: CategorizationRuleRow): CategorizationRule {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    categoryId: row.category_id,
    conditions: JSON.parse(row.conditions) as RuleCondition[],
    conditionLogic: row.condition_logic,
    priority: row.priority,
    confidence: row.confidence,
    isEnabled: row.is_enabled === 1,
    isSystem: row.is_system === 1,
    source: row.source,
    matchCount: row.match_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a CategorizationPattern to database row format
 */
export function patternToRow(
  pattern: Omit<CategorizationPattern, "id" | "createdAt" | "updatedAt">
): Omit<CategorizationPatternRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: pattern.userId,
    pattern_type: pattern.patternType,
    pattern_value: pattern.patternValue,
    category_id: pattern.categoryId,
    confidence: pattern.confidence,
    match_count: pattern.matchCount,
    correction_count: pattern.correctionCount,
    source: pattern.source,
  };
}

/**
 * Convert a CategorizationRule to database row format
 */
export function ruleToRow(
  rule: Omit<CategorizationRule, "id" | "createdAt" | "updatedAt">
): Omit<CategorizationRuleRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: rule.userId,
    name: rule.name,
    description: rule.description ?? null,
    category_id: rule.categoryId,
    conditions: JSON.stringify(rule.conditions),
    condition_logic: rule.conditionLogic,
    priority: rule.priority,
    confidence: rule.confidence,
    is_enabled: rule.isEnabled ? 1 : 0,
    is_system: rule.isSystem ? 1 : 0,
    source: rule.source,
    match_count: rule.matchCount,
  };
}
