import type { CommandItem } from "./types";

/**
 * Simple fuzzy search implementation that matches characters in order
 * Returns a score based on how well the query matches the text
 */
function fuzzyScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 100;

  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 90;

  // Contains gets medium score
  if (textLower.includes(queryLower)) return 80;

  // Fuzzy character matching
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let totalScore = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      // Bonus for consecutive matches
      totalScore += consecutiveMatches * 2;
    } else {
      consecutiveMatches = 0;
    }
  }

  // All characters must be found in order
  if (queryIndex !== queryLower.length) return 0;

  return totalScore;
}

/**
 * Filters and sorts command items based on fuzzy search query
 */
export function filterCommands(
  items: CommandItem[],
  query: string,
): CommandItem[] {
  if (!query.trim()) {
    return items;
  }

  const scoredItems = items
    .map((item) => {
      // Score based on label
      let score = fuzzyScore(query, item.label);

      // Also check keywords for additional matches
      if (item.keywords) {
        for (const keyword of item.keywords) {
          const keywordScore = fuzzyScore(query, keyword);
          if (keywordScore > score) {
            score = keywordScore;
          }
        }
      }

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredItems.map(({ item }) => item);
}
