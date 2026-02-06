/**
 * Types for the smart categorization rule engine
 * Used by the main process for evaluating rules against activities
 */

import type {
  CategorizationRule,
  RuleCondition,
  ConditionField,
  ConditionOperator,
} from "../../../shared/categorizationTypes";

/**
 * Activity data structure for rule matching
 * Represents the activity being evaluated
 */
export interface ActivityForMatching {
  /** Application name (e.g., "Chrome", "VS Code") */
  appName: string;
  /** Full URL if browser activity, null otherwise */
  url: string | null;
  /** Window title */
  title: string;
  /** Extracted text content from the activity */
  content: string | null;
  /** Browser type if applicable (e.g., "chrome", "firefox", "safari") */
  browserType: string | null;
}

/**
 * Result of evaluating a single condition
 */
export interface ConditionEvaluationResult {
  /** Whether the condition matched */
  matched: boolean;
  /** The condition that was evaluated */
  condition: RuleCondition;
  /** The actual value that was tested */
  testedValue: string | null;
  /** Details about the match (for debugging/logging) */
  matchDetails?: string;
}

/**
 * Result of evaluating all conditions for a rule
 */
export interface RuleEvaluationResult {
  /** Whether the rule matched overall */
  matched: boolean;
  /** Results for each condition */
  conditionResults: ConditionEvaluationResult[];
  /** Number of conditions that matched */
  matchedConditionCount: number;
  /** Total number of conditions */
  totalConditionCount: number;
}

/**
 * A rule match with its calculated confidence score
 */
export interface RuleMatch {
  /** The matched rule */
  rule: CategorizationRule;
  /** Calculated confidence score (0-1) */
  score: number;
  /** Detailed evaluation result */
  evaluationResult: RuleEvaluationResult;
  /** Why this rule matched (human-readable) */
  reasoning: string;
}

/**
 * Options for rule evaluation
 */
export interface RuleEvaluationOptions {
  /** Maximum number of rules to return (default: all matching) */
  maxResults?: number;
  /** Minimum confidence threshold (default: 0) */
  minConfidence?: number;
  /** Whether to include disabled rules (default: false) */
  includeDisabled?: boolean;
}

/**
 * Cache entry for compiled regex patterns
 */
export interface RegexCacheEntry {
  /** The compiled regex */
  regex: RegExp;
  /** When this entry was created */
  createdAt: number;
  /** Number of times this regex was used */
  useCount: number;
}

/**
 * Statistics about the rule engine
 */
export interface RuleEngineStats {
  /** Number of rules loaded */
  rulesLoaded: number;
  /** Number of cached regex patterns */
  cachedRegexPatterns: number;
  /** Total evaluations performed */
  totalEvaluations: number;
  /** Cache hit rate for regex */
  regexCacheHitRate: number;
}

/**
 * Map of condition field to the activity property it matches against
 */
export const FIELD_TO_ACTIVITY_PROPERTY: Record<
  ConditionField,
  keyof ActivityForMatching
> = {
  app_name: "appName",
  domain: "url", // Will extract domain from URL
  url: "url",
  url_path: "url", // Will extract path from URL
  title: "title",
  browser: "browserType",
} as const;

/**
 * Operators that support negation
 */
export const NEGATION_OPERATORS: readonly ConditionOperator[] = [
  "not_equals",
  "not_contains",
] as const;

/**
 * Operators that use regex
 */
export const REGEX_OPERATORS: readonly ConditionOperator[] = [
  "matches_regex",
] as const;

/**
 * Type guard to check if an operator is a negation operator
 */
export function isNegationOperator(
  operator: ConditionOperator,
): operator is "not_equals" | "not_contains" {
  return NEGATION_OPERATORS.includes(operator);
}

/**
 * Type guard to check if an operator is a regex operator
 */
export function isRegexOperator(
  operator: ConditionOperator,
): operator is "matches_regex" {
  return REGEX_OPERATORS.includes(operator);
}

/**
 * Re-export types from shared for convenience
 */
export type {
  CategorizationRule,
  RuleCondition,
  ConditionField,
  ConditionOperator,
  ConditionLogic,
  CategorizationRuleRow,
} from "../../../shared/categorizationTypes";
