import { useMemo, useRef } from "react";
import { ProcessedEventBlock } from "../DashboardView";
import { Card, CardContent } from "../ui/card";
import { IDLE_CATEGORY_ID, IDLE_CATEGORY_COLOR } from "../../lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface TimeBlocksTimelineProps {
  processedEvents: ProcessedEventBlock[] | null;
  selectedDate: Date;
  isLoading?: boolean;
}

// Timeline bounds (10 AM to 10 PM = 12 hours)
const START_HOUR = 10;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_MINUTES = 5; // Each slot is 5 minutes (matches idle threshold)
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = TOTAL_HOURS * SLOTS_PER_HOUR; // 144 slots

// Represents a 5-minute time slot with aggregated category data
interface TimeSlot {
  slotIndex: number;
  startTime: Date;
  endTime: Date;
  dominantCategoryId: string | null;
  dominantCategoryColor: string | null;
  dominantCategoryName: string | null;
  isIdle: boolean;
  totalDurationMs: number; // How much of this slot has activity
  categories: Array<{
    categoryId: string | null;
    categoryName: string | null;
    categoryColor: string | null;
    durationMs: number;
    isIdle: boolean;
  }>;
}

// Get hour label
function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// Format time for tooltip
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format duration for display
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1m";
  return `${minutes}m`;
}

export function TimeBlocksTimeline({
  processedEvents,
  selectedDate,
  isLoading,
}: TimeBlocksTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter events for the selected date
  const dayEvents = useMemo(() => {
    if (!processedEvents) return [];

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return processedEvents.filter((event) => {
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime.getTime();
      return eventStart >= dayStart.getTime() && eventEnd <= dayEnd.getTime();
    });
  }, [processedEvents, selectedDate]);

  // Create 10-minute slots and aggregate events into them
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];

    // Create empty slots for the entire timeline
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const slotStartTime = new Date(selectedDate);
      slotStartTime.setHours(START_HOUR, 0, 0, 0);
      slotStartTime.setMinutes(slotStartTime.getMinutes() + i * SLOT_MINUTES);

      const slotEndTime = new Date(slotStartTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + SLOT_MINUTES);

      slots.push({
        slotIndex: i,
        startTime: slotStartTime,
        endTime: slotEndTime,
        dominantCategoryId: null,
        dominantCategoryColor: null,
        dominantCategoryName: null,
        isIdle: false,
        totalDurationMs: 0,
        categories: [],
      });
    }

    // Aggregate events into slots
    for (const event of dayEvents) {
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime.getTime();
      const isIdle =
        event.categoryId === IDLE_CATEGORY_ID ||
        event.originalEvent.type === "idle";

      // Find which slots this event overlaps with
      for (const slot of slots) {
        const slotStart = slot.startTime.getTime();
        const slotEnd = slot.endTime.getTime();

        // Check if event overlaps with this slot
        if (eventStart < slotEnd && eventEnd > slotStart) {
          // Calculate overlap duration
          const overlapStart = Math.max(eventStart, slotStart);
          const overlapEnd = Math.min(eventEnd, slotEnd);
          const overlapMs = overlapEnd - overlapStart;

          if (overlapMs > 0) {
            // Find or create category entry for this slot
            const categoryKey = event.categoryId || "uncategorized";
            let categoryEntry = slot.categories.find(
              (c) => (c.categoryId || "uncategorized") === categoryKey,
            );

            if (!categoryEntry) {
              categoryEntry = {
                categoryId: event.categoryId || null,
                categoryName: event.categoryName || null,
                categoryColor: event.categoryColor || null,
                durationMs: 0,
                isIdle,
              };
              slot.categories.push(categoryEntry);
            }

            categoryEntry.durationMs += overlapMs;
            slot.totalDurationMs += overlapMs;
          }
        }
      }
    }

    // Determine dominant category for each slot
    for (const slot of slots) {
      if (slot.categories.length > 0) {
        // Sort by duration and pick the one with most time
        const sorted = [...slot.categories].sort(
          (a, b) => b.durationMs - a.durationMs,
        );
        const dominant = sorted[0];
        slot.dominantCategoryId = dominant.categoryId;
        slot.dominantCategoryColor = dominant.categoryColor;
        slot.dominantCategoryName = dominant.categoryName;
        slot.isIdle = dominant.isIdle;
      }
    }

    return slots;
  }, [dayEvents, selectedDate]);

  // Get slot style
  const getSlotStyle = (slot: TimeSlot) => {
    const slotWidthPercent = 100 / TOTAL_SLOTS;
    const leftPercent = slot.slotIndex * slotWidthPercent;

    // Empty slot
    if (slot.totalDurationMs === 0) {
      return {
        left: `${leftPercent}%`,
        width: `${slotWidthPercent}%`,
        backgroundColor: "transparent",
      };
    }

    // Idle slot with striped pattern
    if (slot.isIdle) {
      return {
        left: `${leftPercent}%`,
        width: `${slotWidthPercent}%`,
        background: `repeating-linear-gradient(
          -45deg,
          rgba(55, 65, 81, 0.3),
          rgba(55, 65, 81, 0.3) 3px,
          rgba(75, 85, 99, 0.5) 3px,
          rgba(75, 85, 99, 0.5) 6px
        )`,
        opacity: 0.6,
      };
    }

    // Active slot with dominant category color
    return {
      left: `${leftPercent}%`,
      width: `${slotWidthPercent}%`,
      backgroundColor: slot.dominantCategoryColor || "#6b7280",
    };
  };

  // Generate hour markers
  const hourMarkers = useMemo((): Array<{
    hour: number;
    label: string;
    leftPercent: number;
  }> => {
    const markers: Array<{ hour: number; label: string; leftPercent: number }> =
      [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      markers.push({
        hour,
        label: getHourLabel(hour),
        leftPercent: ((hour - START_HOUR) / TOTAL_HOURS) * 100,
      });
    }
    return markers;
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-3">
          <div className="h-16 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="relative" ref={containerRef}>
          {/* Hour markers */}
          <div className="relative h-4 mb-1">
            {hourMarkers.map((marker) => (
              <div
                key={marker.hour}
                className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${marker.leftPercent}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>

          {/* Timeline track with border */}
          <div className="relative h-8 bg-muted/30 border border-border rounded-md overflow-hidden">
            {/* Hour grid lines */}
            {hourMarkers.map((marker) => (
              <div
                key={`line-${marker.hour}`}
                className="absolute top-0 bottom-0 w-px bg-border/50"
                style={{ left: `${marker.leftPercent}%` }}
              />
            ))}

            {/* 5-minute time slots */}
            {timeSlots.map((slot) => {
              const style = getSlotStyle(slot);
              const hasActivity = slot.totalDurationMs > 0;

              if (!hasActivity) {
                // Empty slot - just render empty space
                return (
                  <div
                    key={slot.slotIndex}
                    className="absolute top-0 bottom-0"
                    style={style}
                  />
                );
              }

              return (
                <TooltipProvider key={slot.slotIndex}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 bottom-0 cursor-pointer transition-all hover:brightness-110 border-r border-background/20"
                        style={style}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <div className="font-medium">
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </div>
                        {slot.categories
                          .sort((a, b) => b.durationMs - a.durationMs)
                          .map((cat, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: cat.isIdle
                                    ? IDLE_CATEGORY_COLOR
                                    : cat.categoryColor || "#6b7280",
                                }}
                              />
                              <span className="truncate">
                                {cat.isIdle
                                  ? "Idle"
                                  : cat.categoryName || "Uncategorized"}
                              </span>
                              <span className="text-muted-foreground ml-auto">
                                {formatDuration(cat.durationMs)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Current time indicator (if viewing today) */}
            {selectedDate.toDateString() === new Date().toDateString() && (
              <CurrentTimeIndicator />
            )}
          </div>

          {/* Bottom hour labels (dots) */}
          <div className="relative h-2 mt-1">
            {hourMarkers.map((marker) => (
              <div
                key={`dot-${marker.hour}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-muted-foreground/30 transform -translate-x-1/2"
                style={{ left: `${marker.leftPercent}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (currentHour < START_HOUR || currentHour > END_HOUR) {
    return null;
  }

  const leftPercent = ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
      style={{ left: `${leftPercent}%` }}
    >
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
    </div>
  );
}
