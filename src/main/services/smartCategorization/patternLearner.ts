/**
 * Pattern Learning Service
 * Learns categorization patterns from user corrections and improves over time
 */

import type { ActivityForMatching } from "./types";
import type {
  CategorizationPattern,
  PatternType,
  CategorizationResult,
} from "../../../shared/categorizationTypes";
import {
  createPattern,
  findByTypeAndValue,
  findMatchingPatterns,
  updatePattern,
  updateConfidence,
  incrementMatchCount,
  incrementCorrectionCount,
  findPatterns,
  type FindPatternsOptions,
} from "../../database/services/categorizationPatterns";

/**
 * Extracted pattern from an activity
 */
export interface ExtractedPattern {
  type: PatternType;
  value: string;
  /** Signal strength (higher = more reliable for categorization) */
  signalStrength: number;
}

/**
 * Pattern match result with confidence score
 */
export interface PatternMatch {
  pattern: CategorizationPattern;
  /** Combined score based on confidence and signal strength */
  score: number;
  /** Why this pattern matched */
  reasoning: string;
}

/**
 * Category suggestion based on learned patterns
 */
export interface CategorySuggestion {
  categoryId: string;
  confidence: number;
  matchedPatterns: PatternMatch[];
  reasoning: string;
}

/**
 * Configuration for confidence adjustments
 */
const CONFIDENCE_CONFIG = {
  /** Initial confidence for user corrections */
  initialUserCorrection: 0.5,
  /** Initial confidence for automatic patterns */
  initialAutomatic: 0.3,
  /** Confidence increase on repeated correction to same category */
  increaseOnCorrection: 0.1,
  /** Confidence decrease on wrong match */
  decreaseOnWrongMatch: 0.15,
  /** Minimum confidence (never goes below this) */
  minimum: 0.1,
  /** Maximum confidence */
  maximum: 1.0,
  /** Threshold for "trusted" pattern */
  trustedThreshold: 0.7,
};

/**
 * Signal strength for different pattern types
 * Higher values indicate more reliable patterns
 */
const PATTERN_SIGNAL_STRENGTH: Record<PatternType, number> = {
  app: 0.9, // App name is highest signal for native apps
  domain: 0.85, // Domain is high signal for browser activities
  url_path: 0.6, // URL path is medium signal
  title_keyword: 0.4, // Title keywords are lower signal (more prone to false positives)
};

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
    // Normalize path: remove trailing slashes, keep first segment
    const path = urlObj.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      // Return first meaningful path segment for pattern matching
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 0) {
        return `/${segments[0]}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract meaningful keywords from a title
 * Returns keywords that are likely to be useful for categorization
 */
function extractTitleKeywords(title: string): string[] {
  if (!title) return [];

  // Common words to exclude (stop words)
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "new",
    "tab",
    "untitled",
    "-",
    "|",
    ":",
  ]);

  // Split by common separators and extract words
  const words = title
    .toLowerCase()
    .split(/[\s\-–—|:•·,./\\()[\]{}]+/)
    .filter((word) => {
      // Keep words that are:
      // - At least 3 characters
      // - Not stop words
      // - Not pure numbers
      // - Not single characters
      return (
        word.length >= 3 &&
        !stopWords.has(word) &&
        !/^\d+$/.test(word) &&
        word.length < 30 // Avoid very long strings
      );
    });

  // Return unique keywords, limited to first 3
  return Array.from(new Set(words)).slice(0, 3);
}

/**
 * PatternLearner class
 * Learns from user corrections and provides category suggestions
 */
export class PatternLearner {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Extract possible patterns from an activity
   * Returns patterns ordered by signal strength
   */
  extractPatterns(activity: ActivityForMatching): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Extract app pattern (highest signal for native apps)
    if (activity.appName) {
      patterns.push({
        type: "app",
        value: activity.appName.toLowerCase(),
        signalStrength: PATTERN_SIGNAL_STRENGTH.app,
      });
    }

    // Extract domain pattern (high signal for browser activities)
    if (activity.url) {
      const domain = extractDomain(activity.url);
      if (domain) {
        patterns.push({
          type: "domain",
          value: domain,
          signalStrength: PATTERN_SIGNAL_STRENGTH.domain,
        });
      }

      // Extract URL path pattern (medium signal)
      const path = extractPath(activity.url);
      if (path) {
        patterns.push({
          type: "url_path",
          value: path,
          signalStrength: PATTERN_SIGNAL_STRENGTH.url_path,
        });
      }
    }

    // Extract title keywords (lower signal)
    if (activity.title) {
      const keywords = extractTitleKeywords(activity.title);
      keywords.forEach((keyword) => {
        patterns.push({
          type: "title_keyword",
          value: keyword,
          signalStrength: PATTERN_SIGNAL_STRENGTH.title_keyword,
        });
      });
    }

    // Sort by signal strength (highest first)
    return patterns.sort((a, b) => b.signalStrength - a.signalStrength);
  }

  /**
   * Record a user correction and learn from it
   * Creates or updates patterns based on the correction
   */
  recordCorrection(
    activity: ActivityForMatching,
    newCategoryId: string,
    oldCategoryId?: string
  ): CategorizationPattern[] {
    const extractedPatterns = this.extractPatterns(activity);
    const updatedPatterns: CategorizationPattern[] = [];

    for (const extracted of extractedPatterns) {
      // Check if pattern already exists
      const existingPattern = findByTypeAndValue(
        this.userId,
        extracted.type,
        extracted.value
      );

      if (existingPattern) {
        if (existingPattern.categoryId === newCategoryId) {
          // Pattern already points to the correct category - increase confidence
          const newConfidence = Math.min(
            CONFIDENCE_CONFIG.maximum,
            existingPattern.confidence + CONFIDENCE_CONFIG.increaseOnCorrection
          );
          updateConfidence(existingPattern.id, newConfidence);
          incrementCorrectionCount(existingPattern.id);

          const updated = {
            ...existingPattern,
            confidence: newConfidence,
            correctionCount: existingPattern.correctionCount + 1,
          };
          updatedPatterns.push(updated);
        } else {
          // Pattern was pointing to wrong category
          if (oldCategoryId && existingPattern.categoryId === oldCategoryId) {
            // The existing pattern led to the wrong categorization
            // Decrease its confidence
            const newConfidence = Math.max(
              CONFIDENCE_CONFIG.minimum,
              existingPattern.confidence - CONFIDENCE_CONFIG.decreaseOnWrongMatch
            );
            updateConfidence(existingPattern.id, newConfidence);
          }

          // Update pattern to point to the new category
          // Reset confidence since we're changing the category
          const updated = updatePattern(existingPattern.id, {
            categoryId: newCategoryId,
            confidence: CONFIDENCE_CONFIG.initialUserCorrection,
          });
          if (updated) {
            incrementCorrectionCount(updated.id);
            updatedPatterns.push({
              ...updated,
              correctionCount: updated.correctionCount + 1,
            });
          }
        }
      } else {
        // Create new pattern
        const newPattern = createPattern({
          userId: this.userId,
          patternType: extracted.type,
          patternValue: extracted.value,
          categoryId: newCategoryId,
          confidence: CONFIDENCE_CONFIG.initialUserCorrection,
          source: "user_correction",
        });
        updatedPatterns.push(newPattern);
      }
    }

    return updatedPatterns;
  }

  /**
   * Find patterns that match an activity
   * Returns patterns sorted by score (confidence * signal strength)
   */
  findMatchingPatterns(activity: ActivityForMatching): PatternMatch[] {
    const extractedPatterns = this.extractPatterns(activity);

    if (extractedPatterns.length === 0) {
      return [];
    }

    // Build pattern matches for database query
    const patternMatches = extractedPatterns.map((p) => ({
      type: p.type,
      value: p.value,
    }));

    // Find all matching patterns from database
    const dbPatterns = findMatchingPatterns(this.userId, patternMatches);

    // Map database patterns to PatternMatch with scores
    const matches: PatternMatch[] = [];

    for (const dbPattern of dbPatterns) {
      // Find the corresponding extracted pattern to get signal strength
      const extracted = extractedPatterns.find(
        (e) => e.type === dbPattern.patternType && e.value === dbPattern.patternValue
      );

      if (extracted) {
        const score = dbPattern.confidence * extracted.signalStrength;
        const reasoning = this.generateMatchReasoning(dbPattern, extracted);

        matches.push({
          pattern: dbPattern,
          score,
          reasoning,
        });
      }
    }

    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate human-readable reasoning for a pattern match
   */
  private generateMatchReasoning(
    pattern: CategorizationPattern,
    extracted: ExtractedPattern
  ): string {
    const typeDescriptions: Record<PatternType, string> = {
      app: "application",
      domain: "website domain",
      url_path: "URL path",
      title_keyword: "title keyword",
    };

    const typeDesc = typeDescriptions[pattern.patternType];
    const confidencePercent = Math.round(pattern.confidence * 100);

    return `Matched ${typeDesc} "${pattern.patternValue}" (${confidencePercent}% confidence, ${pattern.matchCount} previous matches)`;
  }

  /**
   * Get category suggestion based on learned patterns
   * Returns the best category suggestion or null if no confident match
   */
  suggestCategory(
    activity: ActivityForMatching,
    minConfidence = 0.3
  ): CategorySuggestion | null {
    const matches = this.findMatchingPatterns(activity);

    if (matches.length === 0) {
      return null;
    }

    // Group matches by category
    const categoryMatches = new Map<string, PatternMatch[]>();
    for (const match of matches) {
      const categoryId = match.pattern.categoryId;
      if (!categoryMatches.has(categoryId)) {
        categoryMatches.set(categoryId, []);
      }
      categoryMatches.get(categoryId)!.push(match);
    }

    // Calculate confidence for each category
    // Uses weighted average of pattern scores
    const categoryScores: Array<{
      categoryId: string;
      confidence: number;
      matches: PatternMatch[];
    }> = [];

    for (const [categoryId, catMatches] of Array.from(categoryMatches.entries())) {
      // Calculate weighted confidence
      // Higher-scoring patterns contribute more to the overall confidence
      const totalScore = catMatches.reduce((sum, m) => sum + m.score, 0);
      const weightedConfidence = Math.min(1.0, totalScore / catMatches.length);

      // Boost confidence if multiple patterns agree
      const multiPatternBoost = Math.min(0.15, (catMatches.length - 1) * 0.05);
      const finalConfidence = Math.min(1.0, weightedConfidence + multiPatternBoost);

      if (finalConfidence >= minConfidence) {
        categoryScores.push({
          categoryId,
          confidence: finalConfidence,
          matches: catMatches,
        });
      }
    }

    if (categoryScores.length === 0) {
      return null;
    }

    // Sort by confidence and return the best
    categoryScores.sort((a, b) => b.confidence - a.confidence);
    const best = categoryScores[0];

    // Generate reasoning
    const patternDescriptions = best.matches
      .slice(0, 3)
      .map((m) => m.reasoning)
      .join("; ");

    return {
      categoryId: best.categoryId,
      confidence: Math.round(best.confidence * 1000) / 1000,
      matchedPatterns: best.matches,
      reasoning: `Suggested based on: ${patternDescriptions}`,
    };
  }

  /**
   * Convert a category suggestion to a CategorizationResult
   */
  suggestionToResult(suggestion: CategorySuggestion): CategorizationResult {
    return {
      categoryId: suggestion.categoryId,
      confidence: suggestion.confidence,
      source: "pattern",
      matchedPatternId: suggestion.matchedPatterns[0]?.pattern.id,
      reasoning: suggestion.reasoning,
    };
  }

  /**
   * Adjust confidence based on whether a pattern match was correct
   * Call this after confirming or rejecting a pattern-based categorization
   */
  adjustConfidenceOnMatch(patternId: number, wasCorrect: boolean): void {
    const patterns = findPatterns(this.userId, {});
    const pattern = patterns.find((p) => p.id === patternId);

    if (!pattern) {
      console.warn(
        `[PatternLearner] Pattern ${patternId} not found for confidence adjustment`
      );
      return;
    }

    if (wasCorrect) {
      // Increase confidence slightly for correct matches
      const boost = CONFIDENCE_CONFIG.increaseOnCorrection * 0.5; // Half the correction boost
      const newConfidence = Math.min(
        CONFIDENCE_CONFIG.maximum,
        pattern.confidence + boost
      );
      updateConfidence(patternId, newConfidence);
      incrementMatchCount(patternId);
    } else {
      // Decrease confidence for incorrect matches
      const newConfidence = Math.max(
        CONFIDENCE_CONFIG.minimum,
        pattern.confidence - CONFIDENCE_CONFIG.decreaseOnWrongMatch
      );
      updateConfidence(patternId, newConfidence);
    }
  }

  /**
   * Mark a pattern match as used (increments match count)
   */
  recordMatch(patternId: number): void {
    incrementMatchCount(patternId);
  }

  /**
   * Check if a pattern is "trusted" (confidence above threshold)
   */
  isPatternTrusted(pattern: CategorizationPattern): boolean {
    return pattern.confidence >= CONFIDENCE_CONFIG.trustedThreshold;
  }

  /**
   * Get all trusted patterns for the user
   */
  getTrustedPatterns(options?: FindPatternsOptions): CategorizationPattern[] {
    return findPatterns(this.userId, {
      ...options,
      minConfidence: CONFIDENCE_CONFIG.trustedThreshold,
    });
  }

  /**
   * Get patterns for a specific category
   */
  getPatternsForCategory(categoryId: string): CategorizationPattern[] {
    return findPatterns(this.userId, { categoryId });
  }

  /**
   * Get configuration values (for testing/debugging)
   */
  getConfidenceConfig(): typeof CONFIDENCE_CONFIG {
    return { ...CONFIDENCE_CONFIG };
  }
}

/**
 * Singleton instance cache by user ID
 */
const learnerInstances = new Map<string, PatternLearner>();

/**
 * Get a PatternLearner instance for a user
 */
export function getPatternLearner(userId: string): PatternLearner {
  let learner = learnerInstances.get(userId);
  if (!learner) {
    learner = new PatternLearner(userId);
    learnerInstances.set(userId, learner);
  }
  return learner;
}

/**
 * Clear all cached PatternLearner instances (mainly for testing)
 */
export function clearPatternLearnerCache(): void {
  learnerInstances.clear();
}
