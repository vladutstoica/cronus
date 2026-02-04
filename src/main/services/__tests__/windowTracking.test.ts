import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks -- declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../../database/services/users', () => ({
  getOrCreateLocalUser: vi.fn(() => ({ id: 'test-user-id' })),
}));

vi.mock('../../database/services/categories', () => ({
  getCategoriesByUserId: vi.fn(() => []),
}));

let createEventCounter = 0;
vi.mock('../../database/services/activeWindowEvents', () => ({
  createActiveWindowEvent: vi.fn(() => {
    createEventCounter++;
    return {
      id: `event-${createEventCounter}`,
      user_id: 'test-user-id',
      window_id: `win-${createEventCounter}`,
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }),
  updateActiveWindowEvent: vi.fn(),
  recategorizeEventsByIdentifier: vi.fn(),
}));

vi.mock('../../database/services/settings', () => ({
  getBooleanSetting: vi.fn(() => false),
  getSetting: vi.fn(() => undefined),
}));

vi.mock('../categorization', () => ({
  getAICategoryChoice: vi.fn(),
  getAISummaryForBlock: vi.fn(),
  clearCategorizationCacheForIdentifier: vi.fn(),
  CategoryChoice: {},
}));

vi.mock('../ruleBasedCategorization', () => ({
  getRuleBasedCategoryChoice: vi.fn(),
}));

vi.mock('../ollama', () => ({
  isAIEnabled: vi.fn(() => false),
}));

vi.mock('../aiRequestQueue', () => ({
  aiRequestQueue: { add: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import {
  processWindowEvent,
  updateEventDuration,
  endWindowEvent,
  sweepStaleActiveEvents,
  startActiveEventsSweep,
  stopActiveEventsSweep,
  clearAllActiveEvents,
  clearNonTrackedAppsCache,
  WindowEventDetails,
} from '../windowTracking';

import { updateActiveWindowEvent } from '../../database/services/activeWindowEvents';

// Typed reference to the mock for cleaner assertions
const mockUpdateEvent = updateActiveWindowEvent as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEventDetails(
  overrides: Partial<WindowEventDetails> = {},
): WindowEventDetails {
  return {
    windowId: 'win-1',
    ownerName: 'TestApp',
    title: 'Test Window',
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Utility to check whether a windowId is tracked in the internal activeEvents
 * Map. We call updateEventDuration and check whether updateActiveWindowEvent
 * was invoked -- if it was, the entry exists; otherwise it does not.
 */
async function isWindowTracked(windowId: string): Promise<boolean> {
  mockUpdateEvent.mockClear();
  await updateEventDuration(windowId, 1);
  return mockUpdateEvent.mock.calls.length > 0;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('windowTracking', () => {
  beforeEach(() => {
    createEventCounter = 0;
    vi.clearAllMocks();
    // Ensure no leftover tracked windows between tests
    clearAllActiveEvents();
    // VIB-73: Clear non-tracked apps cache between tests
    clearNonTrackedAppsCache();
    vi.clearAllMocks(); // Clear again after clearAllActiveEvents side-effects
  });

  afterEach(() => {
    stopActiveEventsSweep();
  });

  // =========================================================================
  // VIB-53: Race condition fix -- processWindowEvent
  // =========================================================================
  describe('VIB-53: Race condition fix', () => {
    it('should finalize old event when processing new event for same windowId', async () => {
      const firstTimestamp = new Date(Date.now() - 5000);
      const secondTimestamp = new Date();

      // First event for windowId "win-1"
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-1', timestamp: firstTimestamp }),
      );

      // The first call creates the event but should NOT finalize anything
      expect(mockUpdateEvent).not.toHaveBeenCalled();

      // Second event for the SAME windowId "win-1"
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-1', timestamp: secondTimestamp }),
      );

      // The second call should finalize the first event by updating its duration
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'event-1', // The first event's ID
        expect.objectContaining({
          duration_ms: expect.any(Number),
        }),
      );

      // The finalized duration should be positive (time elapsed since firstTimestamp)
      const actualDuration = mockUpdateEvent.mock.calls[0][1].duration_ms;
      expect(actualDuration).toBeGreaterThan(0);
    });

    it('should not finalize anything when processing first event for a windowId', async () => {
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-new' }),
      );

      // No prior event exists for "win-new", so no finalization should occur
      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it('should track different windowIds independently', async () => {
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-A', timestamp: new Date(Date.now() - 5000) }),
      );
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-B', timestamp: new Date(Date.now() - 3000) }),
      );

      // No finalization should happen -- each windowId is new
      expect(mockUpdateEvent).not.toHaveBeenCalled();

      // Now replace win-A
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-A', timestamp: new Date() }),
      );

      // Only win-A's first event should be finalized
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'event-1', // First event (win-A)
        expect.objectContaining({ duration_ms: expect.any(Number) }),
      );

      // win-B should still be tracked
      expect(await isWindowTracked('win-B')).toBe(true);
    });
  });

  // =========================================================================
  // VIB-55: Memory leak fix -- sweepStaleActiveEvents
  // =========================================================================
  describe('VIB-55: sweepStaleActiveEvents', () => {
    it('should remove stale events older than 30 minutes', async () => {
      const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago

      // Create an event with a stale timestamp
      await processWindowEvent(
        makeEventDetails({ windowId: 'stale-win', timestamp: staleTimestamp }),
      );

      mockUpdateEvent.mockClear();

      // Sweep should finalize and remove the stale event
      sweepStaleActiveEvents();

      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          duration_ms: expect.any(Number),
        }),
      );

      // The duration should be approximately 31+ minutes
      const durationMs = mockUpdateEvent.mock.calls[0][1].duration_ms;
      expect(durationMs).toBeGreaterThanOrEqual(31 * 60 * 1000);

      // The entry should no longer be tracked
      expect(await isWindowTracked('stale-win')).toBe(false);
    });

    it('should not remove recent events (younger than 30 minutes)', async () => {
      const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      await processWindowEvent(
        makeEventDetails({ windowId: 'recent-win', timestamp: recentTimestamp }),
      );

      mockUpdateEvent.mockClear();

      sweepStaleActiveEvents();

      // No finalization should happen -- the event is recent
      expect(mockUpdateEvent).not.toHaveBeenCalled();

      // The entry should still be tracked
      expect(await isWindowTracked('recent-win')).toBe(true);
    });

    it('should sweep only stale events and keep recent ones', async () => {
      const staleTime = new Date(Date.now() - 35 * 60 * 1000);
      const recentTime = new Date(Date.now() - 2 * 60 * 1000);

      await processWindowEvent(
        makeEventDetails({ windowId: 'stale-1', timestamp: staleTime }),
      );
      await processWindowEvent(
        makeEventDetails({ windowId: 'recent-1', timestamp: recentTime }),
      );

      mockUpdateEvent.mockClear();

      sweepStaleActiveEvents();

      // Only the stale event should have been finalized
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'event-1', // stale-1's event
        expect.objectContaining({ duration_ms: expect.any(Number) }),
      );

      // Stale entry gone, recent entry still tracked
      expect(await isWindowTracked('stale-1')).toBe(false);
      expect(await isWindowTracked('recent-1')).toBe(true);
    });
  });

  // =========================================================================
  // VIB-55: clearAllActiveEvents
  // =========================================================================
  describe('VIB-55: clearAllActiveEvents', () => {
    it('should finalize and clear all active events', async () => {
      const ts1 = new Date(Date.now() - 10000);
      const ts2 = new Date(Date.now() - 5000);

      await processWindowEvent(
        makeEventDetails({ windowId: 'win-X', timestamp: ts1 }),
      );
      await processWindowEvent(
        makeEventDetails({ windowId: 'win-Y', timestamp: ts2 }),
      );

      mockUpdateEvent.mockClear();

      clearAllActiveEvents();

      // Both events should be finalized
      expect(mockUpdateEvent).toHaveBeenCalledTimes(2);

      // Check that both event IDs were finalized with positive durations
      const calledIds = mockUpdateEvent.mock.calls.map(
        (call: [string, { duration_ms: number }]) => call[0],
      );
      expect(calledIds).toContain('event-1');
      expect(calledIds).toContain('event-2');

      for (const call of mockUpdateEvent.mock.calls) {
        expect(call[1].duration_ms).toBeGreaterThan(0);
      }

      // All entries should be gone
      expect(await isWindowTracked('win-X')).toBe(false);
      expect(await isWindowTracked('win-Y')).toBe(false);
    });

    it('should be a no-op when there are no active events', () => {
      mockUpdateEvent.mockClear();

      clearAllActiveEvents();

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // VIB-55: startActiveEventsSweep / stopActiveEventsSweep
  // =========================================================================
  describe('VIB-55: startActiveEventsSweep / stopActiveEventsSweep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      stopActiveEventsSweep();
      vi.useRealTimers();
    });

    it('should set up a periodic sweep and tear it down', async () => {
      // Create a stale event before starting the sweep
      const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000);
      await processWindowEvent(
        makeEventDetails({ windowId: 'sweep-stale', timestamp: staleTimestamp }),
      );

      mockUpdateEvent.mockClear();

      startActiveEventsSweep();

      // Advance time by 10 minutes (the sweep interval)
      vi.advanceTimersByTime(10 * 60 * 1000);

      // The sweep should have finalized the stale event
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ duration_ms: expect.any(Number) }),
      );

      mockUpdateEvent.mockClear();

      // Stop the sweep
      stopActiveEventsSweep();

      // Create another stale event
      // Need to restore real timers briefly for processWindowEvent timestamp handling
      const anotherStaleTs = new Date(Date.now() - 35 * 60 * 1000);
      await processWindowEvent(
        makeEventDetails({ windowId: 'sweep-stale-2', timestamp: anotherStaleTs }),
      );

      mockUpdateEvent.mockClear();

      // Advance time again -- sweep should NOT run because it was stopped
      vi.advanceTimersByTime(10 * 60 * 1000);

      // Only check that no sweep-driven finalization occurred
      // (the mock may have been called by processWindowEvent itself, so we
      // cleared after that call)
      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it('should not create multiple intervals when called twice', async () => {
      const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000);
      await processWindowEvent(
        makeEventDetails({ windowId: 'dup-check', timestamp: staleTimestamp }),
      );
      mockUpdateEvent.mockClear();

      startActiveEventsSweep();
      startActiveEventsSweep(); // second call should be a no-op

      vi.advanceTimersByTime(10 * 60 * 1000);

      // If two intervals were created, the event would be finalized twice
      // (or the mock would be called more times). Since the entry is deleted
      // after the first sweep, exactly one call is expected.
      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // VIB-55: Size guard in processWindowEvent (MAX_ACTIVE_EVENTS)
  // =========================================================================
  describe('VIB-55: Size guard triggers sweep when exceeding MAX_ACTIVE_EVENTS', () => {
    it('should trigger a sweep when the active events map exceeds 500 entries', async () => {
      // Populate 500 events with stale timestamps so the sweep clears them
      const staleTimestamp = new Date(Date.now() - 35 * 60 * 1000);

      for (let i = 0; i < 500; i++) {
        await processWindowEvent(
          makeEventDetails({
            windowId: `bulk-win-${i}`,
            timestamp: staleTimestamp,
          }),
        );
      }

      mockUpdateEvent.mockClear();

      // The 501st event should push the map over MAX_ACTIVE_EVENTS and
      // trigger sweepStaleActiveEvents, which removes all 500 stale entries.
      await processWindowEvent(
        makeEventDetails({
          windowId: 'trigger-win',
          timestamp: new Date(),
        }),
      );

      // updateActiveWindowEvent should have been called for each swept stale
      // event. Because the map exceeded 500 after adding the 501st entry,
      // the sweep runs and finalizes stale entries.
      expect(mockUpdateEvent.mock.calls.length).toBeGreaterThanOrEqual(500);
    });
  });

  // =========================================================================
  // endWindowEvent
  // =========================================================================
  describe('endWindowEvent', () => {
    it('should remove the entry from the active events map', async () => {
      await processWindowEvent(
        makeEventDetails({ windowId: 'end-win' }),
      );

      // Confirm it is tracked
      expect(await isWindowTracked('end-win')).toBe(true);

      await endWindowEvent('end-win');

      // Confirm it is no longer tracked
      expect(await isWindowTracked('end-win')).toBe(false);
    });
  });

  // =========================================================================
  // updateEventDuration
  // =========================================================================
  describe('updateEventDuration', () => {
    it('should update the duration of a tracked event', async () => {
      await processWindowEvent(
        makeEventDetails({ windowId: 'dur-win' }),
      );
      mockUpdateEvent.mockClear();

      await updateEventDuration('dur-win', 12345);

      expect(mockUpdateEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.any(String),
        { duration_ms: 12345 },
      );
    });

    it('should be a no-op for an unknown windowId', async () => {
      mockUpdateEvent.mockClear();

      await updateEventDuration('nonexistent', 999);

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });
});
