/**
 * Hook for fetching and managing worklog data
 * Provides functions for fetching worklogs by day and week
 */

import { useState, useCallback, useEffect } from "react";
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import type {
  WorklogWithTask,
  WorklogSyncStatus,
  TaskProvider,
} from "../../../shared/taskTypes";

// Types for worklog data
export interface WorklogEntry {
  id: number;
  taskId: string;
  taskTitle: string;
  totalSeconds: number;
  syncStatus: WorklogSyncStatus;
  provider: TaskProvider;
  activityCount: number;
  errorMessage?: string;
  externalUrl?: string;
  date: string;
}

export interface DayWorklogData {
  worklogs: WorklogEntry[];
  totalSeconds: number;
  syncStatusSummary: Record<WorklogSyncStatus, number>;
  date: string;
}

export interface WeekWorklogData {
  worklogsByDate: Record<string, WorklogEntry[]>;
  totalSecondsByDate: Record<string, number>;
  totalSeconds: number;
  startDate: string;
  endDate: string;
  days: Array<{
    date: string;
    dayName: string;
    totalSeconds: number;
    worklogs: WorklogEntry[];
  }>;
}

// Mock data for development/demo
const mockWorklogs: WorklogEntry[] = [
  {
    id: 1,
    taskId: "VIB-119",
    taskTitle: "Build task detection engine",
    totalSeconds: 7200,
    syncStatus: "synced",
    provider: "linear",
    activityCount: 12,
    externalUrl: "https://linear.app/vibe/issue/VIB-119",
    date: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: 2,
    taskId: "PROJ-456",
    taskTitle: "Fix authentication bug in login flow",
    totalSeconds: 5400,
    syncStatus: "pending",
    provider: "jira",
    activityCount: 8,
    externalUrl: "https://example.atlassian.net/browse/PROJ-456",
    date: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: 3,
    taskId: "VIB-120",
    taskTitle: "Create worklog aggregation service",
    totalSeconds: 3600,
    syncStatus: "failed",
    provider: "linear",
    activityCount: 5,
    errorMessage: "API rate limit exceeded",
    externalUrl: "https://linear.app/vibe/issue/VIB-120",
    date: format(new Date(), "yyyy-MM-dd"),
  },
  {
    id: 4,
    taskId: "PROJ-789",
    taskTitle: "Update dashboard analytics components",
    totalSeconds: 1800,
    syncStatus: "skipped",
    provider: "jira",
    activityCount: 3,
    externalUrl: "https://example.atlassian.net/browse/PROJ-789",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
  },
  {
    id: 5,
    taskId: "VIB-121",
    taskTitle: "Implement daily worklog view",
    totalSeconds: 4500,
    syncStatus: "synced",
    provider: "linear",
    activityCount: 6,
    externalUrl: "https://linear.app/vibe/issue/VIB-121",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
  },
  {
    id: 6,
    taskId: "VIB-122",
    taskTitle: "Add weekly summary chart",
    totalSeconds: 2700,
    syncStatus: "pending",
    provider: "linear",
    activityCount: 4,
    externalUrl: "https://linear.app/vibe/issue/VIB-122",
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
  },
];

/**
 * Convert WorklogWithTask from IPC to WorklogEntry for UI
 */
function convertToWorklogEntry(worklog: WorklogWithTask): WorklogEntry {
  return {
    id: worklog.id,
    taskId: worklog.task?.externalId ?? `task-${worklog.taskId}`,
    taskTitle: worklog.task?.title ?? "Unknown Task",
    totalSeconds: worklog.totalSeconds,
    syncStatus: worklog.syncStatus,
    provider: worklog.task?.provider ?? "linear",
    activityCount: 0, // This would come from task associations
    errorMessage: worklog.errorMessage,
    externalUrl: worklog.task?.externalUrl,
    date: worklog.date,
  };
}

/**
 * Check if IPC is available (running in Electron context)
 */
function isIpcAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.electron?.ipcRenderer?.invoke !== undefined
  );
}

/**
 * Hook for fetching worklogs for a specific day
 */
export function useDayWorklogs(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate ?? new Date(),
  );
  const [data, setData] = useState<DayWorklogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorklogs = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);

    try {
      const dateStr = format(date, "yyyy-MM-dd");

      if (isIpcAvailable()) {
        // Use IPC to fetch from database
        const response = await window.electron.ipcRenderer.invoke(
          "worklog:get-for-day",
          dateStr,
        );

        const worklogs = (response.worklogs as WorklogWithTask[]).map(
          convertToWorklogEntry,
        );

        setData({
          worklogs,
          totalSeconds: response.totalSeconds,
          syncStatusSummary: response.syncStatusSummary,
          date: dateStr,
        });
      } else {
        // Use mock data for development
        const filteredWorklogs = mockWorklogs.filter((w) => w.date === dateStr);
        const totalSeconds = filteredWorklogs.reduce(
          (sum, w) => sum + w.totalSeconds,
          0,
        );

        setData({
          worklogs: filteredWorklogs,
          totalSeconds,
          syncStatusSummary: {
            pending: filteredWorklogs.filter((w) => w.syncStatus === "pending")
              .length,
            synced: filteredWorklogs.filter((w) => w.syncStatus === "synced")
              .length,
            failed: filteredWorklogs.filter((w) => w.syncStatus === "failed")
              .length,
            skipped: filteredWorklogs.filter((w) => w.syncStatus === "skipped")
              .length,
          },
          date: dateStr,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worklogs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorklogs(selectedDate);
  }, [selectedDate, fetchWorklogs]);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => subDays(prev, 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const isToday = isSameDay(selectedDate, new Date());

  return {
    selectedDate,
    setSelectedDate,
    data,
    isLoading,
    error,
    refetch: () => fetchWorklogs(selectedDate),
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
  };
}

/**
 * Hook for fetching worklogs for a week
 */
export function useWeekWorklogs(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate ?? new Date(),
  );
  const [data, setData] = useState<WeekWorklogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate week bounds (Monday to Sunday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const fetchWorklogs = useCallback(async (start: Date, end: Date) => {
    setIsLoading(true);
    setError(null);

    try {
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      if (isIpcAvailable()) {
        // Use IPC to fetch from database
        const response = await window.electron.ipcRenderer.invoke(
          "worklog:get-for-range",
          startStr,
          endStr,
        );

        const worklogsByDate: Record<string, WorklogEntry[]> = {};
        for (const [date, worklogs] of Object.entries(
          response.worklogsByDate,
        )) {
          worklogsByDate[date] = (worklogs as WorklogWithTask[]).map(
            convertToWorklogEntry,
          );
        }

        const days = eachDayOfInterval({ start, end }).map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return {
            date: dateStr,
            dayName: format(day, "EEE"),
            totalSeconds: response.totalSecondsByDate[dateStr] ?? 0,
            worklogs: worklogsByDate[dateStr] ?? [],
          };
        });

        setData({
          worklogsByDate,
          totalSecondsByDate: response.totalSecondsByDate,
          totalSeconds: response.totalSeconds,
          startDate: startStr,
          endDate: endStr,
          days,
        });
      } else {
        // Use mock data for development
        const worklogsByDate: Record<string, WorklogEntry[]> = {};
        const totalSecondsByDate: Record<string, number> = {};
        let totalSeconds = 0;

        const days = eachDayOfInterval({ start, end }).map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayWorklogs = mockWorklogs.filter((w) => w.date === dateStr);
          const dayTotal = dayWorklogs.reduce(
            (sum, w) => sum + w.totalSeconds,
            0,
          );

          worklogsByDate[dateStr] = dayWorklogs;
          totalSecondsByDate[dateStr] = dayTotal;
          totalSeconds += dayTotal;

          return {
            date: dateStr,
            dayName: format(day, "EEE"),
            totalSeconds: dayTotal,
            worklogs: dayWorklogs,
          };
        });

        setData({
          worklogsByDate,
          totalSecondsByDate,
          totalSeconds,
          startDate: startStr,
          endDate: endStr,
          days,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worklogs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorklogs(weekStart, weekEnd);
  }, [weekStart, weekEnd, fetchWorklogs]);

  const goToPreviousWeek = useCallback(() => {
    setSelectedDate((prev) => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => addWeeks(prev, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const isCurrentWeek = isSameDay(
    weekStart,
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  return {
    selectedDate,
    setSelectedDate,
    weekStart,
    weekEnd,
    data,
    isLoading,
    error,
    refetch: () => fetchWorklogs(weekStart, weekEnd),
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isCurrentWeek,
  };
}

/**
 * Format seconds as human-readable duration
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds as decimal hours (e.g., 1.5h)
 */
export function formatDecimalHours(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(1)}h`;
}

/**
 * Parse a date string safely
 */
export function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}
