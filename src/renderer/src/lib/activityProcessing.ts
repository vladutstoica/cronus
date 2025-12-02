import { ActiveWindowEvent, Category as SharedCategory } from "@shared/types";
import type { ProcessedEventBlock } from "../components/DashboardView";
import { extractWebsiteInfo } from "./activityByCategoryWidgetHelpers";
import { IDLE_CATEGORY_ID } from "./constants";

export interface ActivityItem {
  name: string;
  durationMs: number;
  itemType: "app" | "website";
  identifier: string;
  originalUrl?: string;
  categoryReasoning?: string | null;
  oldCategoryReasoning?: string | null;
  llmSummary?: string | null;
  oldLlmSummary?: string | null;
  lastCategorizationAt?: Date;
}

export interface ProcessedCategory {
  id: string;
  name: string;
  color: string;
  isProductive: boolean;
  totalDurationMs: number;
  activities: ActivityItem[];
}

export const extractActivityDetailsFromEvent = (
  event: ActiveWindowEvent,
): {
  activityName: string;
  itemType: ActivityItem["itemType"];
  identifier: string;
  originalUrl?: string;
} => {
  let activityName = event.ownerName;
  let itemType: ActivityItem["itemType"] = "app";
  let identifier = event.ownerName;
  let originalUrl: string | undefined = undefined;

  if (event.url) {
    // Case 1: Event has a URL - clearly a website.
    const websiteInfo = extractWebsiteInfo(
      event.url,
      event.title || event.ownerName,
    );
    activityName = websiteInfo.name;
    itemType = "website";
    identifier = event.url; // Use the full URL as the identifier
    originalUrl = event.url;
  } else if (
    // Case 2: Browser event without URL but with a usable title
    // Use the event's type/browser fields instead of hardcoding browser names
    (event.type === "browser" || event.browser) &&
    event.title &&
    event.title.trim() !== ""
  ) {
    // Treat this as a web-like activity, using the title as its name and identifier.
    activityName = event.title.trim();
    itemType = "website";
    identifier = event.title.trim();
  } else {
    // Case 3: Fallback - treated as a generic app.
    // This will catch non-Chrome apps, or Chrome instances with no URL and no title.
    // console.log('Event classified as generic app:', event); // General log for non-website events
  }
  return { activityName, itemType, identifier, originalUrl };
};

export const processActivityEvents = (
  processedBlocks: ProcessedEventBlock[],
  categoriesMap: Map<string, SharedCategory>,
): ProcessedCategory[] => {
  const UNCATEGORIZED_ID = "uncategorized";
  const uncategorizedCategory: SharedCategory = {
    _id: UNCATEGORIZED_ID,
    name: "Uncategorized",
    color: "#808080", // Gray color
    isProductive: false,
    userId: "", // Assuming userId is not strictly needed for display
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const categoryActivityAccumulator: Record<
    string, // categoryId
    {
      categoryDetails: SharedCategory;
      activitiesMap: Map<string, ActivityItem>;
    }
  > = {};

  // Iterate through processed blocks
  for (const block of processedBlocks) {
    // Skip idle events - they shouldn't appear in the categorizable activity list
    if (
      block.categoryId === IDLE_CATEGORY_ID ||
      block.originalEvent.type === "idle"
    ) {
      continue;
    }

    let effectiveCategoryId: string;
    let categoryDetails: SharedCategory | undefined;

    if (block.categoryId && categoriesMap.has(block.categoryId)) {
      // This is a known, existing category.
      effectiveCategoryId = block.categoryId;
      categoryDetails = categoriesMap.get(block.categoryId)!;
    } else {
      // This is either an event with no categoryID, or a deleted categoryID.
      // In both cases, it belongs to "Uncategorized".
      effectiveCategoryId = UNCATEGORIZED_ID;
      categoryDetails = uncategorizedCategory;
    }

    // Duration is already calculated in ProcessedEventBlock
    const durationMs = block.durationMs;
    // No need to cap or check for 0 duration here if DashboardView handles it, but good to be defensive
    if (durationMs <= 0) continue;

    // Extract display name, type (app/website), identifier (app name/domain), and URL for the current activity.
    // Use block.originalEvent as extractActivityDetailsFromEvent expects ActiveWindowEvent
    const { activityName, itemType, identifier, originalUrl } =
      extractActivityDetailsFromEvent(block.originalEvent);

    // Ensure an entry for the category exists in the accumulator.
    if (!categoryActivityAccumulator[effectiveCategoryId]) {
      categoryActivityAccumulator[effectiveCategoryId] = {
        categoryDetails,
        activitiesMap: new Map<string, ActivityItem>(), // Initialize map for this category's activities
      };
    }

    // Aggregate duration and details for the specific activity within its category.
    // Use identifier (full URL for websites, app name for apps) as the key to show individual activities
    // This allows users to categorize different URLs from the same site differently
    const { activitiesMap } = categoryActivityAccumulator[effectiveCategoryId];
    const existingActivity = activitiesMap.get(identifier);

    activitiesMap.set(identifier, {
      name: activityName,
      durationMs: (existingActivity?.durationMs || 0) + durationMs,
      itemType,
      identifier,
      originalUrl,
      categoryReasoning: block.originalEvent.categoryReasoning ?? undefined,
      oldCategoryReasoning:
        block.originalEvent.oldCategoryReasoning ?? undefined,
      llmSummary: block.originalEvent.llmSummary ?? undefined,
      oldLlmSummary: block.originalEvent.oldLlmSummary ?? undefined,
      lastCategorizationAt: block.originalEvent.lastCategorizationAt,
    });
  }

  // Transform the accumulated data into the final array of ProcessedCategory objects.
  // Each object will represent a category and include its total time and a list of its activities.
  const result: ProcessedCategory[] = Object.values(
    categoryActivityAccumulator,
  ).map((data) => {
    // Convert the map of activities (Map<string, ActivityItem>) into an array of ActivityItem objects.
    const activityItems: ActivityItem[] = Array.from(
      data.activitiesMap.values(),
    );
    // Calculate the total time spent in this category by summing durations of all its activities.
    const totalCategoryDurationMs = activityItems.reduce(
      (sum, act) => sum + act.durationMs,
      0,
    );

    return {
      id: data.categoryDetails._id,
      name: data.categoryDetails.name,
      color: data.categoryDetails.color,
      isProductive: data.categoryDetails.isProductive,
      totalDurationMs: totalCategoryDurationMs,
      // Sort activities within this category by duration, descending (longest first).
      activities: activityItems.sort((a, b) => b.durationMs - a.durationMs),
    };
  });

  return result;
};
