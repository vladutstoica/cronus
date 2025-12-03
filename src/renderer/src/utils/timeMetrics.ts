import { ActiveWindowEvent, Category } from "@shared/types";
import { generateProcessedEventBlocks } from "./eventProcessing";
import { IDLE_CATEGORY_ID } from "../lib/constants";

export interface ProductivityMetrics {
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  dailyIdleMs: number;
  sessionDurationMs: number; // Total time from first to last event
  activeTimeMs: number; // Productive + Unproductive (excludes idle)
}

export function calculateProductivityMetrics(
  events: ActiveWindowEvent[],
  categories: Category[],
): ProductivityMetrics {
  let dailyProductiveMs = 0;
  let dailyUnproductiveMs = 0;
  let dailyIdleMs = 0;
  let sessionDurationMs = 0;

  if (
    !events ||
    !categories ||
    events.length === 0 ||
    categories.length === 0
  ) {
    return {
      dailyProductiveMs,
      dailyUnproductiveMs,
      dailyIdleMs,
      sessionDurationMs,
      activeTimeMs: 0,
    };
  }

  const categoriesMap = new Map(categories.map((cat) => [cat._id, cat]));
  const processedBlocks = generateProcessedEventBlocks(events, categories);

  // Calculate session duration from first to last block
  if (processedBlocks.length > 0) {
    const sortedBlocks = [...processedBlocks].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
    const firstBlockStart = sortedBlocks[0].startTime.getTime();
    const lastBlockEnd =
      sortedBlocks[sortedBlocks.length - 1].endTime.getTime();
    sessionDurationMs = lastBlockEnd - firstBlockStart;
  }

  for (const block of processedBlocks) {
    // Check if it's an idle block
    if (
      block.categoryId === IDLE_CATEGORY_ID ||
      block.originalEvent.type === "idle"
    ) {
      dailyIdleMs += block.durationMs;
      continue;
    }

    if (block.categoryId) {
      const category = categoriesMap.get(block.categoryId);
      if (category) {
        if (category.isProductive) {
          dailyProductiveMs += block.durationMs;
        } else {
          dailyUnproductiveMs += block.durationMs;
        }
      }
    }
  }

  const activeTimeMs = dailyProductiveMs + dailyUnproductiveMs;

  return {
    dailyProductiveMs,
    dailyUnproductiveMs,
    dailyIdleMs,
    sessionDurationMs,
    activeTimeMs,
  };
}
