import { useMemo } from "react";

interface HourlyActivity {
  hour: number;
  durationMs: number;
}

interface TrayActivityChartProps {
  hourlyActivity: HourlyActivity[];
  isLoading: boolean;
}

export function TrayActivityChart({
  hourlyActivity,
  isLoading,
}: TrayActivityChartProps) {
  // Generate all 24 hours with activity data
  const chartData = useMemo(() => {
    const data: { hour: number; durationMs: number; label: string }[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const activity = hourlyActivity.find((a) => a.hour === hour);
      const label =
        hour === 0
          ? "12am"
          : hour < 12
            ? `${hour}am`
            : hour === 12
              ? "12pm"
              : `${hour - 12}pm`;

      data.push({
        hour,
        durationMs: activity?.durationMs || 0,
        label,
      });
    }

    return data;
  }, [hourlyActivity]);

  // Find max duration for scaling
  const maxDuration = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.durationMs), 1);
    return max;
  }, [chartData]);

  // Get current hour
  const currentHour = new Date().getHours();

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-3">
        <div className="h-4 bg-muted rounded w-24 mb-3 animate-pulse"></div>
        <div className="flex items-end gap-[2px] h-16">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted rounded-t animate-pulse"
              style={{ height: `${Math.random() * 100}%` }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-xs text-muted-foreground mb-3">Activity Today</h3>

      {/* Bar chart */}
      <div className="flex items-end gap-[2px] h-16 mb-2">
        {chartData.map((item) => {
          const heightPercent =
            maxDuration > 0 ? (item.durationMs / maxDuration) * 100 : 0;
          const isCurrentHour = item.hour === currentHour;
          const hasActivity = item.durationMs > 0;

          return (
            <div
              key={item.hour}
              className={`flex-1 rounded-t transition-all ${
                hasActivity
                  ? isCurrentHour
                    ? "bg-success"
                    : "bg-chart-accent"
                  : "bg-muted"
              }`}
              style={{
                height: `${Math.max(heightPercent, hasActivity ? 8 : 2)}%`,
                minHeight: hasActivity ? "4px" : "1px",
              }}
              title={`${item.label}: ${Math.round(item.durationMs / 60000)}min`}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
    </div>
  );
}
