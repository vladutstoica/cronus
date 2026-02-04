/**
 * Shared utility for computing event durations from inter-event time gaps.
 *
 * Used by tray IPC handlers (today-stats, hourly-activity, top-apps) to avoid
 * duplicating the sort -> timestamp parse -> gap-capped duration logic.
 */

import type { ActiveWindowEvent } from "../database/services/activeWindowEvents";

/** Maximum gap between consecutive events that counts as active time (5 min). */
export const MAX_GAP_MS = 5 * 60 * 1000;

/** An event paired with its resolved numeric timestamp and computed duration. */
export interface EventWithDuration {
  event: ActiveWindowEvent;
  /** Timestamp as Unix milliseconds. */
  eventTimeMs: number;
  /** Duration in ms, capped at MAX_GAP_MS and guaranteed > 0. */
  durationMs: number;
}

/**
 * Normalise an event timestamp to a Unix-ms number.
 *
 * The database column is typed as `string` but SQLite may return the value as a
 * `number` when the original insert was numeric.  This helper handles both.
 */
export function getTimestampMs(timestamp: string | number): number {
  return typeof timestamp === "number"
    ? timestamp
    : new Date(timestamp).getTime();
}

/**
 * Return a shallow copy of `events` sorted chronologically (ascending) by
 * timestamp.
 */
export function sortEventsByTimestamp(
  events: ActiveWindowEvent[],
): ActiveWindowEvent[] {
  return [...events].sort(
    (a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp),
  );
}

/**
 * Compute gap-capped durations for a list of events.
 *
 * Events are first sorted chronologically.  For every consecutive pair the
 * duration assigned to the earlier event equals `min(gap, MAX_GAP_MS)`.  The
 * last event's duration is `min(now - eventTime, MAX_GAP_MS)`.
 *
 * Only entries with a positive duration are included in the result.
 *
 * @param events – raw events in any order.
 * @param nowMs  – override for `Date.now()`, useful for deterministic tests.
 */
export function computeEventDurations(
  events: ActiveWindowEvent[],
  nowMs: number = Date.now(),
): EventWithDuration[] {
  const sorted = sortEventsByTimestamp(events);
  const results: EventWithDuration[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const eventTimeMs = getTimestampMs(event.timestamp);

    let durationMs: number;
    if (i < sorted.length - 1) {
      const nextTimeMs = getTimestampMs(sorted[i + 1].timestamp);
      durationMs = Math.min(nextTimeMs - eventTimeMs, MAX_GAP_MS);
    } else {
      durationMs = Math.min(nowMs - eventTimeMs, MAX_GAP_MS);
    }

    if (durationMs > 0) {
      results.push({ event, eventTimeMs, durationMs });
    }
  }

  return results;
}
