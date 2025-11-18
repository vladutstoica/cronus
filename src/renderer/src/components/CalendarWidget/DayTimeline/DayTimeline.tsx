import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  getTimelineSegmentsForDay,
  type CanonicalBlock,
} from "../../../lib/dayTimelineHelpers";
import { EventSegments } from "./EventSegments";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineOverlays } from "./TimelineOverlays";

interface DayTimelineProps {
  trackedTimeBlocks: CanonicalBlock[];
  googleCalendarTimeBlocks: CanonicalBlock[];
  currentTime: Date;
  dayForEntries: Date;
  isToday: boolean;
  isDarkMode: boolean;
  selectedHour: number | null;
  onHourSelect: (hour: number | null) => void;
  hourHeight: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const DayTimeline = ({
  trackedTimeBlocks,
  googleCalendarTimeBlocks,
  currentTime,
  dayForEntries,
  isToday,
  isDarkMode,
  selectedHour,
  onHourSelect,
  hourHeight,
  scrollContainerRef,
}: DayTimelineProps) => {
  const currentHourRef = useRef<HTMLDivElement>(null);
  const prevHourHeightRef = useRef(hourHeight);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCurrentTime = useRef(false);

  const daySegments = useMemo(() => {
    return getTimelineSegmentsForDay(
      trackedTimeBlocks,
      24 * hourHeight * 16,
      isToday,
      currentTime,
    );
  }, [trackedTimeBlocks, hourHeight, isToday, currentTime]);

  const calendarSegments = useMemo(() => {
    return getTimelineSegmentsForDay(
      googleCalendarTimeBlocks,
      24 * hourHeight * 16,
      isToday,
      currentTime,
    );
  }, [googleCalendarTimeBlocks, hourHeight, isToday, currentTime]);

  // Calculate current time position
  const currentTimeTop = useMemo(() => {
    if (!isToday) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours + minutes / 60) * hourHeight;
  }, [currentTime, isToday, hourHeight]);

  // Auto-scroll to current hour on initial load (only for today)
  useLayoutEffect(() => {
    if (
      isToday &&
      currentHourRef.current &&
      scrollContainerRef.current &&
      currentTimeTop !== null &&
      !hasScrolledToCurrentTime.current
    ) {
      // Use requestAnimationFrame to ensure DOM is fully painted
      requestAnimationFrame(() => {
        if (currentHourRef.current && scrollContainerRef.current) {
          const parentTop =
            scrollContainerRef.current.getBoundingClientRect().top;
          const currentTop = currentHourRef.current.getBoundingClientRect().top;
          const relativeTop = currentTop - parentTop;
          const offset = scrollContainerRef.current.clientHeight / 2;

          scrollContainerRef.current.scrollTop = relativeTop - offset;
          hasScrolledToCurrentTime.current = true;
        }
      });
    }
  }, [isToday, currentTimeTop, scrollContainerRef]);

  // Handle zoom changes - maintain relative scroll position
  useEffect(() => {
    const prevHeight = prevHourHeightRef.current;
    const newHeight = hourHeight;

    if (prevHeight !== newHeight && scrollContainerRef.current) {
      const scrollRatio = newHeight / prevHeight;
      scrollContainerRef.current.scrollTop *= scrollRatio;
    }

    prevHourHeightRef.current = hourHeight;
  }, [hourHeight, scrollContainerRef]);

  const handleHourClick = (hour: number | null) => {
    if (hour === null) {
      onHourSelect(null);
    } else if (selectedHour === hour) {
      onHourSelect(null);
    } else {
      onHourSelect(hour);
    }
  };

  // Calculate current hour
  const currentHour = currentTime.getHours();

  // Calculate hourly activity (which hours have events)
  const hourlyActivity = new Array(24).fill(false);
  daySegments.forEach((segment) => {
    const startHour = segment.startTime.getHours();
    const endHour = segment.endTime.getHours();
    for (let h = startHour; h <= endHour; h++) {
      hourlyActivity[h] = true;
    }
  });

  return (
    <div
      ref={timelineContainerRef}
      className="relative w-full select-none"
      style={{ height: `${24 * hourHeight}rem` }}
    >
      {/* Timeline Grid (hours, lines, etc.) */}
      <TimelineGrid
        currentHour={currentHour}
        selectedHour={selectedHour}
        currentHourRef={currentHourRef}
        hourHeight={hourHeight}
        onHourSelect={handleHourClick}
        hourlyActivity={hourlyActivity}
      />

      {/* Google Calendar Events */}
      {calendarSegments.length > 0 && (
        <EventSegments
          segments={calendarSegments}
          hourHeight={hourHeight}
          isDarkMode={isDarkMode}
          type="calendar"
          onSegmentClick={() => {}}
        />
      )}

      {/* Tracked Events */}
      {daySegments.length > 0 && (
        <EventSegments
          segments={daySegments}
          hourHeight={hourHeight}
          isDarkMode={isDarkMode}
          type="tracked"
          onSegmentClick={() => {}}
        />
      )}

      {/* Current time indicator and overlays */}
      <TimelineOverlays
        isToday={isToday}
        currentTimeTop={currentTimeTop}
        currentHourRef={currentHourRef}
        hourHeight={hourHeight}
      />
    </div>
  );
};

export default DayTimeline;
