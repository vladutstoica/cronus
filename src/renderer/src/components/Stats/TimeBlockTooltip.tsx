import React from "react";
import { DaySegment } from "../../lib/dayTimelineHelpers";
import { formatDuration } from "../../lib/timeFormatting";
import { ActivityIcon } from "../ActivityList/ActivityIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface TimeBlockTooltipProps {
  segment: DaySegment;
  children: React.ReactNode;
}

function formatTimeRange(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const duration = end.getTime() - start.getTime();
  const durationStr = formatDuration(duration);

  return `${formatTime(start)} To ${formatTime(end)}(${durationStr})`;
}

export function TimeBlockTooltip({ segment, children }: TimeBlockTooltipProps) {
  if (
    segment.type === "manual" ||
    Object.keys(segment.allActivities).length === 0
  ) {
    return <>{children}</>;
  }

  // Sort activities by duration (highest first)
  const sortedActivities = Object.entries(segment.allActivities).sort(
    ([, a], [, b]) => b.duration - a.duration
  );

  // Calculate max duration for progress bars
  const maxDuration = sortedActivities[0]?.[1]?.duration || 1;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 w-72"
      >
        <div className="p-3 space-y-2">
          {/* Time range header */}
          <p className="text-xs text-muted-foreground">
            {formatTimeRange(segment.startTime, segment.endTime)}
          </p>

          {/* Activities list */}
          <div className="space-y-2">
            {sortedActivities.slice(0, 7).map(([name, data]) => {
              const widthPercent = (data.duration / maxDuration) * 100;
              const color = data.block.categoryColor || "#6b7280";

              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <ActivityIcon
                        url={data.block.url}
                        appName={name}
                        size={14}
                      />
                      <span className="truncate">{name}</span>
                    </div>
                    <span className="flex-shrink-0 text-muted-foreground ml-2">
                      {formatDuration(data.duration)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Show more indicator */}
            {sortedActivities.length > 7 && (
              <p className="text-xs text-muted-foreground italic">
                +{sortedActivities.length - 7} more activities
              </p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
