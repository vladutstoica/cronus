/**
 * Rule-based categorization engine
 * Evaluates activities against user-defined and template rules
 */

import { getDatabase } from "../../database/index";
import { rowToRule } from "../../../shared/categorizationTypes";
import type {
  ActivityForMatching,
  ConditionEvaluationResult,
  RuleEvaluationResult,
  RuleMatch,
  RuleEvaluationOptions,
  RegexCacheEntry,
  RuleEngineStats,
  CategorizationRule,
  CategorizationRuleRow,
  RuleCondition,
  ConditionField,
  ConditionOperator,
  ConditionLogic,
} from "./types";
import {
  FIELD_TO_ACTIVITY_PROPERTY,
  isNegationOperator,
  isRegexOperator,
} from "./types";

/** Default maximum age for regex cache entries (30 minutes) */
const REGEX_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

/** Default maximum number of cached regex patterns */
const REGEX_CACHE_MAX_SIZE = 500;

/**
 * Extract domain from a URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extract path from a URL
 */
function extractPath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return null;
  }
}

/**
 * Rule engine for evaluating categorization rules against activities
 */
export class RuleEngine {
  /** Loaded rules for the current user */
  private rules: CategorizationRule[] = [];

  /** User ID for the loaded rules */
  private loadedUserId: string | null = null;

  /** Cache for compiled regex patterns */
  private regexCache: Map<string, RegexCacheEntry> = new Map();

  /** Statistics for monitoring */
  private stats = {
    totalEvaluations: 0,
    regexCacheHits: 0,
    regexCacheMisses: 0,
  };

  /**
   * Load rules for a specific user from the database
   * @param userId - The user ID to load rules for
   * @param forceReload - Whether to reload even if already loaded for this user
   */
  loadRules(userId: string, forceReload = false): void {
    if (this.loadedUserId === userId && !forceReload) {
      return;
    }

    const db = getDatabase();

    const rows = db
      .prepare(
        `
        SELECT * FROM categorization_rules
        WHERE user_id = ?
        ORDER BY priority DESC, created_at ASC
      `
      )
      .all(userId) as CategorizationRuleRow[];

    this.rules = rows.map((row) => rowToRule(row));
    this.loadedUserId = userId;

    console.log(`[RuleEngine] Loaded ${this.rules.length} rules for user ${userId}`);
  }

  /**
   * Reload rules for the current user
   */
  reloadRules(): void {
    if (this.loadedUserId) {
      this.loadRules(this.loadedUserId, true);
    }
  }

  /**
   * Get the currently loaded rules
   */
  getRules(): readonly CategorizationRule[] {
    return this.rules;
  }

  /**
   * Evaluate an activity against all loaded rules
   * @param activity - The activity to evaluate
   * @param options - Evaluation options
   * @returns Array of matching rules with scores, sorted by score (highest first)
   */
  evaluate(
    activity: ActivityForMatching,
    options: RuleEvaluationOptions = {}
  ): RuleMatch[] {
    const {
      maxResults,
      minConfidence = 0,
      includeDisabled = false,
    } = options;

    this.stats.totalEvaluations++;

    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      // Skip disabled rules unless explicitly included
      if (!rule.isEnabled && !includeDisabled) {
        continue;
      }

      const evaluationResult = this.evaluateRule(rule, activity);

      if (evaluationResult.matched) {
        const score = this.calculateScore(rule, evaluationResult);

        if (score >= minConfidence) {
          const reasoning = this.generateReasoning(rule, evaluationResult);
          matches.push({
            rule,
            score,
            evaluationResult,
            reasoning,
          });
        }
      }
    }

    // Sort by score (highest first), then by priority (highest first)
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.rule.priority - a.rule.priority;
    });

    // Limit results if specified
    if (maxResults !== undefined && maxResults > 0) {
      return matches.slice(0, maxResults);
    }

    return matches;
  }

  /**
   * Evaluate a single rule against an activity
   */
  private evaluateRule(
    rule: CategorizationRule,
    activity: ActivityForMatching
  ): RuleEvaluationResult {
    const conditionResults: ConditionEvaluationResult[] = [];

    for (const condition of rule.conditions) {
      const result = this.evaluateCondition(condition, activity);
      conditionResults.push(result);
    }

    const matchedCount = conditionResults.filter((r) => r.matched).length;
    const totalCount = conditionResults.length;

    // Determine overall match based on condition logic
    let matched: boolean;
    if (totalCount === 0) {
      // Rule with no conditions never matches
      matched = false;
    } else if (rule.conditionLogic === "AND") {
      matched = matchedCount === totalCount;
    } else {
      // OR logic
      matched = matchedCount > 0;
    }

    return {
      matched,
      conditionResults,
      matchedConditionCount: matchedCount,
      totalConditionCount: totalCount,
    };
  }

  /**
   * Evaluate a single condition against an activity
   */
  evaluateCondition(
    condition: RuleCondition,
    activity: ActivityForMatching
  ): ConditionEvaluationResult {
    const testedValue = this.getValueForField(condition.field, activity);

    if (testedValue === null) {
      return {
        matched: isNegationOperator(condition.operator),
        condition,
        testedValue: null,
        matchDetails: "Field value is null",
      };
    }

    const matched = this.matchValue(
      testedValue,
      condition.operator,
      condition.value,
      condition.caseSensitive ?? false
    );

    return {
      matched,
      condition,
      testedValue,
      matchDetails: matched
        ? `"${testedValue}" ${condition.operator} "${condition.value}"`
        : undefined,
    };
  }

  /**
   * Get the value from an activity for a specific field
   */
  private getValueForField(
    field: ConditionField,
    activity: ActivityForMatching
  ): string | null {
    switch (field) {
      case "app_name":
        return activity.appName;

      case "domain":
        if (!activity.url) return null;
        return extractDomain(activity.url);

      case "url":
        return activity.url;

      case "url_path":
        if (!activity.url) return null;
        return extractPath(activity.url);

      case "title":
        return activity.title;

      case "browser":
        return activity.browserType;

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = field;
        return _exhaustive;
      }
    }
  }

  /**
   * Match a value against an operator and pattern
   */
  private matchValue(
    value: string,
    operator: ConditionOperator,
    pattern: string,
    caseSensitive: boolean
  ): boolean {
    const normalizedValue = caseSensitive ? value : value.toLowerCase();
    const normalizedPattern = caseSensitive ? pattern : pattern.toLowerCase();

    switch (operator) {
      case "equals":
        return normalizedValue === normalizedPattern;

      case "not_equals":
        return normalizedValue !== normalizedPattern;

      case "contains":
        return normalizedValue.includes(normalizedPattern);

      case "not_contains":
        return !normalizedValue.includes(normalizedPattern);

      case "starts_with":
        return normalizedValue.startsWith(normalizedPattern);

      case "ends_with":
        return normalizedValue.endsWith(normalizedPattern);

      case "matches_regex":
        return this.matchRegex(value, pattern, caseSensitive);

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = operator;
        return _exhaustive;
      }
    }
  }

  /**
   * Match a value against a regex pattern (with caching)
   */
  private matchRegex(
    value: string,
    pattern: string,
    caseSensitive: boolean
  ): boolean {
    const cacheKey = `${pattern}:${caseSensitive ? "s" : "i"}`;

    let cacheEntry = this.regexCache.get(cacheKey);

    if (cacheEntry) {
      this.stats.regexCacheHits++;
      cacheEntry.useCount++;
    } else {
      this.stats.regexCacheMisses++;

      try {
        const flags = caseSensitive ? "" : "i";
        const regex = new RegExp(pattern, flags);

        cacheEntry = {
          regex,
          createdAt: Date.now(),
          useCount: 1,
        };

        this.regexCache.set(cacheKey, cacheEntry);
        this.cleanupRegexCache();
      } catch (error) {
        console.warn(`[RuleEngine] Invalid regex pattern: ${pattern}`, error);
        return false;
      }
    }

    try {
      return cacheEntry.regex.test(value);
    } catch (error) {
      console.warn(`[RuleEngine] Error testing regex: ${pattern}`, error);
      return false;
    }
  }

  /**
   * Calculate the confidence score for a rule match
   */
  calculateScore(
    rule: CategorizationRule,
    evaluationResult: RuleEvaluationResult
  ): number {
    // Base score is the rule's configured confidence
    let score = rule.confidence;

    // For OR logic, boost score based on how many conditions matched
    if (
      rule.conditionLogic === "OR" &&
      evaluationResult.totalConditionCount > 1
    ) {
      const matchRatio =
        evaluationResult.matchedConditionCount /
        evaluationResult.totalConditionCount;
      // Boost by up to 20% based on match ratio
      score = Math.min(1, score * (1 + matchRatio * 0.2));
    }

    // Factor in priority (higher priority = slight boost)
    // Priority range assumed to be 0-100, normalized boost of up to 5%
    const priorityBoost = (rule.priority / 100) * 0.05;
    score = Math.min(1, score + priorityBoost);

    // Factor in match count for system rules (more matches = more reliable)
    if (rule.isSystem && rule.matchCount > 0) {
      // Logarithmic boost for high match counts (max 10% boost at 1000 matches)
      const matchCountBoost = Math.min(0.1, Math.log10(rule.matchCount + 1) / 30);
      score = Math.min(1, score + matchCountBoost);
    }

    return Math.round(score * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Generate a human-readable reasoning for why a rule matched
   */
  private generateReasoning(
    rule: CategorizationRule,
    evaluationResult: RuleEvaluationResult
  ): string {
    const matchedConditions = evaluationResult.conditionResults
      .filter((r) => r.matched)
      .map((r) => {
        const fieldName = this.getFieldDisplayName(r.condition.field);
        const operatorName = this.getOperatorDisplayName(r.condition.operator);
        return `${fieldName} ${operatorName} "${r.condition.value}"`;
      });

    if (matchedConditions.length === 0) {
      return `Matched rule "${rule.name}"`;
    }

    const logic = rule.conditionLogic === "AND" ? " and " : " or ";
    const conditionsText = matchedConditions.join(logic);

    return `Matched rule "${rule.name}": ${conditionsText}`;
  }

  /**
   * Get display name for a condition field
   */
  private getFieldDisplayName(field: ConditionField): string {
    const displayNames: Record<ConditionField, string> = {
      app_name: "app name",
      domain: "domain",
      url: "URL",
      url_path: "URL path",
      title: "title",
      browser: "browser",
    };
    return displayNames[field];
  }

  /**
   * Get display name for an operator
   */
  private getOperatorDisplayName(operator: ConditionOperator): string {
    const displayNames: Record<ConditionOperator, string> = {
      equals: "equals",
      not_equals: "does not equal",
      contains: "contains",
      not_contains: "does not contain",
      starts_with: "starts with",
      ends_with: "ends with",
      matches_regex: "matches pattern",
    };
    return displayNames[operator];
  }

  /**
   * Cleanup old or least-used regex cache entries
   */
  private cleanupRegexCache(): void {
    if (this.regexCache.size <= REGEX_CACHE_MAX_SIZE) {
      return;
    }

    const now = Date.now();
    const entries = Array.from(this.regexCache.entries());

    // First, remove entries older than max age
    for (const [key, entry] of entries) {
      if (now - entry.createdAt > REGEX_CACHE_MAX_AGE_MS) {
        this.regexCache.delete(key);
      }
    }

    // If still over limit, remove least used entries
    if (this.regexCache.size > REGEX_CACHE_MAX_SIZE) {
      const sortedEntries = Array.from(this.regexCache.entries()).sort(
        (a, b) => a[1].useCount - b[1].useCount
      );

      const toRemove = this.regexCache.size - REGEX_CACHE_MAX_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.regexCache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Clear the regex cache
   */
  clearRegexCache(): void {
    this.regexCache.clear();
  }

  /**
   * Get engine statistics
   */
  getStats(): RuleEngineStats {
    const totalRegexAttempts =
      this.stats.regexCacheHits + this.stats.regexCacheMisses;
    const hitRate =
      totalRegexAttempts > 0
        ? this.stats.regexCacheHits / totalRegexAttempts
        : 0;

    return {
      rulesLoaded: this.rules.length,
      cachedRegexPatterns: this.regexCache.size,
      totalEvaluations: this.stats.totalEvaluations,
      regexCacheHitRate: Math.round(hitRate * 1000) / 1000,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEvaluations: 0,
      regexCacheHits: 0,
      regexCacheMisses: 0,
    };
  }

  /**
   * Find the best matching rule for an activity
   * Convenience method that returns only the highest-scoring match
   */
  findBestMatch(activity: ActivityForMatching): RuleMatch | null {
    const matches = this.evaluate(activity, { maxResults: 1 });
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Check if an activity matches any rule
   */
  hasMatch(activity: ActivityForMatching): boolean {
    // Use a short-circuit evaluation for efficiency
    for (const rule of this.rules) {
      if (!rule.isEnabled) continue;

      const result = this.evaluateRule(rule, activity);
      if (result.matched) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a specific rule by ID
   */
  getRuleById(ruleId: number): CategorizationRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  /**
   * Update the match count for a rule in the database
   */
  incrementMatchCount(ruleId: number): void {
    const db = getDatabase();

    db.prepare(
      `
      UPDATE categorization_rules
      SET match_count = match_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(ruleId);

    // Update the in-memory rule
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.matchCount++;
    }
  }
}

/**
 * Singleton instance of the rule engine
 */
let ruleEngineInstance: RuleEngine | null = null;

/**
 * Get the singleton rule engine instance
 */
export function getRuleEngine(): RuleEngine {
  if (!ruleEngineInstance) {
    ruleEngineInstance = new RuleEngine();
  }
  return ruleEngineInstance;
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetRuleEngine(): void {
  if (ruleEngineInstance) {
    ruleEngineInstance.clearRegexCache();
    ruleEngineInstance.resetStats();
  }
  ruleEngineInstance = null;
}
