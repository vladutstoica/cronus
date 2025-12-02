export interface CanonicalBlock {
  _id?: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  name: string;
  description: string;
  url?: string;
  categoryColor?: string;
  categoryId?: string;
  categoryName?: string;
  type: "window" | "browser" | "system" | "manual" | "calendar" | "idle";
  originalEvent?: any;
  originalEventIds?: string[]; // Track all original event IDs that contributed to this block
  isSuggestion?: boolean;
  onAccept?: (e: React.MouseEvent) => void;
  onReject?: (e: React.MouseEvent) => void;
}

interface SlotActivity {
  duration: number;
  block: CanonicalBlock;
  eventIds?: string[]; // Track event IDs that contributed to this activity
}

export const SLOT_DURATION_MINUTES = 10; // The duration of each time slot in minutes, was 5

interface SlotActivityGroup {
  startMinute: number;
  endMinute: number;
  mainActivity: CanonicalBlock | null;
  allActivities: Record<string, SlotActivity>;
}

export interface VisualSegment extends CanonicalBlock {
  _id?: string;
  startMinute: number;
  endMinute: number;
  heightPercentage: number;
  topPercentage: number;
  allActivities: Record<string, SlotActivity>;
  type: "window" | "browser" | "system" | "manual" | "calendar" | "idle";
}

export interface DaySegment extends VisualSegment {
  top: number;
  height: number;
  categoryName?: string;
  isSuggestion?: boolean;
  groupedEvents?: DaySegment[];
}

// Browser detection now uses event.type === "browser" instead of hardcoded names

function mergeConsecutiveSlots(
  slots: SlotActivityGroup[],
): (SlotActivityGroup & { durationMs: number })[] {
  if (slots.length === 0) {
    return [];
  }
  const mergedSlots: (SlotActivityGroup & { durationMs: number })[] = [];
  let currentMergedSlot: SlotActivityGroup & { durationMs: number } = {
    ...slots[0],
    durationMs: slots[0].mainActivity ? SLOT_DURATION_MINUTES * 60 * 1000 : 0,
  };

  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    if (
      slot.mainActivity &&
      currentMergedSlot.mainActivity &&
      slot.mainActivity.name === currentMergedSlot.mainActivity.name &&
      slot.mainActivity.categoryColor ===
        currentMergedSlot.mainActivity.categoryColor
    ) {
      currentMergedSlot.endMinute = slot.endMinute;
      currentMergedSlot.durationMs += SLOT_DURATION_MINUTES * 60 * 1000;
      Object.entries(slot.allActivities).forEach(([key, data]) => {
        if (currentMergedSlot.allActivities[key]) {
          currentMergedSlot.allActivities[key].duration += data.duration;
          // Merge event IDs
          const existingEventIds =
            currentMergedSlot.allActivities[key].eventIds || [];
          const newEventIds = data.eventIds || [];
          currentMergedSlot.allActivities[key].eventIds = [
            ...new Set([...existingEventIds, ...newEventIds]),
          ];
        } else {
          currentMergedSlot.allActivities[key] = {
            ...data,
            eventIds: data.eventIds ? [...data.eventIds] : [],
          };
        }
      });
    } else {
      mergedSlots.push(currentMergedSlot);
      currentMergedSlot = {
        ...slot,
        durationMs: slot.mainActivity ? SLOT_DURATION_MINUTES * 60 * 1000 : 0,
      };
    }
  }
  mergedSlots.push(currentMergedSlot);
  return mergedSlots;
}

function groupOverlappingCalendarSegments(
  calendarSegments: DaySegment[],
): DaySegment[] {
  if (calendarSegments.length === 0) {
    return [];
  }

  // Sort by start time
  const sortedSegments = [...calendarSegments].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  const groups: DaySegment[][] = [];
  let currentGroup: DaySegment[] = [sortedSegments[0]];

  for (let i = 1; i < sortedSegments.length; i++) {
    const lastEventInGroup = currentGroup[currentGroup.length - 1];
    const currentEvent = sortedSegments[i];

    // Check for overlap with the last event in the group.
    // Since they are sorted by start time, we only need to check against the last one.
    if (currentEvent.startTime.getTime() < lastEventInGroup.endTime.getTime()) {
      currentGroup.push(currentEvent);
    } else {
      groups.push(currentGroup);
      currentGroup = [currentEvent];
    }
  }
  groups.push(currentGroup);

  return groups.map((group) => {
    if (group.length === 1) {
      return group[0];
    }

    const firstEvent = group[0];
    const lastEvent = group[group.length - 1];

    const groupStartTime = firstEvent.startTime;
    const groupEndTime = new Date(
      Math.max(...group.map((e) => e.endTime.getTime())),
    );

    const totalMinutesInDay = 24 * 60;
    const startOfDay = new Date(groupStartTime);
    startOfDay.setHours(0, 0, 0, 0);

    const startMinutes =
      (groupStartTime.getTime() - startOfDay.getTime()) / (1000 * 60);
    const durationMinutes =
      (groupEndTime.getTime() - groupStartTime.getTime()) / (1000 * 60);

    const timelineHeight = firstEvent.top / (firstEvent.topPercentage / 100);

    const top = (startMinutes / totalMinutesInDay) * timelineHeight;
    const height = (durationMinutes / totalMinutesInDay) * timelineHeight;

    return {
      ...firstEvent, // Use first event as a base
      name: `${group.length} overlapping events`,
      startTime: groupStartTime,
      endTime: groupEndTime,
      durationMs: groupEndTime.getTime() - groupStartTime.getTime(),
      top,
      height,
      startMinute: startMinutes,
      endMinute: startMinutes + durationMinutes,
      topPercentage: (startMinutes / totalMinutesInDay) * 100,
      heightPercentage: (durationMinutes / totalMinutesInDay) * 100,
      groupedEvents: group,
    };
  });
}

function mapBlockToDirectDaySegment(
  block: CanonicalBlock,
  timelineHeight: number,
  totalMinutesInDay: number,
): DaySegment {
  const startOfDay = new Date(block.startTime);
  startOfDay.setHours(0, 0, 0, 0);
  const startMinutes =
    (block.startTime.getTime() - startOfDay.getTime()) / (1000 * 60);
  const durationMinutes = block.durationMs / (1000 * 60);
  const top = (startMinutes / totalMinutesInDay) * timelineHeight;
  const height = (durationMinutes / totalMinutesInDay) * timelineHeight;

  return {
    ...block,
    startMinute: startMinutes,
    endMinute: startMinutes + durationMinutes,
    topPercentage: (startMinutes / totalMinutesInDay) * 100,
    heightPercentage: (durationMinutes / totalMinutesInDay) * 100,
    allActivities: { [block.name]: { duration: block.durationMs, block } },
    top,
    height,
    isSuggestion: block.isSuggestion,
  };
}

function partitionTimeBlocksByType(timeBlocks: CanonicalBlock[]): {
  manualBlocks: CanonicalBlock[];
  calendarBlocks: CanonicalBlock[];
  idleBlocks: CanonicalBlock[];
  activityBlocks: CanonicalBlock[];
} {
  const manualBlocks: CanonicalBlock[] = [];
  const calendarBlocks: CanonicalBlock[] = [];
  const idleBlocks: CanonicalBlock[] = [];
  const activityBlocks: CanonicalBlock[] = [];

  timeBlocks.forEach((block) => {
    if (block.type === "manual") {
      manualBlocks.push(block);
    } else if (block.type === "calendar") {
      calendarBlocks.push(block);
    } else if (block.type === "idle") {
      idleBlocks.push(block);
    } else {
      activityBlocks.push(block);
    }
  });

  return { manualBlocks, calendarBlocks, idleBlocks, activityBlocks };
}

function computeDayStartFromBlocks(blocks: CanonicalBlock[]): Date {
  const referenceDate = new Date(blocks[0].startTime);
  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function accumulateActivitiesForSlot(
  slotStartTime: Date,
  slotEndTime: Date,
  allDayBlocks: CanonicalBlock[],
): Record<string, SlotActivity> {
  const activitiesInSlot: Record<string, SlotActivity> = {};

  allDayBlocks.forEach((block) => {
    const blockStart = block.startTime;
    const blockEnd = block.endTime;

    const overlapStart = new Date(
      Math.max(blockStart.getTime(), slotStartTime.getTime()),
    );
    const overlapEnd = new Date(
      Math.min(blockEnd.getTime(), slotEndTime.getTime()),
    );
    const duration = overlapEnd.getTime() - overlapStart.getTime();

    if (duration > 0) {
      // For browsers, group by page title (description) instead of browser name
      const groupingKey =
        block.type === "browser" && block.description
          ? block.description
          : block.name;
      if (!activitiesInSlot[groupingKey]) {
        activitiesInSlot[groupingKey] = {
          duration: 0,
          block,
          eventIds: block.originalEventIds
            ? [...block.originalEventIds]
            : block._id
              ? [block._id]
              : [],
        };
      } else {
        // Merge event IDs when adding to existing activity
        const existingEventIds = activitiesInSlot[groupingKey].eventIds || [];
        const newEventIds = block.originalEventIds
          ? [...block.originalEventIds]
          : block._id
            ? [block._id]
            : [];
        activitiesInSlot[groupingKey].eventIds = [
          ...new Set([...existingEventIds, ...newEventIds]),
        ];
      }
      activitiesInSlot[groupingKey].duration += duration;
    }
  });

  return activitiesInSlot;
}

function findMainActivity(
  activitiesInSlot: Record<string, SlotActivity>,
): [string, SlotActivity | null] {
  if (Object.keys(activitiesInSlot).length === 0) {
    return ["", null];
  }

  const mainActivity = Object.entries(activitiesInSlot).reduce(
    (max, current) => (current[1].duration > max[1].duration ? current : max),
  );

  return mainActivity;
}

function buildSlotsForActivityBlocks(
  activityBlocks: CanonicalBlock[],
  dayStart: Date,
  slotMinutes: number,
): SlotActivityGroup[] {
  const slots: SlotActivityGroup[] = [];
  const slotsInDay = 24 * (60 / slotMinutes);

  for (let i = 0; i < slotsInDay; i++) {
    const slotStart = new Date(
      dayStart.getTime() + i * slotMinutes * 60 * 1000,
    );
    const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60 * 1000);

    const activitiesInSlot = accumulateActivitiesForSlot(
      slotStart,
      slotEnd,
      activityBlocks,
    );

    const [mainActivityKey, mainActivityData] =
      findMainActivity(activitiesInSlot);

    const displayBlock =
      mainActivityData && mainActivityData.block
        ? { ...mainActivityData.block, name: mainActivityKey }
        : null;

    slots.push({
      startMinute: i * slotMinutes,
      endMinute: (i + 1) * slotMinutes,
      mainActivity: displayBlock,
      allActivities: activitiesInSlot,
    });
  }

  return slots;
}

function convertMergedSlotsToDaySegments(
  mergedSlots: (SlotActivityGroup & { durationMs: number })[],
  dayStart: Date,
  timelineHeight: number,
  totalMinutesInDay: number,
): DaySegment[] {
  return mergedSlots
    .filter((slot) => slot.mainActivity)
    .map((slot) => {
      const block = slot.mainActivity!;
      const startMinutes = slot.startMinute;
      const durationMinutes = slot.endMinute - slot.startMinute;

      const top = (startMinutes / totalMinutesInDay) * timelineHeight;
      const height = (durationMinutes / totalMinutesInDay) * timelineHeight;

      const startTime = new Date(dayStart.getTime() + startMinutes * 60000);
      const endTime = new Date(
        dayStart.getTime() + (startMinutes + durationMinutes) * 60000,
      );

      const allEventIds: string[] = [];
      Object.values(slot.allActivities).forEach((activity: SlotActivity) => {
        if (activity.eventIds) {
          allEventIds.push(...activity.eventIds);
        }
      });
      const uniqueEventIds = [...new Set(allEventIds)];

      return {
        ...block,
        startTime,
        endTime,
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        heightPercentage: (durationMinutes / totalMinutesInDay) * 100,
        topPercentage: (startMinutes / totalMinutesInDay) * 100,
        allActivities: slot.allActivities,
        originalEventIds: uniqueEventIds,
        top,
        height,
        durationMs: durationMinutes * 60 * 1000,
        isSuggestion: block.isSuggestion,
      };
    });
}

function truncateLastNonManualSegmentIfOngoingToday(
  segments: DaySegment[],
  isToday: boolean,
  currentTime: Date | null,
  timelineHeight: number,
  totalMinutesInDay: number,
) {
  if (!isToday || !currentTime || segments.length === 0) return;

  const lastSegment = segments[segments.length - 1];
  if (lastSegment.type === "manual") return;

  const currentMinutes =
    currentTime.getHours() * 60 +
    currentTime.getMinutes() +
    currentTime.getSeconds() / 60;

  if (
    lastSegment.startMinute < currentMinutes &&
    lastSegment.endMinute > currentMinutes
  ) {
    lastSegment.endMinute = currentMinutes;
    const durationMinutes = lastSegment.endMinute - lastSegment.startMinute;
    lastSegment.height = (durationMinutes / totalMinutesInDay) * timelineHeight;
  }
}

export function getTimelineSegmentsForDay(
  timeBlocks: CanonicalBlock[],
  timelineHeight: number,
  isToday = false,
  currentTime: Date | null = null,
): DaySegment[] {
  if (timeBlocks.length === 0 || timelineHeight === 0) {
    return [];
  }

  const totalMinutesInDay = 24 * 60;

  const { manualBlocks, calendarBlocks, idleBlocks, activityBlocks } =
    partitionTimeBlocksByType(timeBlocks);

  // Manual and idle blocks are rendered directly without slot aggregation
  const nonAggregatedSegments: DaySegment[] = [
    ...manualBlocks.map((block) =>
      mapBlockToDirectDaySegment(block, timelineHeight, totalMinutesInDay),
    ),
    ...idleBlocks.map((block) =>
      mapBlockToDirectDaySegment(block, timelineHeight, totalMinutesInDay),
    ),
  ];

  let calendarSegments: DaySegment[] = calendarBlocks.map((block) =>
    mapBlockToDirectDaySegment(block, timelineHeight, totalMinutesInDay),
  );
  calendarSegments = groupOverlappingCalendarSegments(calendarSegments);

  if (activityBlocks.length === 0) {
    return [...nonAggregatedSegments, ...calendarSegments].sort(
      (a, b) => a.top - b.top,
    );
  }

  const dayStart = computeDayStartFromBlocks(activityBlocks);
  const slots = buildSlotsForActivityBlocks(
    activityBlocks,
    dayStart,
    SLOT_DURATION_MINUTES,
  );
  const mergedSlots = mergeConsecutiveSlots(slots);
  const aggregatedSegments = convertMergedSlotsToDaySegments(
    mergedSlots,
    dayStart,
    timelineHeight,
    totalMinutesInDay,
  );

  const finalSegments = [
    ...aggregatedSegments,
    ...nonAggregatedSegments,
    ...calendarSegments,
  ].sort((a, b) => a.top - b.top);

  truncateLastNonManualSegmentIfOngoingToday(
    finalSegments,
    isToday,
    currentTime,
    timelineHeight,
    totalMinutesInDay,
  );

  return finalSegments;
}
