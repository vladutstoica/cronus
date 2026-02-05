import { useMemo } from "react";
import { TrayActivityChart } from "../TrayActivityChart";
import { TrayStats } from "../TrayStats";
import { TrayAppsList } from "../TrayAppsList";
import { TrendingUp, TrendingDown } from "lucide-react";

interface HourlyActivity {
  hour: number;
  durationMs: number;
}

interface TopApp {
  name: string;
  durationMs: number;
}

interface TodayStats {
  workStarted: string | null;
  totalMs: number;
}

interface TrayStatusUpdate {
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  totalTrackedMs: number;
  isTrackingPaused: boolean;
}

interface TodayTabProps {
  todayStats: TodayStats;
  hourlyActivity: HourlyActivity[];
  topApps: TopApp[];
  statusUpdate: TrayStatusUpdate | null;
  isLoading: boolean;
}

export function TodayTab({
  todayStats,
  hourlyActivity,
  topApps,
  statusUpdate,
  isLoading,
}: TodayTabProps) {
  // Use status update for total time if available
  const totalTrackedMs = statusUpdate?.totalTrackedMs ?? todayStats.totalMs;

  // Calculate productivity percentage
  const productivityData = useMemo(() => {
    if (!statusUpdate) return null;

    const { dailyProductiveMs, dailyUnproductiveMs } = statusUpdate;
    const totalCategorized = dailyProductiveMs + dailyUnproductiveMs;

    if (totalCategorized === 0) return null;

    const percentage = Math.round((dailyProductiveMs / totalCategorized) * 100);
    return {
      percentage,
      productiveMs: dailyProductiveMs,
      unproductiveMs: dailyUnproductiveMs,
    };
  }, [statusUpdate]);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-3">
      {/* Productivity Score */}
      {productivityData && (
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Productivity Score
            </span>
            <div className="flex items-center gap-1">
              {productivityData.percentage >= 50 ? (
                <TrendingUp size={12} className="text-success" />
              ) : (
                <TrendingDown size={12} className="text-destructive" />
              )}
              <span
                className={`text-lg font-bold ${
                  productivityData.percentage >= 70
                    ? "text-success"
                    : productivityData.percentage >= 50
                      ? "text-chart-accent"
                      : "text-destructive"
                }`}
              >
                {productivityData.percentage}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                productivityData.percentage >= 70
                  ? "bg-success"
                  : productivityData.percentage >= 50
                    ? "bg-chart-accent"
                    : "bg-destructive"
              }`}
              style={{ width: `${productivityData.percentage}%` }}
            />
          </div>

          {/* Time breakdown */}
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-success">
              Productive: {formatDuration(productivityData.productiveMs)}
            </span>
            <span className="text-destructive">
              Unproductive: {formatDuration(productivityData.unproductiveMs)}
            </span>
          </div>
        </div>
      )}

      {/* Activity Chart */}
      <TrayActivityChart
        hourlyActivity={hourlyActivity}
        isLoading={isLoading}
      />

      {/* Stats */}
      <TrayStats
        workStarted={todayStats.workStarted}
        totalMs={totalTrackedMs}
        isLoading={isLoading}
      />

      {/* Top Apps */}
      <TrayAppsList topApps={topApps} isLoading={isLoading} />
    </div>
  );
}
