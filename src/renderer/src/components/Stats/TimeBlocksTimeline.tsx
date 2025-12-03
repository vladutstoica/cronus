import { useMemo, useRef, useEffect } from "react";
import { ProcessedEventBlock } from "../DashboardView";
import { useCurrentTime } from "../../hooks/useCurrentTime";
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

// Timeline bounds (full 24 hours)
const TOTAL_HOURS = 24;
const SLOT_MINUTES = 5;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = TOTAL_HOURS * SLOTS_PER_HOUR;
const HOUR_WIDTH_PX = 60;

// Represents a 5-minute time slot with aggregated category data
interface TimeSlot {
  slotIndex: number;
  startTime: Date;
  endTime: Date;
  dominantCategoryId: string | null;
  dominantCategoryColor: string | null;
  dominantCategoryName: string | null;
  isIdle: boolean;
  totalDurationMs: number;
  categories: Array<{
    categoryId: string | null;
    categoryName: string | null;
    categoryColor: string | null;
    durationMs: number;
    isIdle: boolean;
  }>;
}

function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const currentTime = useCurrentTime(); // Updates every minute
  const isToday = selectedDate.toDateString() === new Date().toDateString();

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

  // Create 5-minute slots and aggregate events into them
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const slotStartTime = new Date(selectedDate);
      slotStartTime.setHours(0, 0, 0, 0);
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

      for (const slot of slots) {
        const slotStart = slot.startTime.getTime();
        const slotEnd = slot.endTime.getTime();

        if (eventStart < slotEnd && eventEnd > slotStart) {
          const overlapStart = Math.max(eventStart, slotStart);
          const overlapEnd = Math.min(eventEnd, slotEnd);
          const overlapMs = overlapEnd - overlapStart;

          if (overlapMs > 0) {
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

  // Group slots by hour for rendering
  const slotsByHour = useMemo(() => {
    const grouped: TimeSlot[][] = [];
    for (let h = 0; h < TOTAL_HOURS; h++) {
      grouped.push(
        timeSlots.slice(h * SLOTS_PER_HOUR, (h + 1) * SLOTS_PER_HOUR),
      );
    }
    return grouped;
  }, [timeSlots]);

  // Auto-scroll to center on current time
  useEffect(() => {
    if (isToday && scrollContainerRef.current && !hasScrolledRef.current) {
      // Small delay to ensure DOM and CSS are fully applied
      const timeoutId = setTimeout(() => {
        if (scrollContainerRef.current) {
          const now = new Date();
          const currentHour = now.getHours() + now.getMinutes() / 60;
          const container = scrollContainerRef.current;
          const containerWidth = container.clientWidth;
          const scrollWidth = container.scrollWidth;

          // Only scroll if there's content to scroll
          if (scrollWidth > containerWidth) {
            const currentPosition = (currentHour / TOTAL_HOURS) * scrollWidth;
            const scrollPosition = currentPosition - containerWidth / 2;
            container.scrollLeft = Math.max(0, scrollPosition);
          }
          hasScrolledRef.current = true;
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isToday, slotsByHour]);

  // Reset scroll flag when date changes
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [selectedDate]);

  // Current time position (updates every minute via useCurrentTime)
  const currentTimePercent = useMemo(() => {
    if (!isToday) return null;
    return (
      ((currentTime.getHours() + currentTime.getMinutes() / 60) / TOTAL_HOURS) *
      100
    );
  }, [isToday, currentTime]);

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
      <CardContent className="p-0">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          <div
            className="flex flex-col"
            style={{ minWidth: `${TOTAL_HOURS * HOUR_WIDTH_PX}px` }}
          >
            {/* Hour labels */}
            <div className="flex">
              {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                <div
                  key={hour}
                  className="flex-1 min-w-[60px] text-[10px] text-muted-foreground px-1 pt-2"
                >
                  {getHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* Timeline track */}
            <div className="relative mx-2 mb-2">
              <div className="flex h-8 bg-muted/30 border border-border rounded-md overflow-hidden">
                {slotsByHour.map((hourSlots, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="flex-1 min-w-[60px] flex border-l border-border/50 first:border-l-0"
                  >
                    {hourSlots.map((slot) => {
                      const hasActivity = slot.totalDurationMs > 0;

                      if (!hasActivity) {
                        return (
                          <div key={slot.slotIndex} className="flex-1 h-full" />
                        );
                      }

                      const bgStyle = slot.isIdle
                        ? {
                            background: `repeating-linear-gradient(
                              -45deg,
                              rgba(55, 65, 81, 0.3),
                              rgba(55, 65, 81, 0.3) 3px,
                              rgba(75, 85, 99, 0.5) 3px,
                              rgba(75, 85, 99, 0.5) 6px
                            )`,
                            opacity: 0.6,
                          }
                        : {
                            backgroundColor:
                              slot.dominantCategoryColor || "#6b7280",
                          };

                      return (
                        <TooltipProvider key={slot.slotIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="flex-1 h-full cursor-pointer transition-all hover:brightness-110"
                                style={bgStyle}
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
                  </div>
                ))}
              </div>

              {/* Current time indicator */}
              {currentTimePercent !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                  style={{ left: `${currentTimePercent}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                </div>
              )}
            </div>

            {/* Bottom dots */}
            <div className="flex pb-2">
              {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                <div
                  key={hour}
                  className="flex-1 min-w-[60px] flex justify-start px-1"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
