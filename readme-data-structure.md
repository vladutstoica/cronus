# Data Structures Refactor notes (ARCHIVED - Historical Reference)

> **⚠️ NOTE: This document describes the legacy data flow before recent refactoring.**
> **It is kept for historical reference only and may not reflect the current implementation.**

**Problem**: We currently fetch and store only activeWindowEvents which are snapshots of an app usage. When we want to display them in a timeline or show statistics we need fetch all of the relevant ones and compute on the client.

**Solution**: We will minimize the amount of data we fetch from the server and compute on the client.

## Server-computed Event Types

- [`ActiveWindowEvent`](server/src/models/activeWindowEvent.ts)
  - keep as source of truth
  - only timestamp -> no end time

## Client-computed Event Types

Data specific:

- [`CanonicalBlock`](electron-app/src/renderer/src/lib/dayTimelineHelpers.ts)
  - canonical activity block used by UI
  - contains start and end times

- `SlotActivity` (internal; module-private)
  - per-slot accumulator for durations and eventIds
- `SlotActivityGroup` (internal; module-private)
  - 10‑min bucket for slotting
  - holds a main activity and an allActivities map

Presentational specific:

- [`VisualSegment`]:
  - CanonicalBlock + startMinute/endMinute and percentages for layout (viewport‑agnostic)
- [`DaySegment`](electron-app/src/renderer/src/lib/dayTimelineHelpers.ts)
  - presentation-specific: adds pixel coordinates (`top`, `height`)
  - derived from `VisualSegment` on the client using timeline height

## Current timeline data flow (client)

1. **DashboardView** fetches `activeWindowEventsData` using `getEventsForDateRange`
2. Creates `eventsWithParsedDates` (just date parsing/formatting)
3. Creates `canonicalBlocks` using `generateProcessedEventBlocks()` → `ProcessedEventBlock[]`
   - Handles duration calculation, maps categories, skips system/uncategorized events
4. Stores as `trackedProcessedEvents` state and passes to **CalendarWidget**
5. **CalendarWidget** converts to `trackedCanonicalBlocks` using `convertProcessedToTimeBlocks()`
   - Simple mapping (system filtering already done in step 3)
6. Passes `trackedCanonicalBlocks` to **DayTimeline**
7. **DayTimeline** calls `getTimelineSegmentsForDay()` → `DaySegment[]`

### Why `SlotActivityGroup` and `SlotActivity` exist

**Problem**: Raw events capture every window switch (VS Code → Slack → VS Code → Chrome in 2 minutes), creating visual noise.

**Solution**: 10-minute slots aggregate noisy activity:

- **`SlotActivityGroup`**: Time bucket with `mainActivity` (dominant by duration) and `allActivities` (full breakdown for tooltips)
- **`SlotActivity`**: Per-activity data within slot (duration, eventIds, original block reference)

**Example**: In 10-min slot with VS Code (6min), Slack (3min), Chrome (1min) → shows "VS Code" but tooltip shows all three.

### How slotting works in `getTimelineSegmentsForDay`

1. **Partition**: Manual/calendar → direct mapping; activity blocks → slotting
2. **Build SlotActivityGroups**: 10-min buckets, accumulate durations per activity, pick `mainActivity` by max duration
3. **Merge consecutive SlotActivityGroups** with same `mainActivity`
4. **Convert to `DaySegment[]`** with pixel coordinates, preserving `originalEventIds`

_Future: Server returns `VisualSegment[]` (percentages/minutes), client maps to pixel `DaySegment[]`_
