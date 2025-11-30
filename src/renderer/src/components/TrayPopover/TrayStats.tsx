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
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2"></div>
          <div className="h-6 bg-muted rounded w-16"></div>
        </div>
        <div className="border border-border rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2"></div>
          <div className="h-6 bg-muted rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Work started */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Play size={12} className="text-success" />
          <span className="text-xs text-muted-foreground">Work started</span>
        </div>
        <p className="text-lg font-semibold text-foreground">
          {formattedWorkStarted}
        </p>
      </div>

      {/* Total hours */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock size={12} className="text-chart-accent" />
          <span className="text-xs text-muted-foreground">Total hours</span>
        </div>
        <p className="text-lg font-semibold text-foreground">{formattedTotalTime}</p>
      </div>
    </div>
  );
}
