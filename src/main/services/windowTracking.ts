import { getOrCreateLocalUser } from "../database/services/users";
import { getCategoriesByUserId } from "../database/services/categories";
import {
  createActiveWindowEvent,
  updateActiveWindowEvent,
  recategorizeEventsByIdentifier,
} from "../database/services/activeWindowEvents";
import {
  getAICategoryChoice,
  getAISummaryForBlock,
  CategoryChoice,
  clearCategorizationCacheForIdentifier,
} from "./categorization";
import { getRuleBasedCategoryChoice } from "./ruleBasedCategorization";
import { getBooleanSetting } from "../database/services/settings";
import { isAIEnabled } from "./ollama";
import { aiRequestQueue } from "./aiRequestQueue";

export interface WindowEventDetails {
  windowId: string;
  ownerName?: string;
  type?: string;
  browser?: string;
  title?: string;
  url?: string;
  content?: string;
  timestamp: Date;
  localScreenshotPath?: string;
  durationMs?: number;
}

// Store active events in memory to update durations
const activeEvents = new Map<string, { eventId: string; startTime: Date }>();

/**
 * Process a new window event
 */
export async function processWindowEvent(
  eventDetails: WindowEventDetails,
): Promise<any | null> {
  try {
    const user = getOrCreateLocalUser();
    const categorizationEnabled = getBooleanSetting(
      "categorization_enabled",
      true,
    );

    // Create initial event without categorization
    // Note: screenshot_path is no longer used - OCR text is stored in content field
    console.log(
      `[WindowTracking] Processing event for ${eventDetails.ownerName}, content length: ${eventDetails.content?.length || 0}`,
    );
    const createdEvent = createActiveWindowEvent({
      user_id: user.id,
      window_id: eventDetails.windowId,
      owner_name: eventDetails.ownerName,
      type: eventDetails.type,
      browser: eventDetails.browser,
      title: eventDetails.title,
      url: eventDetails.url,
      content: eventDetails.content,
      timestamp: eventDetails.timestamp.toISOString(),
      duration_ms: eventDetails.durationMs || 0,
    });

    // Track this event for duration updates
    activeEvents.set(eventDetails.windowId, {
      eventId: createdEvent.id,
      startTime: eventDetails.timestamp,
    });

    // Categorize asynchronously using request queue (prevents overwhelming AI provider)
    if (categorizationEnabled) {
      aiRequestQueue.add(createdEvent.id, async () => {
        try {
          await categorizeEventAsync(createdEvent.id, eventDetails, user.id);
        } catch (err) {
          console.error("Error categorizing event:", err);
        }
      });
    }

    // Return the event with timestamp as number and camelCase properties for frontend compatibility
    return {
      _id: createdEvent.id,
      userId: createdEvent.user_id,
      windowId: createdEvent.window_id,
      ownerName: createdEvent.owner_name,
      type: createdEvent.type,
      browser: createdEvent.browser,
      title: createdEvent.title,
      url: createdEvent.url,
      content: createdEvent.content,
      categoryId: createdEvent.category_id,
      categoryReasoning: createdEvent.category_reasoning,
      llmSummary: createdEvent.llm_summary,
      timestamp: new Date(createdEvent.timestamp).getTime(),
      screenshotPath: createdEvent.screenshot_path,
      durationMs: createdEvent.duration_ms,
      lastCategorizationAt: createdEvent.last_categorization_at,
      generatedTitle: createdEvent.generated_title,
      oldCategoryId: createdEvent.old_category_id,
      oldCategoryReasoning: createdEvent.old_category_reasoning,
      oldLlmSummary: createdEvent.old_llm_summary,
      createdAt: createdEvent.created_at,
      updatedAt: createdEvent.updated_at,
    };
  } catch (error) {
    console.error("Error processing window event:", error);
    return null;
  }
}

/**
 * Update duration for an active window event
 */
export async function updateEventDuration(
  windowId: string,
  durationMs: number,
): Promise<void> {
  const activeEvent = activeEvents.get(windowId);
  if (!activeEvent) return;

  try {
    updateActiveWindowEvent(activeEvent.eventId, {
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error("Error updating event duration:", error);
  }
}

/**
 * End tracking for a window event
 */
export async function endWindowEvent(windowId: string): Promise<void> {
  activeEvents.delete(windowId);
}

/**
 * Categorize an event asynchronously
 */
async function categorizeEventAsync(
  eventId: string,
  eventDetails: WindowEventDetails,
  userId: string,
): Promise<void> {
  try {
    const user = getOrCreateLocalUser();
    const categories = getCategoriesByUserId(userId);

    if (categories.length === 0) {
      console.warn("No categories available for categorization");
      return;
    }

    const activityDetails = {
      ownerName: eventDetails.ownerName,
      title: eventDetails.title,
      url: eventDetails.url,
      content: eventDetails.content,
      type: eventDetails.type,
      browser: eventDetails.browser,
    };

    let categoryChoice: CategoryChoice | null = null;

    // Try AI categorization first if enabled and available
    if (isAIEnabled()) {
      // Parse goals properly for AI categorization
      let userGoals = "";
      try {
        if (typeof user.user_projects_and_goals === "string") {
          const parsed = JSON.parse(user.user_projects_and_goals);
          // Convert array to readable string
          userGoals = Array.isArray(parsed) ? parsed.join("\n") : parsed;
        } else if (Array.isArray(user.user_projects_and_goals)) {
          userGoals = user.user_projects_and_goals.join("\n");
        } else {
          userGoals = user.user_projects_and_goals || "";
        }
      } catch {
        // If parsing fails, use as plain text
        userGoals = user.user_projects_and_goals || "";
      }

      // getAICategoryChoice now handles provider availability checking internally
      categoryChoice = await getAICategoryChoice(
        userGoals,
        categories.map((c) => ({ name: c.name, description: c.description })),
        activityDetails,
      );
    }

    // Fall back to rule-based categorization if AI failed or is disabled
    if (!categoryChoice) {
      categoryChoice = getRuleBasedCategoryChoice(
        categories.map((c) => ({ name: c.name, description: c.description })),
        activityDetails,
      );
    }

    if (!categoryChoice) {
      console.warn("Failed to categorize event");
      return;
    }

    // Find the category ID by name
    const matchedCategory = categories.find(
      (c) =>
        c.name.toLowerCase() ===
        categoryChoice!.chosenCategoryName.toLowerCase(),
    );

    if (!matchedCategory) {
      console.warn(`Category not found: ${categoryChoice.chosenCategoryName}`);
      return;
    }

    // Update the event with categorization
    updateActiveWindowEvent(eventId, {
      category_id: matchedCategory.id,
      category_reasoning: categoryChoice.reasoning,
      llm_summary: categoryChoice.summary,
      last_categorization_at: new Date().toISOString(),
    });

    console.log(`Categorized event ${eventId} as ${matchedCategory.name}`);
  } catch (error) {
    console.error("Error in categorizeEventAsync:", error);
  }
}

/**
 * Recategorize an existing event
 */
export async function recategorizeEvent(
  eventId: string,
  newCategoryId: string,
): Promise<boolean> {
  try {
    const result = updateActiveWindowEvent(eventId, {
      old_category_id: undefined, // Will be set from current category_id in a transaction
      category_id: newCategoryId,
      last_categorization_at: new Date().toISOString(),
    });

    return result !== undefined;
  } catch (error) {
    console.error("Error recategorizing event:", error);
    return false;
  }
}

/**
 * Recategorize multiple events by identifier within a time range
 */
export async function recategorizeEventsByIdentifierService(
  identifier: string,
  itemType: "app" | "website",
  startDateMs: number,
  endDateMs: number,
  newCategoryId: string,
): Promise<number> {
  try {
    const user = getOrCreateLocalUser();
    const startDate = new Date(startDateMs);
    const endDate = new Date(endDateMs);

    const updatedCount = recategorizeEventsByIdentifier(
      user.id,
      identifier,
      itemType,
      startDate,
      endDate,
      newCategoryId,
    );

    console.log(
      `Recategorized ${updatedCount} events with identifier "${identifier}" to category ${newCategoryId}`,
    );

    // Clear categorization cache for this identifier so future events use the new category
    const cacheCleared = clearCategorizationCacheForIdentifier(
      identifier,
      itemType,
    );
    console.log(`Cleared ${cacheCleared} cache entries for "${identifier}"`);

    return updatedCount;
  } catch (error) {
    console.error("Error recategorizing events by identifier:", error);
    throw error;
  }
}
