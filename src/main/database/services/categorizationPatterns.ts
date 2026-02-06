/**
 * Database operations for categorization patterns
 * Handles CRUD operations for learned patterns from user corrections
 */

import { getDatabase } from "../index";
import type {
  CategorizationPattern,
  CategorizationPatternRow,
  CreateCategorizationPatternInput,
  UpdateCategorizationPatternInput,
  PatternType,
  PatternSource,
} from "../../../shared/categorizationTypes";
import { rowToPattern } from "../../../shared/categorizationTypes";

/**
 * Whitelist of column names allowed in dynamic UPDATE SET clauses.
 * Prevents SQL injection via crafted object keys.
 */
const ALLOWED_UPDATE_COLUMNS: readonly string[] = [
  "category_id",
  "confidence",
  "match_count",
  "correction_count",
] as const;

/**
 * Options for finding patterns
 */
export interface FindPatternsOptions {
  /** Filter by pattern type */
  patternType?: PatternType;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by pattern source */
  source?: PatternSource;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of results */
  limit?: number;
  /** Order by field (default: confidence DESC) */
  orderBy?: "confidence" | "match_count" | "created_at" | "updated_at";
  /** Order direction (default: DESC) */
  orderDirection?: "ASC" | "DESC";
}

/**
 * Create a new categorization pattern
 */
export function createPattern(
  input: CreateCategorizationPatternInput,
): CategorizationPattern {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Default confidence based on source
  const defaultConfidence =
    input.source === "user_correction"
      ? 0.5
      : input.source === "manual"
        ? 0.7
        : 0.3;
  const confidence = input.confidence ?? defaultConfidence;

  const stmt = db.prepare(`
    INSERT INTO categorization_patterns (
      user_id, pattern_type, pattern_value, category_id,
      confidence, match_count, correction_count, source,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.userId,
    input.patternType,
    input.patternValue,
    input.categoryId,
    confidence,
    0, // match_count
    1, // correction_count (starts at 1 since it was just corrected/created)
    input.source,
    now,
    now,
  );

  return {
    id: result.lastInsertRowid as number,
    userId: input.userId,
    patternType: input.patternType,
    patternValue: input.patternValue,
    categoryId: input.categoryId,
    confidence,
    matchCount: 0,
    correctionCount: 1,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update an existing categorization pattern
 */
export function updatePattern(
  id: number,
  updates: Partial<Omit<UpdateCategorizationPatternInput, "id">>,
): CategorizationPattern | undefined {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  // Map camelCase to snake_case
  const fieldMapping: Record<string, string> = {
    categoryId: "category_id",
    confidence: "confidence",
    matchCount: "match_count",
    correctionCount: "correction_count",
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const columnName = fieldMapping[key];
      if (!columnName || !ALLOWED_UPDATE_COLUMNS.includes(columnName)) {
        console.warn(
          `[categorizationPatterns] Rejected invalid column name in update: "${key}"`,
        );
        return;
      }
      fields.push(`${columnName} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return findPatternById(id);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE categorization_patterns
    SET ${fields.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...values);

  return findPatternById(id);
}

/**
 * Find a pattern by ID
 */
export function findPatternById(id: number): CategorizationPattern | undefined {
  const db = getDatabase();

  const row = db
    .prepare("SELECT * FROM categorization_patterns WHERE id = ?")
    .get(id) as CategorizationPatternRow | undefined;

  return row ? rowToPattern(row) : undefined;
}

/**
 * Find patterns for a user with optional filters
 */
export function findPatterns(
  userId: string,
  options: FindPatternsOptions = {},
): CategorizationPattern[] {
  const db = getDatabase();

  const {
    patternType,
    categoryId,
    source,
    minConfidence,
    limit,
    orderBy = "confidence",
    orderDirection = "DESC",
  } = options;

  let query = "SELECT * FROM categorization_patterns WHERE user_id = ?";
  const params: (string | number)[] = [userId];

  if (patternType) {
    query += " AND pattern_type = ?";
    params.push(patternType);
  }

  if (categoryId) {
    query += " AND category_id = ?";
    params.push(categoryId);
  }

  if (source) {
    query += " AND source = ?";
    params.push(source);
  }

  if (minConfidence !== undefined) {
    query += " AND confidence >= ?";
    params.push(minConfidence);
  }

  // Map orderBy to snake_case
  const orderByColumn = {
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

  const rows = db.prepare(query).all(...params) as CategorizationPatternRow[];

  return rows.map(rowToPattern);
}

/**
 * Find a specific pattern by type and value for a user
 */
export function findByTypeAndValue(
  userId: string,
  patternType: PatternType,
  patternValue: string,
): CategorizationPattern | undefined {
  const db = getDatabase();

  const row = db
    .prepare(
      `
      SELECT * FROM categorization_patterns
      WHERE user_id = ? AND pattern_type = ? AND pattern_value = ?
    `,
    )
    .get(userId, patternType, patternValue) as
    | CategorizationPatternRow
    | undefined;

  return row ? rowToPattern(row) : undefined;
}

/**
 * Find patterns matching specific pattern values
 * Useful for finding all patterns that might match an activity
 */
export function findMatchingPatterns(
  userId: string,
  patternMatches: Array<{ type: PatternType; value: string }>,
): CategorizationPattern[] {
  if (patternMatches.length === 0) {
    return [];
  }

  const db = getDatabase();

  // Build OR conditions for each pattern match
  const conditions = patternMatches
    .map(() => "(pattern_type = ? AND pattern_value = ?)")
    .join(" OR ");

  const params: (string | number)[] = [userId];
  patternMatches.forEach((match) => {
    params.push(match.type, match.value);
  });

  const query = `
    SELECT * FROM categorization_patterns
    WHERE user_id = ? AND (${conditions})
    ORDER BY confidence DESC, match_count DESC
  `;

  const rows = db.prepare(query).all(...params) as CategorizationPatternRow[];

  return rows.map(rowToPattern);
}

/**
 * Increment the match count for a pattern
 */
export function incrementMatchCount(id: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE categorization_patterns
    SET match_count = match_count + 1, updated_at = ?
    WHERE id = ?
  `,
  ).run(now, id);
}

/**
 * Increment the correction count for a pattern
 */
export function incrementCorrectionCount(id: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    UPDATE categorization_patterns
    SET correction_count = correction_count + 1, updated_at = ?
    WHERE id = ?
  `,
  ).run(now, id);
}

/**
 * Update the confidence of a pattern
 */
export function updateConfidence(id: number, newConfidence: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Clamp confidence between 0.1 and 1.0
  const clampedConfidence = Math.max(0.1, Math.min(1.0, newConfidence));

  db.prepare(
    `
    UPDATE categorization_patterns
    SET confidence = ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(clampedConfidence, now, id);
}

/**
 * Delete a pattern by ID
 */
export function deletePattern(id: number): boolean {
  const db = getDatabase();

  const result = db
    .prepare("DELETE FROM categorization_patterns WHERE id = ?")
    .run(id);

  return result.changes > 0;
}

/**
 * Delete all patterns for a user
 */
export function deleteAllPatternsForUser(userId: string): number {
  const db = getDatabase();

  const result = db
    .prepare("DELETE FROM categorization_patterns WHERE user_id = ?")
    .run(userId);

  return result.changes;
}

/**
 * Get pattern statistics for a user
 */
export interface PatternStats {
  totalPatterns: number;
  patternsByType: Record<PatternType, number>;
  patternsBySource: Record<PatternSource, number>;
  averageConfidence: number;
  trustedPatterns: number; // confidence > 0.7
}

export function getPatternStats(userId: string): PatternStats {
  const db = getDatabase();

  // Get total count
  const totalResult = db
    .prepare(
      "SELECT COUNT(*) as count FROM categorization_patterns WHERE user_id = ?",
    )
    .get(userId) as { count: number };

  // Get counts by type
  const typeResults = db
    .prepare(
      `
      SELECT pattern_type, COUNT(*) as count
      FROM categorization_patterns
      WHERE user_id = ?
      GROUP BY pattern_type
    `,
    )
    .all(userId) as Array<{ pattern_type: PatternType; count: number }>;

  // Get counts by source
  const sourceResults = db
    .prepare(
      `
      SELECT source, COUNT(*) as count
      FROM categorization_patterns
      WHERE user_id = ?
      GROUP BY source
    `,
    )
    .all(userId) as Array<{ source: PatternSource; count: number }>;

  // Get average confidence
  const avgResult = db
    .prepare(
      `
      SELECT AVG(confidence) as avg_confidence
      FROM categorization_patterns
      WHERE user_id = ?
    `,
    )
    .get(userId) as { avg_confidence: number | null };

  // Get trusted patterns count
  const trustedResult = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM categorization_patterns
      WHERE user_id = ? AND confidence > 0.7
    `,
    )
    .get(userId) as { count: number };

  // Build patternsByType with all types defaulting to 0
  const patternsByType: Record<PatternType, number> = {
    app: 0,
    domain: 0,
    url_path: 0,
    title_keyword: 0,
  };
  typeResults.forEach((r) => {
    patternsByType[r.pattern_type] = r.count;
  });

  // Build patternsBySource with all sources defaulting to 0
  const patternsBySource: Record<PatternSource, number> = {
    user_correction: 0,
    manual: 0,
    template: 0,
  };
  sourceResults.forEach((r) => {
    patternsBySource[r.source] = r.count;
  });

  return {
    totalPatterns: totalResult.count,
    patternsByType,
    patternsBySource,
    averageConfidence: avgResult.avg_confidence ?? 0,
    trustedPatterns: trustedResult.count,
  };
}
