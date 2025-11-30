import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Work session types
export interface WorkSession {
  id: string;
  user_id: string;
  note: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  created_at: string;
}

// Tray status update from main process
export interface TrayStatusUpdate {
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  totalTrackedMs: number;
  isTrackingPaused: boolean;
}

// Today's stats
export interface TodayStats {
  workStarted: string | null;
  totalMs: number;
}

// Hourly activity data
export interface HourlyActivity {
  hour: number;
  durationMs: number;
}

// Top app data
export interface TopApp {
  name: string;
  durationMs: number;
}

export interface TrayPopoverApi {
  // Work session management
  getActiveSession: () => Promise<WorkSession | null>;
  startSession: (note: string) => Promise<WorkSession>;
  endSession: (sessionId: string) => Promise<WorkSession | null>;
  updateSessionNote: (
    sessionId: string,
    note: string,
  ) => Promise<WorkSession | null>;
  getSessionsByDate: (date: string) => Promise<WorkSession[]>;

  // Stats
  getTodayStats: () => Promise<TodayStats>;
  getHourlyActivity: () => Promise<HourlyActivity[]>;
  getTopApps: () => Promise<TopApp[]>;

  // Status updates (from main process)
  onStatusUpdate: (callback: (data: TrayStatusUpdate) => void) => () => void;

  // Window control
  hidePopover: () => void;
  openMainApp: () => void;
  openSettings: () => void;
}

const trayApi: TrayPopoverApi = {
  // Work session management
  getActiveSession: () => ipcRenderer.invoke("work-session:get-active"),
  startSession: (note: string) =>
    ipcRenderer.invoke("work-session:start", note),
  endSession: (sessionId: string) =>
    ipcRenderer.invoke("work-session:end", sessionId),
  updateSessionNote: (sessionId: string, note: string) =>
    ipcRenderer.invoke("work-session:update-note", sessionId, note),
  getSessionsByDate: (date: string) =>
    ipcRenderer.invoke("work-session:get-by-date", date),

  // Stats
  getTodayStats: () => ipcRenderer.invoke("tray:get-today-stats"),
  getHourlyActivity: () => ipcRenderer.invoke("tray:get-hourly-activity"),
  getTopApps: () => ipcRenderer.invoke("tray:get-top-apps"),

  // Status updates
  onStatusUpdate: (callback: (data: TrayStatusUpdate) => void) => {
    const listener = (_event: IpcRendererEvent, data: TrayStatusUpdate) =>
      callback(data);
    ipcRenderer.on("tray-status-updated", listener);
    return () => {
      ipcRenderer.removeListener("tray-status-updated", listener);
    };
  },

  // Window control
  hidePopover: () => {
    ipcRenderer.send("hide-tray-popover");
  },
  openMainApp: () => {
    ipcRenderer.send("open-main-app-window");
  },
  openSettings: () => {
    ipcRenderer.send("open-settings-page");
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("trayApi", trayApi);
  } catch (error) {
    console.error("Error exposing trayApi:", error);
  }
} else {
  // @ts-ignore (unsafe assignment)
  window.trayApi = trayApi;
}
