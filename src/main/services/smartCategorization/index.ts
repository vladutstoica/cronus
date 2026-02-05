/**
 * Smart Categorization Module
 * Exports the rule engine and related types
 */

export { RuleEngine, getRuleEngine, resetRuleEngine } from "./ruleEngine";

export type {
  ActivityForMatching,
  ConditionEvaluationResult,
  RuleEvaluationResult,
  RuleMatch,
  RuleEvaluationOptions,
  RegexCacheEntry,
  RuleEngineStats,
  CategorizationRule,
  RuleCondition,
  ConditionField,
  ConditionOperator,
  ConditionLogic,
} from "./types";

export {
  FIELD_TO_ACTIVITY_PROPERTY,
  NEGATION_OPERATORS,
  REGEX_OPERATORS,
  isNegationOperator,
  isRegexOperator,
} from "./types";
