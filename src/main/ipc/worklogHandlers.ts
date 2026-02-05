/**
 * IPC handlers for worklog operations
 * Exposes worklog database functions to the renderer process
 */

import { ipcMain } from "electron";
import { getOrCreateLocalUser } from "../database/services/users";
import {
  findWorklogsForDay,
  getTotalTimeForDay,
  getSyncStatusSummary,
} from "../database/services/worklogs";
import type {
  WorklogWithTask,
  WorklogSyncStatus,
} from "../../shared/taskTypes";

/**
 * Response type for worklog queries with task details
 */
interface WorklogDayResponse {
  worklogs: WorklogWithTask[];
  totalSeconds: number;
  syncStatusSummary: Record<WorklogSyncStatus, number>;
}

/**
 * Response type for weekly worklog queries
 */
interface WorklogWeekResponse {
  /** Worklogs grouped by date (YYYY-MM-DD) */
  worklogsByDate: Record<string, WorklogWithTask[]>;
  /** Total seconds per date */
  totalSecondsByDate: Record<string, number>;
  /** Overall total seconds for the week */
  totalSeconds: number;
  /** Start date of the week (YYYY-MM-DD) */
  startDate: string;
  /** End date of the week (YYYY-MM-DD) */
  endDate: string;
}

export function registerWorklogHandlers(): void {
  /**
   * Get worklogs for a specific day with task details
   */
  ipcMain.handle(
    "worklog:get-for-day",
    (_event, date: string): WorklogDayResponse => {
      const user = getOrCreateLocalUser();
      const worklogs = findWorklogsForDay(user.id, date, {
        includeTask: true,
      }) as WorklogWithTask[];
      const totalSeconds = getTotalTimeForDay(user.id, date);
      const syncStatusSummary = getSyncStatusSummary(user.id, date);

      return {
        worklogs,
        totalSeconds,
        syncStatusSummary,
      };
    },
  );

  /**
   * Get worklogs for a date range (typically a week)
   */
  ipcMain.handle(
    "worklog:get-for-range",
    (_event, startDate: string, endDate: string): WorklogWeekResponse => {
      const user = getOrCreateLocalUser();
      const worklogsByDate: Record<string, WorklogWithTask[]> = {};
      const totalSecondsByDate: Record<string, number> = {};
      let totalSeconds = 0;

      // Normalize dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Iterate through each day in the range
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        const dayWorklogs = findWorklogsForDay(user.id, dateStr, {
          includeTask: true,
        }) as WorklogWithTask[];
        const dayTotal = getTotalTimeForDay(user.id, dateStr);

        worklogsByDate[dateStr] = dayWorklogs;
        totalSecondsByDate[dateStr] = dayTotal;
        totalSeconds += dayTotal;

        current.setDate(current.getDate() + 1);
      }

      return {
        worklogsByDate,
        totalSecondsByDate,
        totalSeconds,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    },
  );

  /**
   * Get total time logged for a specific day
   */
  ipcMain.handle(
    "worklog:get-total-for-day",
    (_event, date: string): number => {
      const user = getOrCreateLocalUser();
      return getTotalTimeForDay(user.id, date);
    },
  );

  /**
   * Get sync status summary for a user (optionally filtered by date)
   */
  ipcMain.handle(
    "worklog:get-sync-summary",
    (_event, date?: string): Record<WorklogSyncStatus, number> => {
      const user = getOrCreateLocalUser();
      return getSyncStatusSummary(user.id, date);
    },
  );
}
