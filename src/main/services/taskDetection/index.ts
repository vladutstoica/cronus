/**
 * Task Detection Module
 * Exports the task detection engine and related types
 */

export {
  TaskDetectionEngine,
  getTaskDetectionEngine,
  resetTaskDetectionEngine,
  extractTaskId,
  extractAllTaskIds,
  inferProviderFromProjectKey,
} from "./taskDetectionEngine";

export type {
  DetectionResult,
  TaskDetectionResult,
  ActivityForTaskDetection,
  GitBranchCache,
  GitDetectionOptions,
  UrlPattern,
  WindowTitlePattern,
  CustomRuleMatch,
  ActiveTaskSession,
  TaskDetectionEngineStats,
  DetectionMethod,
  TaskProvider,
  TaskDetectionRule,
  TaskDetectionRuleType,
  ExternalTask,
} from "./types";

export {
  AUTO_ASSOCIATE_THRESHOLD,
  SUGGEST_THRESHOLD,
  GIT_CACHE_TTL_MS,
  DEFAULT_CONFIDENCE,
  NATIVE_APP_CONFIDENCE_BOOST,
  CUSTOM_RULE_CONFIDENCE,
  RECENT_HEURISTIC_CONFIDENCE,
} from "./types";
