import { ActiveWindowEvent, Category } from "@shared/types";
import type { ProcessedEventBlock } from "../components/DashboardView";
import {
  MAX_GAP_BETWEEN_EVENTS_MS,
  SYSTEM_EVENT_NAMES,
  IDLE_CATEGORY_ID,
  IDLE_CATEGORY_COLOR,
  IDLE_CATEGORY_NAME,
} from "../lib/constants";

/**
 * Creates a synthetic idle block for gaps between events
 */
function createIdleBlock(startTime: Date, endTime: Date): ProcessedEventBlock {
  const durationMs = endTime.getTime() - startTime.getTime();
  return {
    startTime,
    endTime,
    durationMs,
    name: IDLE_CATEGORY_NAME,
    title: undefined,
    url: undefined,
    categoryId: IDLE_CATEGORY_ID,
    categoryName: IDLE_CATEGORY_NAME,
    categoryColor: IDLE_CATEGORY_COLOR,
    isProductive: undefined, // Neither productive nor unproductive
    originalEvent: {
      ownerName: IDLE_CATEGORY_NAME,
      type: "idle",
      timestamp: startTime.getTime(),
      userId: "",
      durationMs,
    },
  };
}

export function generateProcessedEventBlocks(
  events: ActiveWindowEvent[],
  categories: Category[],
): ProcessedEventBlock[] {
  console.log(`🔧 Processing ${events.length} events`);

  const chronologicallySortedEvents = [...events]
    .filter((event) => typeof event.timestamp === "number")
    .sort((a, b) => (a.timestamp as number) - (b.timestamp as number));

  console.log(
    `📅 After timestamp filter: ${chronologicallySortedEvents.length} events`,
  );
  console.log(
    `📝 Sample timestamp types:`,
    events.slice(0, 3).map((e) => ({
      owner: e.ownerName,
      timestamp: e.timestamp,
      type: typeof e.timestamp,
    })),
  );

  const categoriesMap = new Map<string, Category>(
    categories.map((cat) => [cat._id, cat]),
  );
  const blocks: ProcessedEventBlock[] = [];
  let skippedSystem = 0;
  let skippedUncategorized = 0;
  let idleBlocksCreated = 0;

  for (let i = 0; i < chronologicallySortedEvents.length; i++) {
    const event = chronologicallySortedEvents[i];
    if (SYSTEM_EVENT_NAMES.includes(event.ownerName)) {
      skippedSystem++;
      continue;
    }
    if (!event.categoryId && event.type !== "manual") {
      skippedUncategorized++;
      continue;
    }

    const eventStartTime = new Date(event.timestamp as number);
    let eventEndTime: Date;
    let eventDurationMs: number;
    let idleStartTime: Date | null = null;
    let idleEndTime: Date | null = null;

    if (event.type === "manual" && event.durationMs) {
      eventDurationMs = event.durationMs;
      eventEndTime = new Date(eventStartTime.getTime() + eventDurationMs);
    } else if (i < chronologicallySortedEvents.length - 1) {
      const nextEventTime = new Date(
        chronologicallySortedEvents[i + 1].timestamp as number,
      ).getTime();
      const rawDurationMs = nextEventTime - eventStartTime.getTime();

      if (rawDurationMs > MAX_GAP_BETWEEN_EVENTS_MS) {
        // Cap the event duration and create idle block for the gap
        eventDurationMs = MAX_GAP_BETWEEN_EVENTS_MS;
        eventEndTime = new Date(eventStartTime.getTime() + eventDurationMs);

        // Idle block spans from capped event end to next event start
        idleStartTime = eventEndTime;
        idleEndTime = new Date(nextEventTime);
      } else {
        eventDurationMs = rawDurationMs;
        eventEndTime = new Date(eventStartTime.getTime() + eventDurationMs);
      }
    } else {
      const now = new Date();
      const potentialEndTime = new Date(
        eventStartTime.getTime() + MAX_GAP_BETWEEN_EVENTS_MS,
      );
      eventEndTime = now < potentialEndTime ? now : potentialEndTime;
      eventDurationMs = eventEndTime.getTime() - eventStartTime.getTime();
    }

    const category = event.categoryId
      ? categoriesMap.get(event.categoryId)
      : undefined;
    blocks.push({
      startTime: eventStartTime,
      endTime: eventEndTime,
      durationMs: eventDurationMs,
      name: event.ownerName,
      title: event.title || undefined,
      url: event.url || undefined,
      categoryId: event.categoryId,
      categoryName: category?.name,
      categoryColor: category?.color,
      isProductive: category?.isProductive,
      originalEvent: event,
    });

    // Add idle block if there's a gap
    if (idleStartTime && idleEndTime) {
      blocks.push(createIdleBlock(idleStartTime, idleEndTime));
      idleBlocksCreated++;
    }
  }

  console.log(
    `✅ Generated ${blocks.length} blocks (${idleBlocksCreated} idle, skipped ${skippedSystem} system, ${skippedUncategorized} uncategorized)`,
  );
  return blocks;
}
