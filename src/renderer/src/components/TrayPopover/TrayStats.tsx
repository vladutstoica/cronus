import { useMemo } from "react";
import { Clock, Play } from "lucide-react";

interface TrayStatsProps {
  workStarted: string | null;
  totalMs: number;
  isLoading: boolean;
}

export function TrayStats({ workStarted, totalMs, isLoading }: TrayStatsProps) {
  const formattedTotalTime = useMemo(() => {
    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }, [totalMs]);

  const formattedWorkStarted = useMemo(() => {
    if (!workStarted) return "--:--";
    try {
      const date = new Date(workStarted);
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return workStarted;
    }
  }, [workStarted]);

  if (isLoading) {
    return (
      <section
        className="grid grid-cols-2 gap-4"
        aria-label="Work statistics"
        aria-busy="true"
      >
        <div className="border border-border rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2"></div>
          <div className="h-6 bg-muted rounded w-16"></div>
        </div>
        <div className="border border-border rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2"></div>
          <div className="h-6 bg-muted rounded w-16"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-2 gap-4" aria-label="Work statistics">
      {/* Work started */}
      <div
        className="border border-border rounded-lg p-3"
        role="group"
        aria-label={`Work started at ${formattedWorkStarted}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Play size={12} className="text-success" aria-hidden="true" />
          <span id="work-started-label" className="text-xs text-muted-foreground">
            Work started
          </span>
        </div>
        <p
          className="text-lg font-semibold text-foreground"
          aria-labelledby="work-started-label"
        >
          {formattedWorkStarted}
        </p>
      </div>

      {/* Total hours */}
      <div
        className="border border-border rounded-lg p-3"
        role="group"
        aria-label={`Total hours: ${formattedTotalTime}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Clock size={12} className="text-chart-accent" aria-hidden="true" />
          <span id="total-hours-label" className="text-xs text-muted-foreground">
            Total hours
          </span>
        </div>
        <p
          className="text-lg font-semibold text-foreground"
          aria-labelledby="total-hours-label"
        >
          {formattedTotalTime}
        </p>
      </div>
    </section>
  );
}
