/**
 * Hook for managing the active/current task being worked on
 *
 * Provides state management and persistence for tracking which task
 * the user is currently working on. Integrates with Jira/Linear tasks.
 */

import { useState, useCallback, useEffect } from "react";
import type { TaskProvider } from "../../../shared/taskTypes";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents an active task from an external integration
 */
export interface ActiveTask {
  id: string;
  identifier: string; // e.g., "VIB-50" or "PROJ-123"
  title: string;
  provider: TaskProvider;
  url?: string;
  projectKey?: string;
  selectedAt: string; // ISO timestamp when the task was selected
}

/**
 * Return type for the useActiveTask hook
 */
export interface UseActiveTaskReturn {
  activeTask: ActiveTask | null;
  setActiveTask: (task: ActiveTask | null) => void;
  clearActiveTask: () => void;
  isTaskActive: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "cronus-active-task";

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Load active task from localStorage
 */
function loadActiveTask(): ActiveTask | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as ActiveTask;

    // Validate required fields
    if (!parsed.id || !parsed.identifier || !parsed.title || !parsed.provider) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save active task to localStorage
 */
function saveActiveTask(task: ActiveTask | null): void {
  try {
    if (task) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage might not be available
    console.warn("[useActiveTask] Failed to save active task to localStorage");
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing the currently active task
 *
 * Features:
 * - Persists active task to localStorage
 * - Provides methods to set and clear the active task
 * - Tracks when the task was selected
 *
 * @example
 * ```tsx
 * const { activeTask, setActiveTask, clearActiveTask } = useActiveTask();
 *
 * // Set a task as active
 * setActiveTask({
 *   id: "abc123",
 *   identifier: "VIB-50",
 *   title: "Build task picker",
 *   provider: "linear",
 *   selectedAt: new Date().toISOString()
 * });
 *
 * // Clear the active task
 * clearActiveTask();
 * ```
 */
export function useActiveTask(): UseActiveTaskReturn {
  const [activeTask, setActiveTaskState] = useState<ActiveTask | null>(() =>
    loadActiveTask(),
  );

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadActiveTask();
    if (stored) {
      setActiveTaskState(stored);
    }
  }, []);

  /**
   * Set the active task and persist to storage
   */
  const setActiveTask = useCallback((task: ActiveTask | null) => {
    const taskWithTimestamp = task
      ? {
          ...task,
          selectedAt: task.selectedAt || new Date().toISOString(),
        }
      : null;

    setActiveTaskState(taskWithTimestamp);
    saveActiveTask(taskWithTimestamp);
  }, []);

  /**
   * Clear the active task
   */
  const clearActiveTask = useCallback(() => {
    setActiveTaskState(null);
    saveActiveTask(null);
  }, []);

  return {
    activeTask,
    setActiveTask,
    clearActiveTask,
    isTaskActive: activeTask !== null,
  };
}

export default useActiveTask;
