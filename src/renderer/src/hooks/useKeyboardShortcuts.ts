import { useCallback, useEffect, useMemo } from "react";
import type { MainSection } from "../components/MainViewSidebar";

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers?: ("meta" | "ctrl" | "alt" | "shift")[];
  label: string;
  description: string;
  category: "navigation" | "actions" | "general";
  action: () => void;
}

/**
 * Options for the keyboard shortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  // Navigation handlers
  onNavigateSection: (section: MainSection) => void;
  onNavigateSettings: () => void;

  // Action handlers
  onToggleTracking: () => void;
  onOpenCommandPalette: () => void;
  onOpenTaskPicker?: () => void;

  // Help dialog state
  isShortcutsHelpOpen: boolean;
  setIsShortcutsHelpOpen: (isOpen: boolean) => void;

  // Enabled state
  enabled?: boolean;
}

/**
 * Return type for the keyboard shortcuts hook
 */
export interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
  isShortcutsHelpOpen: boolean;
  openShortcutsHelp: () => void;
  closeShortcutsHelp: () => void;
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(
  event: KeyboardEvent,
  key: string,
  modifiers?: ("meta" | "ctrl" | "alt" | "shift")[],
): boolean {
  // Normalize the key comparison
  const eventKey = event.key.toLowerCase();
  const targetKey = key.toLowerCase();

  // Check the main key
  if (eventKey !== targetKey) {
    return false;
  }

  // Check modifiers
  const requiresMeta = modifiers?.includes("meta") ?? false;
  const requiresCtrl = modifiers?.includes("ctrl") ?? false;
  const requiresAlt = modifiers?.includes("alt") ?? false;
  const requiresShift = modifiers?.includes("shift") ?? false;

  // On macOS, metaKey is Cmd; on Windows/Linux, use ctrlKey as fallback
  const hasMetaOrCtrl = event.metaKey || (requiresMeta && event.ctrlKey);

  if (requiresMeta && !hasMetaOrCtrl) return false;
  if (requiresCtrl && !event.ctrlKey) return false;
  if (requiresAlt && !event.altKey) return false;
  if (requiresShift && !event.shiftKey) return false;

  // If no modifiers required, make sure none are pressed for single-key shortcuts
  if (!modifiers || modifiers.length === 0) {
    // Don't trigger single-key shortcuts when modifier keys are held
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for managing global keyboard shortcuts throughout the app.
 * Provides navigation shortcuts (Cmd+1-5), action shortcuts (Cmd+P),
 * and displays a shortcuts help dialog when ? is pressed.
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions,
): UseKeyboardShortcutsReturn {
  const {
    onNavigateSection,
    onNavigateSettings,
    onToggleTracking,
    onOpenCommandPalette,
    onOpenTaskPicker,
    isShortcutsHelpOpen,
    setIsShortcutsHelpOpen,
    enabled = true,
  } = options;

  const openShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(true);
  }, [setIsShortcutsHelpOpen]);

  const closeShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(false);
  }, [setIsShortcutsHelpOpen]);

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      // Navigation shortcuts
      {
        id: "nav-dashboard",
        key: "1",
        modifiers: ["meta"],
        label: "Cmd+1",
        description: "Go to Dashboard",
        category: "navigation",
        action: () => onNavigateSection("dashboard"),
      },
      {
        id: "nav-todos",
        key: "2",
        modifiers: ["meta"],
        label: "Cmd+2",
        description: "Go to Todos",
        category: "navigation",
        action: () => onNavigateSection("todos"),
      },
      {
        id: "nav-stats",
        key: "3",
        modifiers: ["meta"],
        label: "Cmd+3",
        description: "Go to Stats",
        category: "navigation",
        action: () => onNavigateSection("stats"),
      },
      {
        id: "nav-settings",
        key: ",",
        modifiers: ["meta"],
        label: "Cmd+,",
        description: "Open Settings",
        category: "navigation",
        action: onNavigateSettings,
      },

      // Action shortcuts
      {
        id: "action-pause",
        key: "p",
        modifiers: ["meta"],
        label: "Cmd+P",
        description: "Pause/Resume Tracking",
        category: "actions",
        action: onToggleTracking,
      },
      {
        id: "action-command-palette",
        key: "k",
        modifiers: ["meta"],
        label: "Cmd+K",
        description: "Open Command Palette",
        category: "actions",
        action: onOpenCommandPalette,
      },
      {
        id: "action-task-picker",
        key: "t",
        modifiers: ["meta", "shift"],
        label: "Cmd+Shift+T",
        description: "Open Task Picker",
        category: "actions",
        action: () => onOpenTaskPicker?.(),
      },

      // General shortcuts
      {
        id: "help-shortcuts",
        key: "?",
        modifiers: [],
        label: "?",
        description: "Show Keyboard Shortcuts",
        category: "general",
        action: openShortcutsHelp,
      },
      {
        id: "help-shortcuts-alt",
        key: "/",
        modifiers: ["meta"],
        label: "Cmd+/",
        description: "Show Keyboard Shortcuts",
        category: "general",
        action: openShortcutsHelp,
      },
    ],
    [
      onNavigateSection,
      onNavigateSettings,
      onToggleTracking,
      onOpenCommandPalette,
      onOpenTaskPicker,
      openShortcutsHelp,
    ],
  );

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow only modifier-key shortcuts in input fields
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

      // Skip if in input field and no modifier key (allow Cmd+shortcuts)
      if (isInputField && !hasModifier) {
        return;
      }

      // Skip Cmd+K as it's handled by useCommandPalette hook
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        return;
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut.key, shortcut.modifiers)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, shortcuts]);

  return {
    shortcuts,
    isShortcutsHelpOpen,
    openShortcutsHelp,
    closeShortcutsHelp,
  };
}
