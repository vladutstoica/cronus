import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { ActivityToRecategorize, Category } from "@shared/types";
import type { TaskProvider } from "../shared/taskTypes";

// Define the structure of the data being sent
interface FloatingStatusUpdate {
  latestStatus: "productive" | "unproductive" | "maybe" | null;
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  categoryDetails?: Category;
  activityIdentifier?: string;
  itemType?: "app" | "website";
  activityName?: string;
  activityUrl?: string;
  categoryReasoning?: string;
  isTrackingPaused?: boolean;
  ocrCaptured?: boolean;
  eventId?: string;
}

// Integration task type (matches IntegrationTask from backend)
interface IntegrationTask {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
  projectKey?: string;
  projectName?: string;
  url?: string;
  labels: string[];
  priority?: string;
  provider: TaskProvider;
}

// Integration status type
interface IntegrationStatus {
  provider: TaskProvider;
  isConfigured: boolean;
  isEnabled: boolean;
  lastVerifiedAt?: string;
}

export interface FloatingWindowApi {
  onStatusUpdate: (
    callback: (data: FloatingStatusUpdate) => void, // Expect the full data object
  ) => () => void;
  moveWindow: (deltaX: number, deltaY: number) => void;
  hideFloatingWindow: () => void;
  requestRecategorizeView: (activity: ActivityToRecategorize) => void;
  openMainAppWindow: () => void;
  resumeTracking: () => void;
  // Task tracking methods
  getIntegrationStatuses: () => Promise<IntegrationStatus[]>;
  getAssignedTasks: (provider: TaskProvider) => Promise<IntegrationTask[]>;
  searchTasks: (
    provider: TaskProvider,
    query: string,
  ) => Promise<IntegrationTask[]>;
}

const floatingApi: FloatingWindowApi = {
  onStatusUpdate: (callback: (data: FloatingStatusUpdate) => void) => {
    // The listener now expects the full FloatingStatusUpdate object
    const listener = (_event: IpcRendererEvent, data: FloatingStatusUpdate) =>
      callback(data);
    ipcRenderer.on("floating-window-status-updated", listener);
    return () => {
      ipcRenderer.removeListener("floating-window-status-updated", listener);
    };
  },
  moveWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send("move-floating-window", { deltaX, deltaY });
  },
  hideFloatingWindow: () => {
    ipcRenderer.send("hide-floating-window");
  },
  requestRecategorizeView: (activity: ActivityToRecategorize) => {
    ipcRenderer.send("request-recategorize-view", activity);
  },
  openMainAppWindow: () => {
    ipcRenderer.send("open-main-app-window");
  },
  resumeTracking: () => {
    ipcRenderer.invoke("resume-window-tracking");
  },
  // Task tracking methods
  getIntegrationStatuses: (): Promise<IntegrationStatus[]> => {
    return ipcRenderer.invoke("integration:get-statuses");
  },
  getAssignedTasks: (provider: TaskProvider): Promise<IntegrationTask[]> => {
    return ipcRenderer.invoke("integration:get-assigned-tasks", provider);
  },
  searchTasks: (
    provider: TaskProvider,
    query: string,
  ): Promise<IntegrationTask[]> => {
    return ipcRenderer.invoke("integration:search-tasks", { provider, query });
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("floatingApi", floatingApi);
  } catch (error) {
    console.error("Error exposing floatingApi:", error);
  }
} else {
  // @ts-ignore (unsafe assignment)
  window.floatingApi = floatingApi;
}
