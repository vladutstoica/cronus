import { ActivityIcon } from "@renderer/components/ActivityList/ActivityIcon";
import { formatDuration } from "@renderer/lib/timeFormatting";

interface HourlyTimelineSegment {
  startMinute: number;
  endMinute: number;
  durationMs: number;
  name: string;
  description?: string;
  url?: string;
  categoryColor?: string;
  heightPercentage: number;
  topPercentage: number;
  widthPercentage: number;
  leftPercentage: number;
}

const TimelineTooltipContent = ({
  timelineSegments,
  hour,
}: {
  timelineSegments: HourlyTimelineSegment[];
  hour: number;
}) => {
  const aggregatedSegments = Object.entries(
    timelineSegments.reduce(
      (acc, segment) => {
        if (!acc[segment.name]) {
          acc[segment.name] = {
            totalDuration: 0,
            url: segment.url,
            segments: [],
          };
        }
        acc[segment.name].totalDuration += segment.durationMs;
        acc[segment.name].segments.push(segment);
        return acc;
      },
      {} as Record<
        string,
        {
          totalDuration: number;
          url?: string;
          segments: HourlyTimelineSegment[];
        }
      >,
    ),
  )
    .sort(([, a], [, b]) => b.totalDuration - a.totalDuration)
    .slice(0, 5);

  if (aggregatedSegments.length === 0) {
    return null;
  }

  return (
    <div className="p-4 space-y-1 w-64">
      <p className="font-normal text-muted-foreground text-xs mb-2">
        Click to filter categorization by activity.{" "}
      </p>
      {aggregatedSegments.map(([appName, data]) => (
        <div
          key={`${hour}-${appName}-summary`}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center space-x-2 truncate">
            <ActivityIcon url={data.url} appName={appName} size={12} />
            <span className="truncate">{appName}</span>
          </div>
          <span className="flex-shrink-0 text-muted-foreground pl-2">
            {formatDuration(data.totalDuration)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TimelineTooltipContent;
export type { HourlyTimelineSegment };
