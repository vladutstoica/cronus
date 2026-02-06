/**
 * TaskQuickPicker Component
 *
 * A compact dialog for quickly selecting and assigning a task from
 * connected integrations (Jira, Linear). Features fuzzy search filtering
 * and full keyboard navigation.
 *
 * Opens via Cmd+Shift+T keyboard shortcut.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Search, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import type { TaskProvider } from "../../../../shared/taskTypes";
import type { ActiveTask } from "../../hooks/useActiveTask";

// ============================================================================
// Types
// ============================================================================

/**
 * Task from integration (matches IntegrationTask from backend)
 */
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

/**
 * Integration status
 */
interface IntegrationStatus {
  provider: TaskProvider;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface TaskQuickPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: ActiveTask) => void;
  currentTask?: ActiveTask | null;
}

// ============================================================================
// Provider Colors
// ============================================================================

const PROVIDER_COLORS: Record<
  TaskProvider,
  { bg: string; text: string; border: string; label: string }
> = {
  jira: {
    bg: "bg-[#0052CC]/10",
    text: "text-[#0052CC]",
    border: "border-[#0052CC]/30",
    label: "Jira",
  },
  linear: {
    bg: "bg-[#5E6AD2]/10",
    text: "text-[#5E6AD2]",
    border: "border-[#5E6AD2]/30",
    label: "Linear",
  },
};

// ============================================================================
// Fuzzy Search Helper
// ============================================================================

/**
 * Simple fuzzy search matching
 * Returns true if all characters in query appear in text in order
 */
function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

/**
 * Calculate match score (higher = better match)
 */
function matchScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match at start gets highest score
  if (textLower.startsWith(queryLower)) {
    return 100;
  }

  // Contains exact query gets high score
  if (textLower.includes(queryLower)) {
    return 80 - textLower.indexOf(queryLower);
  }

  // Fuzzy match gets lower score
  if (fuzzyMatch(text, query)) {
    return 50;
  }

  return 0;
}

// ============================================================================
// Check if IPC is available
// ============================================================================

function isIpcAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.electron?.ipcRenderer?.invoke !== undefined
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TaskItemProps {
  task: IntegrationTask;
  isSelected: boolean;
  isCurrentTask: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isSelected,
  isCurrentTask,
  onSelect,
  onMouseEnter,
}) => {
  const colors = PROVIDER_COLORS[task.provider];

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
        isSelected && "bg-accent",
        !isSelected && "hover:bg-accent/50",
      )}
    >
      {/* Task ID Badge */}
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-xs px-1.5 py-0 h-5 flex-shrink-0",
          colors.bg,
          colors.text,
          colors.border,
        )}
      >
        {task.identifier}
      </Badge>

      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {task.title}
        </p>
        {task.status && (
          <p className="text-xs text-muted-foreground truncate">
            {task.status}
          </p>
        )}
      </div>

      {/* Current task indicator */}
      {isCurrentTask && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          Current
        </Badge>
      )}

      {/* External link indicator */}
      {task.url && (
        <ExternalLink
          className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
    <p className="text-sm text-muted-foreground">Loading tasks...</p>
  </div>
);

const EmptyState: React.FC<{ hasQuery: boolean }> = ({ hasQuery }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Search className="h-6 w-6 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">
      {hasQuery ? "No tasks match your search" : "No assigned tasks found"}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {hasQuery
        ? "Try a different search term"
        : "Check your integration settings"}
    </p>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <AlertCircle className="h-6 w-6 text-destructive mb-2" />
    <p className="text-sm text-destructive">Failed to load tasks</p>
    <p className="text-xs text-muted-foreground mt-1">{message}</p>
  </div>
);

const NoIntegrationsState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
    <p className="text-sm text-foreground">No integrations configured</p>
    <p className="text-xs text-muted-foreground mt-1">
      Connect Jira or Linear in Settings to use task tracking
    </p>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const TaskQuickPicker: React.FC<TaskQuickPickerProps> = ({
  isOpen,
  onClose,
  onSelectTask,
  currentTask,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<IntegrationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    IntegrationStatus[]
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Check which integrations are configured
  const configuredProviders = useMemo(
    () =>
      integrationStatuses
        .filter((s) => s.isConfigured && s.isEnabled)
        .map((s) => s.provider),
    [integrationStatuses],
  );

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }

    const query = searchQuery.trim();

    return tasks
      .filter(
        (task) =>
          fuzzyMatch(task.identifier, query) ||
          fuzzyMatch(task.title, query) ||
          (task.projectKey && fuzzyMatch(task.projectKey, query)),
      )
      .sort((a, b) => {
        // Sort by match score (identifier matches first, then title)
        const aIdScore = matchScore(a.identifier, query);
        const bIdScore = matchScore(b.identifier, query);

        if (aIdScore !== bIdScore) {
          return bIdScore - aIdScore;
        }

        return matchScore(b.title, query) - matchScore(a.title, query);
      });
  }, [tasks, searchQuery]);

  // Fetch integration statuses
  const fetchIntegrationStatuses = useCallback(async () => {
    if (!isIpcAvailable()) {
      // Mock statuses for development
      setIntegrationStatuses([
        { provider: "linear", isConfigured: true, isEnabled: true },
        { provider: "jira", isConfigured: true, isEnabled: true },
      ]);
      return;
    }

    try {
      const statuses = await window.electron.ipcRenderer.invoke(
        "integration:get-statuses",
      );
      setIntegrationStatuses(statuses);
    } catch (err) {
      console.error(
        "[TaskQuickPicker] Failed to fetch integration statuses:",
        err,
      );
    }
  }, []);

  // Fetch tasks from configured integrations
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isIpcAvailable()) {
        // Mock tasks for development
        const mockTasks: IntegrationTask[] = [
          {
            id: "1",
            identifier: "VIB-123",
            title: "Add task quick picker to floating window",
            status: "In Progress",
            provider: "linear",
            url: "https://linear.app/vibe/issue/VIB-123",
            labels: [],
          },
          {
            id: "2",
            identifier: "VIB-124",
            title: "Implement keyboard shortcuts for task switching",
            status: "Todo",
            provider: "linear",
            url: "https://linear.app/vibe/issue/VIB-124",
            labels: [],
          },
          {
            id: "3",
            identifier: "PROJ-456",
            title: "Fix authentication bug in login flow",
            status: "In Development",
            provider: "jira",
            url: "https://example.atlassian.net/browse/PROJ-456",
            labels: [],
          },
          {
            id: "4",
            identifier: "PROJ-789",
            title: "Update dashboard analytics components",
            status: "Code Review",
            provider: "jira",
            url: "https://example.atlassian.net/browse/PROJ-789",
            labels: [],
          },
        ];

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setTasks(mockTasks);
        setIsLoading(false);
        return;
      }

      // Fetch tasks from all configured providers
      const allTasks: IntegrationTask[] = [];

      for (const provider of configuredProviders) {
        try {
          const providerTasks = await window.electron.ipcRenderer.invoke(
            "integration:get-assigned-tasks",
            provider,
          );
          allTasks.push(...providerTasks);
        } catch (err) {
          console.error(
            `[TaskQuickPicker] Failed to fetch ${provider} tasks:`,
            err,
          );
        }
      }

      setTasks(allTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [configuredProviders]);

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      fetchIntegrationStatuses();
    }
  }, [isOpen, fetchIntegrationStatuses]);

  // Fetch tasks when integrations are loaded
  useEffect(() => {
    if (isOpen && configuredProviders.length > 0) {
      fetchTasks();
    } else if (
      isOpen &&
      configuredProviders.length === 0 &&
      integrationStatuses.length > 0
    ) {
      setIsLoading(false);
    }
  }, [isOpen, configuredProviders, fetchTasks, integrationStatuses.length]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Reset selection when filtered tasks change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTasks.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredTasks.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredTasks.length]);

  // Handle task selection
  const handleSelectTask = useCallback(
    (task: IntegrationTask) => {
      const activeTask: ActiveTask = {
        id: task.id,
        identifier: task.identifier,
        title: task.title,
        provider: task.provider,
        url: task.url,
        projectKey: task.projectKey,
        selectedAt: new Date().toISOString(),
      };

      onSelectTask(activeTask);
      onClose();
    },
    [onSelectTask, onClose],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredTasks.length - 1 ? prev + 1 : prev,
          );
          break;

        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case "Enter":
          event.preventDefault();
          if (filteredTasks[selectedIndex]) {
            handleSelectTask(filteredTasks[selectedIndex]);
          }
          break;

        case "Escape":
          event.preventDefault();
          onClose();
          break;

        case "Tab":
          // Prevent tab from moving focus out of the dialog
          event.preventDefault();
          break;
      }
    },
    [filteredTasks, selectedIndex, handleSelectTask, onClose],
  );

  // Render content based on state
  const renderContent = () => {
    if (configuredProviders.length === 0 && !isLoading) {
      return <NoIntegrationsState />;
    }

    if (isLoading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState message={error} />;
    }

    if (filteredTasks.length === 0) {
      return <EmptyState hasQuery={searchQuery.trim().length > 0} />;
    }

    return (
      <ScrollArea className="h-[300px]">
        <div ref={listRef} className="space-y-0.5 p-1" role="listbox">
          {filteredTasks.map((task, index) => (
            <div key={`${task.provider}-${task.id}`} data-index={index}>
              <TaskItem
                task={task}
                isSelected={index === selectedIndex}
                isCurrentTask={currentTask?.identifier === task.identifier}
                onSelect={() => handleSelectTask(task)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Quick Task Picker</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search tasks by ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="border-t">{renderContent()}</div>

        {/* Footer with keyboard hints */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                Enter
              </kbd>{" "}
              to select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                Esc
              </kbd>{" "}
              to cancel
            </span>
          </div>
          {filteredTasks.length > 0 && (
            <span>
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskQuickPicker;
