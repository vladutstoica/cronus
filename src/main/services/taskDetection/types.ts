/**
 * Types for the task detection engine
 * Used by the main process for detecting which task a user is working on
 */

import type {
  DetectionMethod,
  TaskProvider,
  TaskDetectionRule,
  ExternalTask,
} from "../../../shared/taskTypes";

// ============================================================================
// Detection Results
// ============================================================================

/**
 * Result from a single detection strategy
 */
export interface DetectionResult {
  /** The detection method that produced this result */
  method: DetectionMethod;
  /** Extracted task identifier (e.g., "VIB-123", "PROJ-456") */
  taskId: string;
  /** Confidence score between 0 and 1 */
  confidence: number;
  /** The provider if determinable from the detection (jira or linear) */
  provider?: TaskProvider;
  /** Project key extracted from the task ID (e.g., "VIB", "PROJ") */
  projectKey?: string;
  /** Source data that led to this detection */
  source: string;
  /** Additional context about the detection */
  details?: string;
}

/**
 * Combined detection result from multiple strategies
 */
export interface TaskDetectionResult {
  /** The detected task ID (highest confidence) */
  taskId: string | null;
  /** The detected provider */
  provider?: TaskProvider;
  /** The project key */
  projectKey?: string;
  /** The highest confidence score */
  confidence: number;
  /** The detection method with highest confidence */
  method: DetectionMethod | null;
  /** Whether to auto-associate (confidence >= 0.8) */
  shouldAutoAssociate: boolean;
  /** Whether to suggest association (0.5 <= confidence < 0.8) */
  shouldSuggest: boolean;
  /** All detection results from different strategies */
  allResults: DetectionResult[];
  /** The matched external task if found in database */
  matchedTask?: ExternalTask;
}

// ============================================================================
// Activity Input
// ============================================================================

/**
 * Activity data for task detection
 * Minimal subset needed for detection
 */
export interface ActivityForTaskDetection {
  /** Application name (e.g., "Chrome", "VS Code", "Linear") */
  appName: string;
  /** Full URL if browser/web activity */
  url?: string | null;
  /** Window title */
  title?: string | null;
}

// ============================================================================
// Git Branch Detection
// ============================================================================

/**
 * Cached git branch information
 */
export interface GitBranchCache {
  /** The cached branch name */
  branch: string | null;
  /** Working directory the branch was fetched from */
  cwd: string;
  /** Timestamp when cached */
  cachedAt: number;
}

/**
 * Git branch detection options
 */
export interface GitDetectionOptions {
  /** Working directory to check git branch from */
  cwd?: string;
  /** Force refresh even if cached */
  forceRefresh?: boolean;
}

// ============================================================================
// URL Pattern Detection
// ============================================================================

/**
 * URL pattern configuration for task providers
 */
export interface UrlPattern {
  /** Provider this pattern matches */
  provider: TaskProvider;
  /** Regex pattern to match the URL */
  pattern: RegExp;
  /** Named capture group for the task ID */
  taskIdGroup: string;
  /** Named capture group for the project key (optional) */
  projectKeyGroup?: string;
}

// ============================================================================
// Window Title Detection
// ============================================================================

/**
 * Window title pattern configuration
 */
export interface WindowTitlePattern {
  /** Provider this pattern matches */
  provider: TaskProvider;
  /** App names that indicate native app (higher confidence) */
  nativeApps: string[];
  /** Regex pattern to extract task ID from title */
  pattern: RegExp;
}

// ============================================================================
// Custom Rule Detection
// ============================================================================

/**
 * Custom rule match result
 */
export interface CustomRuleMatch {
  /** The matched rule */
  rule: TaskDetectionRule;
  /** The extracted task ID */
  taskId: string;
  /** The project key if available */
  projectKey?: string;
}

// ============================================================================
// Session State
// ============================================================================

/**
 * Active task session state
 */
export interface ActiveTaskSession {
  /** The task ID of the active session */
  taskId: string;
  /** The external task ID in database */
  externalTaskId?: number;
  /** When the session started */
  startedAt: number;
  /** The provider */
  provider?: TaskProvider;
}

// ============================================================================
// Engine Statistics
// ============================================================================

/**
 * Statistics about the task detection engine
 */
export interface TaskDetectionEngineStats {
  /** Total detections performed */
  totalDetections: number;
  /** Detections by method */
  detectionsByMethod: Record<DetectionMethod, number>;
  /** Cache hits for git branch */
  gitCacheHits: number;
  /** Cache misses for git branch */
  gitCacheMisses: number;
  /** Auto-associations made */
  autoAssociations: number;
  /** Suggestions made */
  suggestions: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Confidence threshold for auto-association */
export const AUTO_ASSOCIATE_THRESHOLD = 0.8;

/** Confidence threshold for suggestion */
export const SUGGEST_THRESHOLD = 0.5;

/** Git branch cache TTL in milliseconds (30 seconds) */
export const GIT_CACHE_TTL_MS = 30 * 1000;

/** Default confidence scores by detection method */
export const DEFAULT_CONFIDENCE: Record<DetectionMethod, number> = {
  active_session: 1.0,
  git_branch: 0.95,
  url_pattern: 0.95,
  window_title: 0.7, // Base, can be boosted for native apps
  manual: 1.0,
};

/** Confidence boost for native app window title detection */
export const NATIVE_APP_CONFIDENCE_BOOST = 0.2;

/** Custom rule confidence score */
export const CUSTOM_RULE_CONFIDENCE = 0.85;

/** Recent heuristic confidence score */
export const RECENT_HEURISTIC_CONFIDENCE = 0.5;

// ============================================================================
// Re-exports
// ============================================================================

export type {
  DetectionMethod,
  TaskProvider,
  TaskDetectionRule,
  TaskDetectionRuleType,
  ExternalTask,
} from "../../../shared/taskTypes";
