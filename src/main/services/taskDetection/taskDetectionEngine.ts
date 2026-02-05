/**
 * Task Detection Engine
 * Automatically detects which task a user is working on based on various signals
 */

import { execSync } from "child_process";
import type {
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
  TaskProvider,
  TaskDetectionRule,
} from "./types";
import {
  AUTO_ASSOCIATE_THRESHOLD,
  SUGGEST_THRESHOLD,
  GIT_CACHE_TTL_MS,
  DEFAULT_CONFIDENCE,
  NATIVE_APP_CONFIDENCE_BOOST,
  CUSTOM_RULE_CONFIDENCE,
  RECENT_HEURISTIC_CONFIDENCE,
} from "./types";

// ============================================================================
// URL Patterns for Task Providers
// ============================================================================

const URL_PATTERNS: UrlPattern[] = [
  // Linear: linear.app/team/issue/VIB-50 or linear.app/issue/VIB-50
  {
    provider: "linear",
    pattern:
      /linear\.app\/(?:[^/]+\/)?issue\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
    taskIdGroup: "taskId",
    projectKeyGroup: "projectKey",
  },
  // Jira Cloud: *.atlassian.net/browse/PROJ-123
  {
    provider: "jira",
    pattern:
      /\.atlassian\.net\/browse\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
    taskIdGroup: "taskId",
    projectKeyGroup: "projectKey",
  },
  // Jira Server/DC: jira.*/browse/PROJ-123
  {
    provider: "jira",
    pattern:
      /jira[^/]*\/browse\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
    taskIdGroup: "taskId",
    projectKeyGroup: "projectKey",
  },
  // Jira with custom domain
  {
    provider: "jira",
    pattern: /\/browse\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
    taskIdGroup: "taskId",
    projectKeyGroup: "projectKey",
  },
];

// ============================================================================
// Window Title Patterns
// ============================================================================

const WINDOW_TITLE_PATTERNS: WindowTitlePattern[] = [
  {
    provider: "linear",
    nativeApps: ["Linear"],
    pattern: /(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/,
  },
  {
    provider: "jira",
    nativeApps: ["Jira"],
    pattern: /(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/,
  },
];

// ============================================================================
// Git Branch Patterns
// ============================================================================

/**
 * Patterns for extracting task IDs from git branch names
 * Listed in order of specificity
 */
const GIT_BRANCH_PATTERNS: RegExp[] = [
  // feature/VIB-123-description or fix/PROJ-456-something
  /^(?:feature|fix|bugfix|hotfix|chore|refactor|docs|test|perf|ci|style|build)\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
  // username/VIB-123-description (e.g., vladstoica/vib-123-something)
  /^[a-z][a-z0-9._-]*\/(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
  // VIB-123-description (task ID at the start)
  /^(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
  // description-VIB-123 (task ID at the end)
  /(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)$/i,
  // Task ID anywhere in the branch name
  /(?<projectKey>[A-Z][A-Z0-9]*)-(?<taskNumber>\d+)/i,
];

// ============================================================================
// Task ID Extraction
// ============================================================================

/**
 * Universal regex for extracting task IDs from any text
 * Matches both Jira (PROJ-123) and Linear (VIB-123) formats
 * Requires at least 2 characters in project key to avoid false positives
 */
const TASK_ID_PATTERN =
  /\b(?<projectKey>[A-Z][A-Z0-9]+)-(?<taskNumber>\d+)\b/gi;

/**
 * Extract a task ID from any text
 * Returns the first match found
 */
export function extractTaskId(
  text: string,
): { taskId: string; projectKey: string } | null {
  const match = TASK_ID_PATTERN.exec(text);
  // Reset lastIndex for global regex
  TASK_ID_PATTERN.lastIndex = 0;

  if (match?.groups) {
    const projectKey = match.groups.projectKey.toUpperCase();
    const taskNumber = match.groups.taskNumber;
    return {
      taskId: `${projectKey}-${taskNumber}`,
      projectKey,
    };
  }

  return null;
}

/**
 * Extract all task IDs from text
 */
export function extractAllTaskIds(
  text: string,
): Array<{ taskId: string; projectKey: string }> {
  const results: Array<{ taskId: string; projectKey: string }> = [];
  const pattern = /\b(?<projectKey>[A-Z][A-Z0-9]+)-(?<taskNumber>\d+)\b/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.groups) {
      const projectKey = match.groups.projectKey.toUpperCase();
      const taskNumber = match.groups.taskNumber;
      results.push({
        taskId: `${projectKey}-${taskNumber}`,
        projectKey,
      });
    }
  }

  return results;
}

/**
 * Infer provider from project key
 * This is a heuristic - some project keys might be used by both providers
 *
 * @param projectKey - The project key to infer provider from (e.g., "VIB", "PROJ")
 * @returns The inferred provider or undefined if unable to determine
 */
export function inferProviderFromProjectKey(
  projectKey: string,
): TaskProvider | undefined {
  // Linear commonly uses 3-letter keys like VIB, ENG, etc.
  // Jira often uses longer keys
  // This is just a heuristic and may need customization per workspace

  // Known Linear project keys (common patterns)
  // These are typically short (2-4 chars) and use uppercase letters
  const linearKeyPatterns = /^[A-Z]{2,4}$/;

  // For now, we don't infer to avoid false positives
  // A more sophisticated implementation might:
  // 1. Check against known workspace configurations
  // 2. Use the key length as a weak signal
  // 3. Check against a user-configured mapping

  // Keep projectKey reference to avoid unused variable error
  // and allow for future enhancements
  void projectKey;
  void linearKeyPatterns;

  return undefined;
}

// ============================================================================
// Task Detection Engine
// ============================================================================

/**
 * Engine for detecting which task a user is working on
 */
export class TaskDetectionEngine {
  /** Current active task session */
  private activeSession: ActiveTaskSession | null = null;

  /** Git branch cache */
  private gitBranchCache: GitBranchCache | null = null;

  /** Custom detection rules loaded from database */
  private customRules: TaskDetectionRule[] = [];

  /** User ID for loaded rules */
  private loadedUserId: string | null = null;

  /** Recently detected task (for heuristic fallback) */
  private recentTaskId: string | null = null;
  private recentTaskTimestamp: number = 0;

  /** Statistics */
  private stats: TaskDetectionEngineStats = {
    totalDetections: 0,
    detectionsByMethod: {
      active_session: 0,
      git_branch: 0,
      url_pattern: 0,
      window_title: 0,
      manual: 0,
    },
    gitCacheHits: 0,
    gitCacheMisses: 0,
    autoAssociations: 0,
    suggestions: 0,
  };

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Set an active task session (highest priority detection)
   * @param taskId - The task ID to set as active
   * @param externalTaskId - The database ID of the external task
   * @param provider - The task provider
   */
  setActiveSession(
    taskId: string,
    externalTaskId?: number,
    provider?: TaskProvider,
  ): void {
    this.activeSession = {
      taskId,
      externalTaskId,
      startedAt: Date.now(),
      provider,
    };
    console.log(`[TaskDetection] Active session set: ${taskId}`);
  }

  /**
   * Clear the active task session
   */
  clearActiveSession(): void {
    if (this.activeSession) {
      console.log(
        `[TaskDetection] Active session cleared: ${this.activeSession.taskId}`,
      );
    }
    this.activeSession = null;
  }

  /**
   * Get the current active session
   */
  getActiveSession(): ActiveTaskSession | null {
    return this.activeSession;
  }

  /**
   * Check if there is an active session
   */
  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }

  // ============================================================================
  // Main Detection Methods
  // ============================================================================

  /**
   * Main detection method - detects task from all available signals
   * @param activity - The activity to detect task from
   * @param options - Additional options like git working directory
   */
  detectTask(
    activity: ActivityForTaskDetection,
    options: GitDetectionOptions = {},
  ): TaskDetectionResult {
    this.stats.totalDetections++;

    const allResults: DetectionResult[] = [];

    // 1. Check active session first (100% confidence)
    if (this.activeSession) {
      const result = this.detectFromActiveSession();
      if (result) {
        allResults.push(result);
      }
    }

    // 2. Check git branch (95% confidence)
    const gitResult = this.detectFromGitBranch(options);
    if (gitResult) {
      allResults.push(gitResult);
    }

    // 3. Check URL pattern (95% confidence)
    if (activity.url) {
      const urlResult = this.detectFromUrl(activity.url);
      if (urlResult) {
        allResults.push(urlResult);
      }
    }

    // 4. Check window title (70-90% confidence)
    if (activity.title) {
      const titleResult = this.detectFromWindowTitle(
        activity.title,
        activity.appName,
      );
      if (titleResult) {
        allResults.push(titleResult);
      }
    }

    // 5. Check custom rules (85% confidence)
    const customResult = this.detectFromCustomRules(activity);
    if (customResult) {
      allResults.push(customResult);
    }

    // 6. Recent heuristic fallback (50% confidence)
    const recentResult = this.detectFromRecentHeuristic();
    if (recentResult) {
      allResults.push(recentResult);
    }

    // Determine best result (highest confidence)
    const bestResult = this.selectBestResult(allResults);

    // Update recent task if we found something with good confidence
    if (bestResult && bestResult.confidence >= SUGGEST_THRESHOLD) {
      this.recentTaskId = bestResult.taskId;
      this.recentTaskTimestamp = Date.now();
    }

    // Build final result
    const result = this.buildDetectionResult(bestResult, allResults);

    // Update statistics
    if (result.method) {
      this.stats.detectionsByMethod[result.method]++;
      if (result.shouldAutoAssociate) {
        this.stats.autoAssociations++;
      } else if (result.shouldSuggest) {
        this.stats.suggestions++;
      }
    }

    return result;
  }

  // ============================================================================
  // Individual Detection Strategies
  // ============================================================================

  /**
   * Detect from active session
   */
  private detectFromActiveSession(): DetectionResult | null {
    if (!this.activeSession) {
      return null;
    }

    const extracted = extractTaskId(this.activeSession.taskId);
    if (!extracted) {
      return null;
    }

    return {
      method: "active_session",
      taskId: this.activeSession.taskId,
      confidence: DEFAULT_CONFIDENCE.active_session,
      provider: this.activeSession.provider,
      projectKey: extracted.projectKey,
      source: "active_session",
      details: `Active session started at ${new Date(
        this.activeSession.startedAt,
      ).toISOString()}`,
    };
  }

  /**
   * Detect task from git branch name
   * Uses caching to avoid frequent git exec calls
   */
  detectFromGitBranch(
    options: GitDetectionOptions = {},
  ): DetectionResult | null {
    const { cwd = process.cwd(), forceRefresh = false } = options;

    // Check cache first
    if (!forceRefresh && this.gitBranchCache) {
      const cacheAge = Date.now() - this.gitBranchCache.cachedAt;
      if (cacheAge < GIT_CACHE_TTL_MS && this.gitBranchCache.cwd === cwd) {
        this.stats.gitCacheHits++;

        if (this.gitBranchCache.branch) {
          return this.extractTaskFromBranch(this.gitBranchCache.branch);
        }
        return null;
      }
    }

    this.stats.gitCacheMisses++;

    // Fetch branch from git
    const branch = this.fetchGitBranch(cwd);

    // Update cache
    this.gitBranchCache = {
      branch,
      cwd,
      cachedAt: Date.now(),
    };

    if (!branch) {
      return null;
    }

    return this.extractTaskFromBranch(branch);
  }

  /**
   * Fetch the current git branch name
   */
  private fetchGitBranch(cwd: string): string | null {
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd,
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      // Ignore detached HEAD state
      if (branch === "HEAD") {
        return null;
      }

      return branch;
    } catch {
      // Not a git repo or git not available
      return null;
    }
  }

  /**
   * Extract task ID from a branch name
   */
  private extractTaskFromBranch(branch: string): DetectionResult | null {
    for (const pattern of GIT_BRANCH_PATTERNS) {
      const match = pattern.exec(branch);
      if (match?.groups) {
        const projectKey = match.groups.projectKey.toUpperCase();
        const taskNumber = match.groups.taskNumber;
        const taskId = `${projectKey}-${taskNumber}`;

        return {
          method: "git_branch",
          taskId,
          confidence: DEFAULT_CONFIDENCE.git_branch,
          provider: inferProviderFromProjectKey(projectKey),
          projectKey,
          source: branch,
          details: `Extracted from git branch "${branch}"`,
        };
      }
    }

    return null;
  }

  /**
   * Detect task from URL pattern
   */
  detectFromUrl(url: string): DetectionResult | null {
    for (const urlPattern of URL_PATTERNS) {
      const match = urlPattern.pattern.exec(url);
      if (match?.groups) {
        const projectKey = match.groups.projectKey.toUpperCase();
        const taskNumber = match.groups.taskNumber;
        const taskId = `${projectKey}-${taskNumber}`;

        return {
          method: "url_pattern",
          taskId,
          confidence: DEFAULT_CONFIDENCE.url_pattern,
          provider: urlPattern.provider,
          projectKey,
          source: url,
          details: `Matched ${urlPattern.provider} URL pattern`,
        };
      }
    }

    return null;
  }

  /**
   * Detect task from window title
   */
  detectFromWindowTitle(
    title: string,
    appName: string,
  ): DetectionResult | null {
    const normalizedAppName = appName.toLowerCase();

    // First, try to find a pattern where the app is a native app (higher confidence)
    for (const titlePattern of WINDOW_TITLE_PATTERNS) {
      const isNativeApp = titlePattern.nativeApps.some((app) =>
        normalizedAppName.includes(app.toLowerCase()),
      );

      if (isNativeApp) {
        const match = titlePattern.pattern.exec(title);
        if (match?.groups) {
          const projectKey = match.groups.projectKey.toUpperCase();
          const taskNumber = match.groups.taskNumber;
          const taskId = `${projectKey}-${taskNumber}`;

          const confidence = Math.min(
            1,
            DEFAULT_CONFIDENCE.window_title + NATIVE_APP_CONFIDENCE_BOOST,
          );

          return {
            method: "window_title",
            taskId,
            confidence,
            provider: titlePattern.provider,
            projectKey,
            source: title,
            details: `Matched in ${appName} (native app)`,
          };
        }
      }
    }

    // If no native app match, try generic patterns
    for (const titlePattern of WINDOW_TITLE_PATTERNS) {
      const match = titlePattern.pattern.exec(title);
      if (match?.groups) {
        const projectKey = match.groups.projectKey.toUpperCase();
        const taskNumber = match.groups.taskNumber;
        const taskId = `${projectKey}-${taskNumber}`;

        return {
          method: "window_title",
          taskId,
          confidence: DEFAULT_CONFIDENCE.window_title,
          projectKey,
          source: title,
          details: `Found task ID in window title`,
        };
      }
    }

    // Generic task ID extraction as fallback
    const extracted = extractTaskId(title);
    if (extracted) {
      return {
        method: "window_title",
        taskId: extracted.taskId,
        confidence: DEFAULT_CONFIDENCE.window_title,
        projectKey: extracted.projectKey,
        source: title,
        details: "Found task ID in window title (generic pattern)",
      };
    }

    return null;
  }

  /**
   * Detect task from custom user-defined rules
   */
  detectFromCustomRules(
    activity: ActivityForTaskDetection,
  ): DetectionResult | null {
    if (this.customRules.length === 0) {
      return null;
    }

    const matchResult = this.evaluateCustomRules(activity);
    if (!matchResult) {
      return null;
    }

    return {
      method: "window_title", // Custom rules map to detection method based on rule type
      taskId: matchResult.taskId,
      confidence: CUSTOM_RULE_CONFIDENCE,
      projectKey: matchResult.projectKey,
      source: `Custom rule: ${matchResult.rule.pattern}`,
      details: `Matched custom rule ID ${matchResult.rule.id}`,
    };
  }

  /**
   * Evaluate custom rules against activity
   */
  private evaluateCustomRules(
    activity: ActivityForTaskDetection,
  ): CustomRuleMatch | null {
    // Sort rules by priority (higher first)
    const sortedRules = [...this.customRules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      if (!rule.isEnabled) continue;

      let textToMatch: string | null = null;

      switch (rule.ruleType) {
        case "git_branch_pattern":
          // Git branch rules are handled separately
          continue;

        case "window_title_pattern":
          textToMatch = activity.title ?? null;
          break;

        case "url_pattern":
          textToMatch = activity.url ?? null;
          break;
      }

      if (!textToMatch) continue;

      try {
        const regex = new RegExp(rule.pattern, "i");
        const match = regex.exec(textToMatch);

        if (match) {
          // If rule has a specific task ID, use it
          if (rule.taskId) {
            // Would need to look up task from database
            // For now, extract from the match if possible
            const extracted = extractTaskId(textToMatch);
            if (extracted) {
              return {
                rule,
                taskId: extracted.taskId,
                projectKey: extracted.projectKey,
              };
            }
          }

          // If rule has a project key, try to find task ID
          if (rule.projectKey) {
            const extracted = extractTaskId(textToMatch);
            if (extracted && extracted.projectKey === rule.projectKey) {
              return {
                rule,
                taskId: extracted.taskId,
                projectKey: extracted.projectKey,
              };
            }
          }

          // Try to extract task ID from matched text
          const extracted = extractTaskId(textToMatch);
          if (extracted) {
            return {
              rule,
              taskId: extracted.taskId,
              projectKey: extracted.projectKey,
            };
          }
        }
      } catch (error) {
        console.warn(
          `[TaskDetection] Invalid regex in rule ${rule.id}: ${rule.pattern}`,
          error,
        );
      }
    }

    return null;
  }

  /**
   * Detect from recently worked task (heuristic fallback)
   */
  private detectFromRecentHeuristic(): DetectionResult | null {
    if (!this.recentTaskId) {
      return null;
    }

    // Only use if recent (within last 5 minutes)
    const recentThreshold = 5 * 60 * 1000;
    if (Date.now() - this.recentTaskTimestamp > recentThreshold) {
      return null;
    }

    const extracted = extractTaskId(this.recentTaskId);
    if (!extracted) {
      return null;
    }

    return {
      method: "window_title", // Mapped to window_title as there's no "recent" method
      taskId: this.recentTaskId,
      confidence: RECENT_HEURISTIC_CONFIDENCE,
      projectKey: extracted.projectKey,
      source: "recent_heuristic",
      details: `Recently worked on task (${Math.round(
        (Date.now() - this.recentTaskTimestamp) / 1000,
      )}s ago)`,
    };
  }

  // ============================================================================
  // Result Building
  // ============================================================================

  /**
   * Select the best result from multiple detection results
   */
  private selectBestResult(results: DetectionResult[]): DetectionResult | null {
    if (results.length === 0) {
      return null;
    }

    // Sort by confidence (highest first)
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);

    return sorted[0];
  }

  /**
   * Build the final detection result
   */
  private buildDetectionResult(
    best: DetectionResult | null,
    allResults: DetectionResult[],
  ): TaskDetectionResult {
    if (!best) {
      return {
        taskId: null,
        confidence: 0,
        method: null,
        shouldAutoAssociate: false,
        shouldSuggest: false,
        allResults,
      };
    }

    return {
      taskId: best.taskId,
      provider: best.provider,
      projectKey: best.projectKey,
      confidence: best.confidence,
      method: best.method,
      shouldAutoAssociate: best.confidence >= AUTO_ASSOCIATE_THRESHOLD,
      shouldSuggest:
        best.confidence >= SUGGEST_THRESHOLD &&
        best.confidence < AUTO_ASSOCIATE_THRESHOLD,
      allResults,
    };
  }

  // ============================================================================
  // Custom Rules Management
  // ============================================================================

  /**
   * Load custom detection rules from the database
   * @param userId - The user ID to load rules for
   * @param rules - The rules to load (should be fetched from database)
   */
  loadCustomRules(userId: string, rules: TaskDetectionRule[]): void {
    this.customRules = rules.filter((r) => r.isEnabled);
    this.loadedUserId = userId;
    console.log(
      `[TaskDetection] Loaded ${this.customRules.length} custom rules for user ${userId}`,
    );
  }

  /**
   * Get the loaded custom rules
   */
  getCustomRules(): readonly TaskDetectionRule[] {
    return this.customRules;
  }

  /**
   * Clear custom rules
   */
  clearCustomRules(): void {
    this.customRules = [];
    this.loadedUserId = null;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear the git branch cache
   */
  clearGitCache(): void {
    this.gitBranchCache = null;
  }

  /**
   * Invalidate the git branch cache (will refresh on next detection)
   */
  invalidateGitCache(): void {
    if (this.gitBranchCache) {
      this.gitBranchCache.cachedAt = 0;
    }
  }

  /**
   * Clear the recent task heuristic
   */
  clearRecentTask(): void {
    this.recentTaskId = null;
    this.recentTaskTimestamp = 0;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get engine statistics
   */
  getStats(): TaskDetectionEngineStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalDetections: 0,
      detectionsByMethod: {
        active_session: 0,
        git_branch: 0,
        url_pattern: 0,
        window_title: 0,
        manual: 0,
      },
      gitCacheHits: 0,
      gitCacheMisses: 0,
      autoAssociations: 0,
      suggestions: 0,
    };
  }

  /**
   * Reset the engine state completely
   */
  reset(): void {
    this.clearActiveSession();
    this.clearGitCache();
    this.clearCustomRules();
    this.clearRecentTask();
    this.resetStats();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Singleton instance of the task detection engine */
let taskDetectionEngineInstance: TaskDetectionEngine | null = null;

/**
 * Get the singleton task detection engine instance
 */
export function getTaskDetectionEngine(): TaskDetectionEngine {
  if (!taskDetectionEngineInstance) {
    taskDetectionEngineInstance = new TaskDetectionEngine();
  }
  return taskDetectionEngineInstance;
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetTaskDetectionEngine(): void {
  if (taskDetectionEngineInstance) {
    taskDetectionEngineInstance.reset();
  }
  taskDetectionEngineInstance = null;
}
