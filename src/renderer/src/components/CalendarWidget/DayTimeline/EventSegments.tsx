import React from "react";
import Color from "color";
import { getDarkerColor, getLighterColor } from "../../../lib/colors";
import { type DaySegment } from "../../../lib/dayTimelineHelpers";
import TimelineSegmentContent from "./TimelineSegmentContent";
import { IDLE_CATEGORY_ID } from "../../../lib/constants";

interface EventSegmentsProps {
  segments: DaySegment[];
  hourHeight: number;
  isDarkMode: boolean;
  type: "tracked" | "calendar";
  onSegmentClick: (entry: DaySegment) => void;
}

export const EventSegments: React.FC<EventSegmentsProps> = ({
  segments,
  hourHeight,
  isDarkMode,
  type,
  onSegmentClick,
}) => {
  const SEGMENT_TOP_OFFSET_PX = 2;
  const totalSegmentVerticalSpacing = SEGMENT_TOP_OFFSET_PX * 2;

  const isIdleSegment = (segment: DaySegment) =>
    segment.categoryId === IDLE_CATEGORY_ID || segment.type === "idle";

  const segmentBackgroundColor = (segment: DaySegment) => {
    // Idle segments have a distinct muted appearance
    if (isIdleSegment(segment)) {
      return isDarkMode
        ? "rgba(55, 65, 81, 0.4)" // gray-700 with low opacity
        : "rgba(156, 163, 175, 0.3)"; // gray-400 with low opacity
    }

    if (!segment.categoryColor) {
      return isDarkMode ? "#374151" : "#e5e7eb";
    }
    // getDarkerColor and getLighterColor already return color strings, don't pass through hexToRgba
    const baseColor = isDarkMode
      ? getDarkerColor(segment.categoryColor, 0.3)
      : getLighterColor(segment.categoryColor, 0.8);

    // Apply opacity using Color library
    return Color(baseColor).alpha(0.9).string();
  };

  const getTopPosition = (segment: DaySegment) => {
    const hours = segment.startTime.getHours();
    const minutes = segment.startTime.getMinutes();
    return (hours + minutes / 60) * hourHeight;
  };

  const getHeight = (segment: DaySegment) => {
    const durationMs = segment.durationMs;
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.max(
      durationHours * hourHeight - totalSegmentVerticalSpacing / 16,
      0.25,
    );
  };

  // Generate striped pattern for idle segments
  const getIdleBackgroundStyle = (segment: DaySegment) => {
    if (!isIdleSegment(segment)) return {};

    const stripeColor = isDarkMode
      ? "rgba(75, 85, 99, 0.5)" // gray-600
      : "rgba(156, 163, 175, 0.4)"; // gray-400
    const bgColor = isDarkMode
      ? "rgba(55, 65, 81, 0.3)" // gray-700
      : "rgba(229, 231, 235, 0.5)"; // gray-200

    return {
      background: `repeating-linear-gradient(
        -45deg,
        ${bgColor},
        ${bgColor} 4px,
        ${stripeColor} 4px,
        ${stripeColor} 8px
      )`,
    };
  };

  return (
    <>
      {segments.map((segment, index) => {
        const top = getTopPosition(segment);
        const height = getHeight(segment);
        const isIdle = isIdleSegment(segment);

        const borderColor = isIdle
          ? isDarkMode
            ? "#4b5563" // gray-600
            : "#9ca3af" // gray-400
          : segment.categoryColor || (isDarkMode ? "#6b7280" : "#9ca3af");

        return (
          <div
            key={`${segment._id}-${index}`}
            className={`absolute transition-opacity ${isIdle ? "cursor-default opacity-60" : "cursor-pointer hover:opacity-90"}`}
            style={{
              top: `${top}rem`,
              height: `${height}rem`,
              left: "4rem",
              width: "calc(100% - 4rem)",
              backgroundColor: isIdle
                ? undefined
                : segmentBackgroundColor(segment),
              ...getIdleBackgroundStyle(segment),
              borderLeft: `3px ${isIdle ? "dashed" : "solid"} ${borderColor}`,
              paddingTop: `${SEGMENT_TOP_OFFSET_PX}px`,
              paddingBottom: `${SEGMENT_TOP_OFFSET_PX}px`,
              zIndex: isIdle ? 5 : 10, // Idle segments behind activity segments
            }}
            onClick={() => !isIdle && onSegmentClick(segment)}
          >
            <TimelineSegmentContent segment={segment} isDarkMode={isDarkMode} />
          </div>
        );
      })}
    </>
  );
};

export default EventSegments;
