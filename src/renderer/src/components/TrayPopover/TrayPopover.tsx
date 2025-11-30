import { useEffect, useState, useCallback } from "react";
import { SessionTimer } from "./SessionTimer";
import { TrayStats } from "./TrayStats";
import { TrayActivityChart } from "./TrayActivityChart";
import { TrayAppsList } from "./TrayAppsList";
import { ExternalLink, Settings } from "lucide-react";

// Type definitions for the tray API (camelCase from IPC)
interface WorkSession {
  id: string;
  userId: string;
  note: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  createdAt: string;
}

interface TodayStats {
  workStarted: string | null;
  totalMs: number;
}

interface HourlyActivity {
  hour: number;
  durationMs: number;
}

interface TopApp {
  name: string;
  durationMs: number;
}

interface TrayStatusUpdate {
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  totalTrackedMs: number;
  isTrackingPaused: boolean;
}

// Declare the tray API on window
declare global {
  interface Window {
    trayApi: {
      getActiveSession: () => Promise<WorkSession | null>;
      startSession: (note: string) => Promise<WorkSession>;
      endSession: (sessionId: string) => Promise<WorkSession | null>;
      updateSessionNote: (
        sessionId: string,
        note: string,
      ) => Promise<WorkSession | null>;
      getSessionsByDate: (date: string) => Promise<WorkSession[]>;
      getTodayStats: () => Promise<TodayStats>;
      getHourlyActivity: () => Promise<HourlyActivity[]>;
      getTopApps: () => Promise<TopApp[]>;
      onStatusUpdate: (
        callback: (data: TrayStatusUpdate) => void,
      ) => () => void;
      hidePopover: () => void;
      openMainApp: () => void;
      openSettings: () => void;
    };
  }
}

export function TrayPopover() {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    workStarted: null,
    totalMs: 0,
  });
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [topApps, setTopApps] = useState<TopApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState<TrayStatusUpdate | null>(
    null,
  );

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [session, stats, activity, apps] = await Promise.all([
        window.trayApi.getActiveSession(),
        window.trayApi.getTodayStats(),
        window.trayApi.getHourlyActivity(),
        window.trayApi.getTopApps(),
      ]);

      setActiveSession(session);
      setTodayStats(stats);
      setHourlyActivity(activity);
      setTopApps(apps);
    } catch (error) {
      console.error("Error loading tray data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to status updates
    const unsubscribe = window.trayApi.onStatusUpdate((data) => {
      setStatusUpdate(data);
      // Refresh data on status update
      loadData();
    });

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadData]);

  const handleStartSession = async (note: string) => {
    try {
      const session = await window.trayApi.startSession(note);
      setActiveSession(session);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await window.trayApi.endSession(activeSession.id);
      setActiveSession(null);
      loadData(); // Refresh to get updated stats
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const handleUpdateNote = async (note: string) => {
    if (!activeSession) return;
    try {
      const updated = await window.trayApi.updateSessionNote(
        activeSession.id,
        note,
      );
      if (updated) {
        setActiveSession(updated);
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleOpenMainApp = () => {
    window.trayApi.openMainApp();
    window.trayApi.hidePopover();
  };

  const handleOpenSettings = () => {
    window.trayApi.openSettings();
  };

  // Use status update for total time if available
  const totalTrackedMs = statusUpdate?.totalTrackedMs ?? todayStats.totalMs;

  return (
    <div className="w-[380px] h-[520px] bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Cronus</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenMainApp}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            title="Open main app"
          >
            <ExternalLink size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={handleOpenSettings}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            title="Settings"
          >
            <Settings size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Session Timer */}
        <SessionTimer
          activeSession={activeSession}
          onStartSession={handleStartSession}
          onEndSession={handleEndSession}
          onUpdateNote={handleUpdateNote}
        />

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
    </div>
  );
}
