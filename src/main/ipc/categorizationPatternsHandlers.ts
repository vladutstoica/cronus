/**
 * IPC handlers for categorization patterns and insights
 * Provides pattern management and suggestion generation for the renderer process
 */

import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  findPatterns,
  deletePattern,
  deleteAllPatternsForUser,
  getPatternStats,
  type FindPatternsOptions,
} from "../database/services/categorizationPatterns";
import {
  findRules,
  getRuleStats,
} from "../database/services/categorizationRules";
import { getDatabase } from "../database/index";
import type {
  PatternType,
  RuleSuggestion,
} from "../../shared/categorizationTypes";

/**
 * Get uncategorized activities aggregated by app/domain
 * Returns suggestions for rules that could be created
 */
function getUncategorizedActivitySuggestions(
  userId: string,
  limit = 10,
): RuleSuggestion[] {
  const db = getDatabase();

  // Get uncategorized activities aggregated by owner_name (app)
  const appSuggestions = db
    .prepare(
      `
    SELECT
      owner_name as identifier,
      'app' as type,
      COUNT(*) as occurrences,
      SUM(duration_ms) as total_duration_ms,
      MAX(timestamp) as last_seen
    FROM active_window_events
    WHERE user_id = ?
      AND (category_id IS NULL OR category_id = '')
      AND owner_name IS NOT NULL
      AND owner_name != ''
    GROUP BY owner_name
    HAVING COUNT(*) >= 3
    ORDER BY occurrences DESC
    LIMIT ?
  `,
    )
    .all(userId, limit) as Array<{
    identifier: string;
    type: "app";
    occurrences: number;
    total_duration_ms: number;
    last_seen: string;
  }>;

  // Get uncategorized activities aggregated by domain (for browser events)
  const domainSuggestions = db
    .prepare(
      `
    SELECT
      CASE
        WHEN url LIKE '%://%' THEN
          SUBSTR(
            SUBSTR(url, INSTR(url, '://') + 3),
            1,
            CASE
              WHEN INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') > 0
              THEN INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') - 1
              ELSE LENGTH(SUBSTR(url, INSTR(url, '://') + 3))
            END
          )
        ELSE url
      END as identifier,
      'domain' as type,
      COUNT(*) as occurrences,
      SUM(duration_ms) as total_duration_ms,
      MAX(timestamp) as last_seen
    FROM active_window_events
    WHERE user_id = ?
      AND (category_id IS NULL OR category_id = '')
      AND url IS NOT NULL
      AND url != ''
      AND type = 'browser'
    GROUP BY identifier
    HAVING COUNT(*) >= 3 AND identifier IS NOT NULL AND identifier != ''
    ORDER BY occurrences DESC
    LIMIT ?
  `,
    )
    .all(userId, limit) as Array<{
    identifier: string;
    type: "domain";
    occurrences: number;
    total_duration_ms: number;
    last_seen: string;
  }>;

  // Combine and sort by occurrences
  const combined = [
    ...appSuggestions.map((s) => ({
      identifier: s.identifier,
      type: "app" as const,
      occurrences: s.occurrences,
      totalDurationMs: s.total_duration_ms,
      lastSeen: s.last_seen,
      suggestedPatternType: "app" as PatternType,
    })),
    ...domainSuggestions.map((s) => ({
      identifier: s.identifier,
      type: "domain" as const,
      occurrences: s.occurrences,
      totalDurationMs: s.total_duration_ms,
      lastSeen: s.last_seen,
      suggestedPatternType: "domain" as PatternType,
    })),
  ];

  // Sort by occurrences and return top results
  return combined.sort((a, b) => b.occurrences - a.occurrences).slice(0, limit);
}

export function registerCategorizationPatternsHandlers(): void {
  // Get all patterns for the current user
  ipcMain.handle(
    "local:get-categorization-patterns",
    (_event, options?: FindPatternsOptions) => {
      const user = getOrCreateLocalUser();
      return findPatterns(user.id, options);
    },
  );

  // Delete a pattern by ID
  ipcMain.handle(
    "local:delete-categorization-pattern",
    (_event, id: number) => {
      return deletePattern(id);
    },
  );

  // Delete all patterns for the current user
  ipcMain.handle("local:delete-all-categorization-patterns", () => {
    const user = getOrCreateLocalUser();
    return deleteAllPatternsForUser(user.id);
  });

  // Get pattern statistics
  ipcMain.handle("local:get-pattern-stats", () => {
    const user = getOrCreateLocalUser();
    return getPatternStats(user.id);
  });

  // Get rule statistics
  ipcMain.handle("local:get-rule-stats", () => {
    const user = getOrCreateLocalUser();
    return getRuleStats(user.id);
  });

  // Get rule suggestions based on uncategorized activities
  ipcMain.handle("local:get-rule-suggestions", (_event, limit?: number) => {
    const user = getOrCreateLocalUser();
    return getUncategorizedActivitySuggestions(user.id, limit);
  });

  // Get combined insights (patterns, rules, suggestions)
  ipcMain.handle("local:get-categorization-insights", () => {
    const user = getOrCreateLocalUser();

    const patterns = findPatterns(user.id, {
      orderBy: "confidence",
      orderDirection: "DESC",
    });

    const rules = findRules(user.id, {
      orderBy: "match_count",
      orderDirection: "DESC",
    });

    const patternStats = getPatternStats(user.id);
    const ruleStats = getRuleStats(user.id);
    const suggestions = getUncategorizedActivitySuggestions(user.id, 10);

    return {
      patterns,
      rules,
      patternStats,
      ruleStats,
      suggestions,
    };
  });
}
