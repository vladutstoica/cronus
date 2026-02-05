import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { TodayTab, SessionsTab, ActionsTab } from "./tabs";
import { Calendar, Clock, Zap } from "lucide-react";

// Storage key for persisting the last active tab
const ACTIVE_TAB_STORAGE_KEY = "cronus-tray-active-tab";

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
      pauseTracking: () => Promise<void>;
      resumeTracking: () => Promise<void>;
      hidePopover: () => void;
      openMainApp: () => void;
      openSettings: () => void;
      quitApp: () => void;
    };
  }
}

type TabValue = "today" | "sessions" | "actions";

export function TrayPopover() {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
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

  // Initialize active tab from localStorage
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (stored && ["today", "sessions", "actions"].includes(stored)) {
        return stored as TabValue;
      }
    } catch {
      // localStorage might not be available
    }
    return "today";
  });

  // Persist active tab to localStorage
  const handleTabChange = useCallback((value: string) => {
    const tabValue = value as TabValue;
    setActiveTab(tabValue);
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabValue);
    } catch {
      // localStorage might not be available
    }
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [session, stats, activity, apps, sessions] = await Promise.all([
        window.trayApi.getActiveSession(),
        window.trayApi.getTodayStats(),
        window.trayApi.getHourlyActivity(),
        window.trayApi.getTopApps(),
        window.trayApi.getSessionsByDate(today),
      ]);

      setActiveSession(session);
      setTodayStats(stats);
      setHourlyActivity(activity);
      setTopApps(apps);
      // Filter out active session from recent sessions and sort by most recent
      setRecentSessions(
        sessions
          .filter((s) => s.endedAt) // Only completed sessions
          .sort(
            (a, b) =>
              new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
          ),
      );
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

  const handleToggleTracking = async () => {
    try {
      if (statusUpdate?.isTrackingPaused) {
        await window.trayApi.resumeTracking();
      } else {
        await window.trayApi.pauseTracking();
      }
      // The status update will come through the subscription
    } catch (error) {
      console.error("Error toggling tracking:", error);
    }
  };

  const handleQuitApp = () => {
    window.trayApi.quitApp();
  };

  return (
    <div className="w-[380px] h-[520px] bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Cronus</h1>
        {statusUpdate && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              statusUpdate.isTrackingPaused
                ? "text-warning"
                : "text-success"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                statusUpdate.isTrackingPaused ? "bg-warning" : "bg-success"
              }`}
            />
            {statusUpdate.isTrackingPaused ? "Paused" : "Tracking"}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-3 flex-shrink-0" style={{ width: "calc(100% - 32px)" }}>
            <TabsTrigger value="today" className="gap-1">
              <Calendar size={12} />
              Today
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1">
              <Clock size={12} />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1">
              <Zap size={12} />
              Actions
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="today" className="mt-0 h-full">
              <TodayTab
                todayStats={todayStats}
                hourlyActivity={hourlyActivity}
                topApps={topApps}
                statusUpdate={statusUpdate}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="sessions" className="mt-0 h-full">
              <SessionsTab
                activeSession={activeSession}
                recentSessions={recentSessions}
                onStartSession={handleStartSession}
                onEndSession={handleEndSession}
                onUpdateNote={handleUpdateNote}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0 h-full">
              <ActionsTab
                statusUpdate={statusUpdate}
                onOpenMainApp={handleOpenMainApp}
                onOpenSettings={handleOpenSettings}
                onToggleTracking={handleToggleTracking}
                onQuitApp={handleQuitApp}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
