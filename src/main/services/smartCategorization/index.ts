/**
 * Smart Categorization Module
 * Exports the rule engine, pattern learner, templates, and related types
 */

export { RuleEngine, getRuleEngine, resetRuleEngine } from "./ruleEngine";

export {
  PatternLearner,
  getPatternLearner,
  clearPatternLearnerCache,
} from "./patternLearner";

export {
  getAvailableTemplates,
  getTemplateById,
  applyTemplate,
  hasAppliedTemplate,
} from "./templates";

export type {
  ExtractedPattern,
  PatternMatch,
  CategorySuggestion,
} from "./patternLearner";

export type {
  TemplateCategory,
  TemplateRule,
  CategoryTemplate,
  ApplyTemplateResult,
} from "./templates";

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
