import { ipcMain, BrowserWindow } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import { getEventsByUserAndTimeRange } from "../database/services/activeWindowEvents";
import { computeEventDurations } from "../utils/eventDurations";
import { Windows } from "./shared";

export function registerTrayHandlers(
  windows: Windows,
  recreateMainWindow: () => BrowserWindow,
): void {
  ipcMain.handle("tray:get-today-stats", () => {
    const user = getOrCreateLocalUser();
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const events = getEventsByUserAndTimeRange(user.id, startOfDay, endOfDay);
    const durations = computeEventDurations(events);

    // Find first event timestamp (work started)
    const workStarted =
      durations.length > 0
        ? new Date(durations[0].eventTimeMs).toISOString()
        : null;

    // Calculate total tracked time
    const totalMs = durations.reduce((sum, d) => sum + d.durationMs, 0);

    return {
      workStarted,
      totalMs,
    };
  });

  ipcMain.handle("tray:get-hourly-activity", () => {
    const user = getOrCreateLocalUser();
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const events = getEventsByUserAndTimeRange(user.id, startOfDay, endOfDay);
    const durations = computeEventDurations(events);

    const hourlyMap = new Map<number, number>();

    for (const { eventTimeMs, durationMs } of durations) {
      const hour = new Date(eventTimeMs).getHours();
      const currentDuration = hourlyMap.get(hour) || 0;
      hourlyMap.set(hour, currentDuration + durationMs);
    }

    // Convert to array
    return Array.from(hourlyMap.entries()).map(([hour, durationMs]) => ({
      hour,
      durationMs,
    }));
  });

  ipcMain.handle("tray:get-top-apps", () => {
    const user = getOrCreateLocalUser();
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const events = getEventsByUserAndTimeRange(user.id, startOfDay, endOfDay);
    const durations = computeEventDurations(events);

    const appMap = new Map<string, number>();

    for (const { event, durationMs } of durations) {
      const appName = event.owner_name || "Unknown";
      const currentDuration = appMap.get(appName) || 0;
      appMap.set(appName, currentDuration + durationMs);
    }

    // Sort by duration and return top 6
    return Array.from(appMap.entries())
      .map(([name, durationMs]) => ({ name, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 6);
  });

  // Hide tray popover handler
  ipcMain.on("hide-tray-popover", () => {
    if (windows.trayPopoverWindow && !windows.trayPopoverWindow.isDestroyed()) {
      windows.trayPopoverWindow.hide();
    }
  });

  // Open settings page handler
  ipcMain.on("open-settings-page", () => {
    // Open main window and navigate to settings
    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
      windows.mainWindow.show();
      windows.mainWindow.focus();
      windows.mainWindow.webContents.send("navigate-to-settings");
    } else {
      const mainWindow = recreateMainWindow();
      mainWindow.once("ready-to-show", () => {
        mainWindow.webContents.send("navigate-to-settings");
      });
    }
    // Hide tray popover
    if (windows.trayPopoverWindow && !windows.trayPopoverWindow.isDestroyed()) {
      windows.trayPopoverWindow.hide();
    }
  });
}
