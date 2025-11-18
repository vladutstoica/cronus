import React from "react";
import Color from "color";
import {
  getDarkerColor,
  getLighterColor,
} from "../../../lib/colors";
import { type DaySegment } from "../../../lib/dayTimelineHelpers";
import TimelineSegmentContent from "./TimelineSegmentContent";

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
  const isCalendarEvent = type === "calendar";
  const SEGMENT_TOP_OFFSET_PX = 2;
  const totalSegmentVerticalSpacing = SEGMENT_TOP_OFFSET_PX * 2;

  const segmentBackgroundColor = (segment: DaySegment) => {
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

  return (
    <>
      {segments.map((segment, index) => {
        const textColor = segment.categoryColor
          ? isDarkMode
            ? getLighterColor(segment.categoryColor, 0.8)
            : getDarkerColor(segment.categoryColor, 0.5)
          : isDarkMode
            ? "#d1d5db"
            : "#374151";

        const top = getTopPosition(segment);
        const height = getHeight(segment);

        return (
          <div
            key={`${segment._id}-${index}`}
            className="absolute cursor-pointer transition-opacity hover:opacity-90"
            style={{
              top: `${top}rem`,
              height: `${height}rem`,
              left: "4rem",
              width: "calc(100% - 4rem)",
              backgroundColor: segmentBackgroundColor(segment),
              borderLeft: `3px solid ${segment.categoryColor || (isDarkMode ? "#6b7280" : "#9ca3af")}`,
              paddingTop: `${SEGMENT_TOP_OFFSET_PX}px`,
              paddingBottom: `${SEGMENT_TOP_OFFSET_PX}px`,
              zIndex: 10,
            }}
            onClick={() => onSegmentClick(segment)}
          >
            <TimelineSegmentContent segment={segment} isDarkMode={isDarkMode} />
          </div>
        );
      })}
    </>
  );
};

export default EventSegments;
