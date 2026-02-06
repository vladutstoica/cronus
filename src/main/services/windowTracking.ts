import { getOrCreateLocalUser } from "../database/services/users";
import { getCategoriesByUserId } from "../database/services/categories";
import {
  createActiveWindowEvent,
  updateActiveWindowEvent,
  recategorizeEventsByIdentifier,
  getEventById,
} from "../database/services/activeWindowEvents";
import {
  getAICategoryChoice,
  getAISummaryForBlock,
  CategoryChoice,
  clearCategorizationCacheForIdentifier,
} from "./categorization";
import { getRuleBasedCategoryChoice } from "./ruleBasedCategorization";
import { getBooleanSetting, getSetting } from "../database/services/settings";
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

// VIB-55: Constants to prevent unbounded Map growth
const STALE_EVENT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ACTIVE_EVENTS = 500;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let sweepIntervalId: ReturnType<typeof setInterval> | null = null;

// VIB-73: Module-level cache for non-tracked apps
let nonTrackedAppsCache: string[] | null = null;
let nonTrackedAppsCacheTime = 0;
const NON_TRACKED_APPS_CACHE_TTL = 30_000; // 30 seconds

function getNonTrackedApps(): string[] {
  const now = Date.now();
  if (
    nonTrackedAppsCache &&
    now - nonTrackedAppsCacheTime < NON_TRACKED_APPS_CACHE_TTL
  ) {
    return nonTrackedAppsCache;
  }

  const json = getSetting("non_tracked_apps");
  if (json) {
    try {
      nonTrackedAppsCache = JSON.parse(json);
      nonTrackedAppsCacheTime = now;
      return nonTrackedAppsCache!;
    } catch {
      // ignore parse errors
    }
  }
  nonTrackedAppsCache = [];
  nonTrackedAppsCacheTime = now;
  return [];
}

/**
 * VIB-73: Clear the non-tracked apps cache (called when settings change)
 */
export function clearNonTrackedAppsCache(): void {
  nonTrackedAppsCache = null;
}

/**
 * Process a new window event
 */
export async function processWindowEvent(
  eventDetails: WindowEventDetails,
): Promise<Record<string, unknown> | null> {
  try {
    // VIB-73: Check if app is in non-tracked list
    if (eventDetails.ownerName) {
      const nonTrackedApps = getNonTrackedApps();
      if (nonTrackedApps.includes(eventDetails.ownerName)) {
        return null;
      }
    }

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

    // VIB-53: Finalize the previous event for this windowId before overwriting
    const existingEntry = activeEvents.get(eventDetails.windowId);
    if (existingEntry) {
      const finalDuration = Date.now() - existingEntry.startTime.getTime();
      console.warn(
        `[WindowTracking] Replacing active event ${existingEntry.eventId} for windowId=${eventDetails.windowId} (duration=${finalDuration}ms). Previous event was not ended.`,
      );
      try {
        updateActiveWindowEvent(existingEntry.eventId, {
          duration_ms: finalDuration,
        });
      } catch (err) {
        console.error(
          `[WindowTracking] Failed to finalize replaced event ${existingEntry.eventId}:`,
          err,
        );
      }
    }

    // Track this event for duration updates
    activeEvents.set(eventDetails.windowId, {
      eventId: createdEvent.id,
      startTime: eventDetails.timestamp,
    });

    // VIB-55: Trigger sweep if Map exceeds the maximum size
    if (activeEvents.size > MAX_ACTIVE_EVENTS) {
      console.warn(
        `[WindowTracking] activeEvents size (${activeEvents.size}) exceeds MAX_ACTIVE_EVENTS (${MAX_ACTIVE_EVENTS}). Triggering sweep.`,
      );
      sweepStaleActiveEvents();
    }

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
 * VIB-55: Sweep stale entries from the activeEvents Map.
 * Entries older than STALE_EVENT_THRESHOLD_MS are finalized in the DB and removed.
 */
export function sweepStaleActiveEvents(): void {
  const now = Date.now();
  let sweptCount = 0;

  for (const [windowId, entry] of activeEvents) {
    const age = now - entry.startTime.getTime();
    if (age > STALE_EVENT_THRESHOLD_MS) {
      try {
        updateActiveWindowEvent(entry.eventId, { duration_ms: age });
      } catch (err) {
        console.error(
          `[WindowTracking] Failed to finalize stale event ${entry.eventId}:`,
          err,
        );
      }
      activeEvents.delete(windowId);
      sweptCount++;
    }
  }

  if (sweptCount > 0) {
    console.log(
      `[WindowTracking] Swept ${sweptCount} stale active event(s). Remaining: ${activeEvents.size}`,
    );
  }
}

/**
 * VIB-55: Start periodic sweep of stale active events.
 */
export function startActiveEventsSweep(): void {
  if (sweepIntervalId !== null) {
    return;
  }
  sweepIntervalId = setInterval(sweepStaleActiveEvents, SWEEP_INTERVAL_MS);
  console.log(
    `[WindowTracking] Started active events sweep (interval=${SWEEP_INTERVAL_MS}ms)`,
  );
}

/**
 * VIB-55: Stop periodic sweep of stale active events.
 */
export function stopActiveEventsSweep(): void {
  if (sweepIntervalId !== null) {
    clearInterval(sweepIntervalId);
    sweepIntervalId = null;
    console.log("[WindowTracking] Stopped active events sweep");
  }
}

/**
 * VIB-55: Finalize and remove ALL active events (e.g., on app sleep/lock).
 */
export function clearAllActiveEvents(): void {
  const now = Date.now();
  let clearedCount = 0;

  for (const [windowId, entry] of activeEvents) {
    const finalDuration = now - entry.startTime.getTime();
    try {
      updateActiveWindowEvent(entry.eventId, { duration_ms: finalDuration });
    } catch (err) {
      console.error(
        `[WindowTracking] Failed to finalize event ${entry.eventId} during clearAll:`,
        err,
      );
    }
    activeEvents.delete(windowId);
    clearedCount++;
  }

  console.log(`[WindowTracking] Cleared all ${clearedCount} active event(s)`);
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
          const parsed: unknown = JSON.parse(user.user_projects_and_goals);
          // Convert array to readable string
          userGoals = Array.isArray(parsed)
            ? parsed.join("\n")
            : String(parsed);
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

    if (!categoryChoice || !categoryChoice.chosenCategoryName) {
      console.warn("Failed to categorize event or missing category name");
      return;
    }

    // Find the category ID by name
    const matchedCategory = categories.find(
      (c) =>
        c.name.toLowerCase() ===
        categoryChoice.chosenCategoryName.toLowerCase(),
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
    const currentEvent = getEventById(eventId);
    const result = updateActiveWindowEvent(eventId, {
      old_category_id: currentEvent?.category_id,
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
