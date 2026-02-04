import { describe, it, expect } from "vitest";
import {
  MAX_GAP_MS,
  getTimestampMs,
  sortEventsByTimestamp,
  computeEventDurations,
} from "../utils/eventDurations";
import type { ActiveWindowEvent } from "../database/services/activeWindowEvents";

/** Helper to build a minimal ActiveWindowEvent with just the fields the utility touches. */
function makeEvent(
  overrides: Partial<ActiveWindowEvent> = {},
): ActiveWindowEvent {
  const { timestamp = "", ...rest } = overrides;
  return {
    id: "evt-1",
    user_id: "user-1",
    duration_ms: 0,
    created_at: "",
    updated_at: "",
    ...rest,
    timestamp,
  };
}

describe("eventDurations", () => {
  // ── Constants ────────────────────────────────────────────────────────

  describe("MAX_GAP_MS", () => {
    it("should equal 5 minutes in milliseconds", () => {
      expect(MAX_GAP_MS).toBe(5 * 60 * 1000);
    });
  });

  // ── getTimestampMs ───────────────────────────────────────────────────

  describe("getTimestampMs", () => {
    it("should return the value unchanged when given a number", () => {
      expect(getTimestampMs(1700000000000)).toBe(1700000000000);
    });

    it("should parse an ISO string into Unix milliseconds", () => {
      const iso = "2024-01-15T10:30:00.000Z";
      expect(getTimestampMs(iso)).toBe(new Date(iso).getTime());
    });

    it("should handle a numeric value stored as a string", () => {
      // SQLite may return the numeric timestamp as a string in some edge cases
      const numericStr = "1700000000000";
      expect(getTimestampMs(numericStr)).toBe(
        new Date("1700000000000").getTime(),
      );
    });
  });

  // ── sortEventsByTimestamp ────────────────────────────────────────────

  describe("sortEventsByTimestamp", () => {
    it("should return events sorted in ascending chronological order", () => {
      const events = [
        makeEvent({ id: "c" }),
        makeEvent({ id: "a" }),
        makeEvent({ id: "b" }),
      ] as ActiveWindowEvent[];

      // Simulate SQLite returning numeric timestamps (the common case)
      (events[0] as any).timestamp = 1700000003000;
      (events[1] as any).timestamp = 1700000001000;
      (events[2] as any).timestamp = 1700000002000;

      const sorted = sortEventsByTimestamp(events);
      expect(sorted.map((e) => e.id)).toEqual(["a", "b", "c"]);
    });

    it("should not mutate the original array", () => {
      const events = [makeEvent({ id: "b" }), makeEvent({ id: "a" })];
      (events[0] as any).timestamp = 2000;
      (events[1] as any).timestamp = 1000;

      const sorted = sortEventsByTimestamp(events);
      expect(sorted).not.toBe(events);
      expect(events[0].id).toBe("b"); // original untouched
    });

    it("should return an empty array when given no events", () => {
      expect(sortEventsByTimestamp([])).toEqual([]);
    });
  });

  // ── computeEventDurations ────────────────────────────────────────────

  describe("computeEventDurations", () => {
    const BASE = 1700000000000; // arbitrary fixed base timestamp

    it("should return an empty array when given no events", () => {
      expect(computeEventDurations([])).toEqual([]);
    });

    it("should compute duration for a single event using nowMs", () => {
      const event = makeEvent({ id: "only", timestamp: "" });
      (event as any).timestamp = BASE;

      const nowMs = BASE + 60_000; // 1 minute later
      const result = computeEventDurations([event], nowMs);

      expect(result).toHaveLength(1);
      expect(result[0].eventTimeMs).toBe(BASE);
      expect(result[0].durationMs).toBe(60_000);
      expect(result[0].event).toBe(event);
    });

    it("should cap the last event duration at MAX_GAP_MS", () => {
      const event = makeEvent({ id: "only", timestamp: "" });
      (event as any).timestamp = BASE;

      const nowMs = BASE + 10 * 60 * 1000; // 10 minutes later
      const result = computeEventDurations([event], nowMs);

      expect(result).toHaveLength(1);
      expect(result[0].durationMs).toBe(MAX_GAP_MS);
    });

    it("should compute inter-event gaps for consecutive events", () => {
      const e1 = makeEvent({ id: "e1", timestamp: "" });
      const e2 = makeEvent({ id: "e2", timestamp: "" });
      const e3 = makeEvent({ id: "e3", timestamp: "" });
      (e1 as any).timestamp = BASE;
      (e2 as any).timestamp = BASE + 30_000; // 30s gap
      (e3 as any).timestamp = BASE + 90_000; // 60s gap

      const nowMs = BASE + 120_000; // 30s after last event
      const result = computeEventDurations([e1, e2, e3], nowMs);

      expect(result).toHaveLength(3);
      expect(result[0].durationMs).toBe(30_000); // e1 -> e2
      expect(result[1].durationMs).toBe(60_000); // e2 -> e3
      expect(result[2].durationMs).toBe(30_000); // e3 -> now
    });

    it("should cap inter-event gaps at MAX_GAP_MS", () => {
      const e1 = makeEvent({ id: "e1", timestamp: "" });
      const e2 = makeEvent({ id: "e2", timestamp: "" });
      (e1 as any).timestamp = BASE;
      (e2 as any).timestamp = BASE + 10 * 60 * 1000; // 10 min gap

      const nowMs = BASE + 15 * 60 * 1000;
      const result = computeEventDurations([e1, e2], nowMs);

      expect(result[0].durationMs).toBe(MAX_GAP_MS); // capped
      expect(result[1].durationMs).toBe(MAX_GAP_MS); // also capped
    });

    it("should exclude events with zero or negative duration", () => {
      const e1 = makeEvent({ id: "e1", timestamp: "" });
      const e2 = makeEvent({ id: "e2", timestamp: "" });
      // Two events at the exact same time -> 0ms gap for e1
      (e1 as any).timestamp = BASE;
      (e2 as any).timestamp = BASE;

      const nowMs = BASE + 60_000;
      const result = computeEventDurations([e1, e2], nowMs);

      // e1 has 0 duration (same timestamp as e2) -> excluded
      // e2 has 60s duration (to now) -> included
      expect(result).toHaveLength(1);
      expect(result[0].event.id).toBe("e2");
      expect(result[0].durationMs).toBe(60_000);
    });

    it("should sort unsorted events before computing durations", () => {
      // Pass events in reverse order
      const e1 = makeEvent({ id: "e1", timestamp: "" });
      const e2 = makeEvent({ id: "e2", timestamp: "" });
      (e1 as any).timestamp = BASE;
      (e2 as any).timestamp = BASE + 60_000;

      const nowMs = BASE + 120_000;
      const result = computeEventDurations([e2, e1], nowMs); // reversed input

      expect(result).toHaveLength(2);
      // First result should be e1 (earlier timestamp)
      expect(result[0].event.id).toBe("e1");
      expect(result[0].durationMs).toBe(60_000);
      expect(result[1].event.id).toBe("e2");
      expect(result[1].durationMs).toBe(60_000);
    });

    it("should default nowMs to Date.now() when not provided", () => {
      const event = makeEvent({ id: "only", timestamp: "" });
      const now = Date.now();
      (event as any).timestamp = now - 30_000; // 30s ago

      const result = computeEventDurations([event]);

      expect(result).toHaveLength(1);
      // Duration should be roughly 30 seconds (within tolerance for test execution time)
      expect(result[0].durationMs).toBeGreaterThanOrEqual(29_000);
      expect(result[0].durationMs).toBeLessThanOrEqual(32_000);
    });

    it("should handle string ISO timestamps correctly", () => {
      const isoBase = "2024-06-15T12:00:00.000Z";
      const isoBaseMs = new Date(isoBase).getTime();

      const e1 = makeEvent({ id: "e1", timestamp: isoBase });
      const e2 = makeEvent({
        id: "e2",
        timestamp: new Date(isoBaseMs + 120_000).toISOString(),
      });

      const nowMs = isoBaseMs + 180_000;
      const result = computeEventDurations([e1, e2], nowMs);

      expect(result).toHaveLength(2);
      expect(result[0].durationMs).toBe(120_000);
      expect(result[1].durationMs).toBe(60_000);
    });
  });
});
