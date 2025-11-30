import { useMemo, useRef, useState } from "react";
import { ProcessedEventBlock } from "../DashboardView";
import {
  getTimelineSegmentsForDay,
  DaySegment,
  CanonicalBlock,
} from "../../lib/dayTimelineHelpers";
import { TimeBlockTooltip } from "./TimeBlockTooltip";
import { Card, CardContent } from "../ui/card";

interface TimeBlocksTimelineProps {
  processedEvents: ProcessedEventBlock[] | null;
  selectedDate: Date;
  isLoading?: boolean;
}

// Timeline bounds (10 AM to 10 PM = 12 hours)
const START_HOUR = 10;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Convert ProcessedEventBlock to CanonicalBlock
function toCanonicalBlock(event: ProcessedEventBlock): CanonicalBlock {
  return {
    _id: event.originalEvent._id,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMs: event.durationMs,
    name: event.name,
    description: event.title || "",
    url: event.url,
    categoryColor: event.categoryColor,
    categoryId: event.categoryId || undefined,
    categoryName: event.categoryName,
    type: event.originalEvent.type || "window",
    originalEvent: event.originalEvent,
  };
}

// Get hour label
function getHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function TimeBlocksTimeline({
  processedEvents,
  selectedDate,
  isLoading,
}: TimeBlocksTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<DaySegment | null>(null);

  // Filter events for the selected date and within time bounds
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

  // Convert to segments using existing helper
  const segments = useMemo(() => {
    if (dayEvents.length === 0) return [];

    const canonicalBlocks = dayEvents.map(toCanonicalBlock);
    // Use a fixed height for calculation (we'll use percentages for rendering)
    const segments = getTimelineSegmentsForDay(canonicalBlocks, 1000);

    // Filter segments to only those within our time bounds
    return segments.filter((segment) => {
      const startHour = segment.startTime.getHours();
      const endHour = segment.endTime.getHours();
      return endHour >= START_HOUR && startHour < END_HOUR;
    });
  }, [dayEvents]);

  // Calculate segment position and width as percentages
  const getSegmentStyle = (segment: DaySegment) => {
    const startHour = segment.startTime.getHours();
    const startMinute = segment.startTime.getMinutes();
    const endHour = segment.endTime.getHours();
    const endMinute = segment.endTime.getMinutes();

    // Clamp to bounds
    const clampedStartHour = Math.max(startHour + startMinute / 60, START_HOUR);
    const clampedEndHour = Math.min(endHour + endMinute / 60, END_HOUR);

    const leftPercent = ((clampedStartHour - START_HOUR) / TOTAL_HOURS) * 100;
    const widthPercent =
      ((clampedEndHour - clampedStartHour) / TOTAL_HOURS) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 0.5)}%`, // Minimum width for visibility
      backgroundColor: segment.categoryColor || "#6b7280",
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
                className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2"
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

            {/* Activity blocks - no border radius */}
            {segments.map((segment, index) => {
              const style = getSegmentStyle(segment);
              return (
                <TimeBlockTooltip key={index} segment={segment}>
                  <div
                    className="absolute top-0 bottom-0 cursor-pointer transition-all hover:brightness-110"
                    style={style}
                    onMouseEnter={() => setHoveredSegment(segment)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                </TimeBlockTooltip>
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
