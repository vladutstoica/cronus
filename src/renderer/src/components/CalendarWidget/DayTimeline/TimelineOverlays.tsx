import React from "react";

interface TimelineOverlaysProps {
  isToday: boolean;
  currentTimeTop: number | null;
  currentHourRef: React.RefObject<HTMLDivElement | null>;
  hourHeight: number;
}

export const TimelineOverlays: React.FC<TimelineOverlaysProps> = ({
  isToday,
  currentTimeTop,
  currentHourRef,
  hourHeight,
}) => {
  return (
    <>
      {isToday && currentTimeTop !== null && (
        <div
          ref={currentHourRef}
          className="absolute left-0 right-0 z-30 pointer-events-none"
          style={{ top: `${currentTimeTop}rem` }}
        >
          <div className="w-full h-0.5 bg-red-500">
            <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        </div>
      )}
    </>
  );
};
