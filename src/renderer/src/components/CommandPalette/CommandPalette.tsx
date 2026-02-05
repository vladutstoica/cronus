import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  CheckSquare,
  Command,
  LayoutDashboard,
  Pause,
  PictureInPicture2,
  Play,
  Search,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { filterCommands } from "./fuzzySearch";
import type { CommandCategory, CommandGroup, CommandItem } from "./types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  // Navigation
  onNavigateDashboard: () => void;
  onNavigateTodos: () => void;
  onNavigateStats: () => void;
  onNavigateSettings: () => void;
  // Actions
  isTrackingPaused: boolean;
  onToggleTracking: () => void;
  isMiniTimerVisible: boolean;
  onToggleFloatingWindow: () => void;
  // Sound alerts - optional for now
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: "Navigation",
  action: "Actions",
  category: "Categories",
};

const CATEGORY_ORDER: CommandCategory[] = ["navigation", "action", "category"];

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateDashboard,
  onNavigateTodos,
  onNavigateStats,
  onNavigateSettings,
  isTrackingPaused,
  onToggleTracking,
  isMiniTimerVisible,
  onToggleFloatingWindow,
  isSoundEnabled,
  onToggleSound,
}: CommandPaletteProps): ReactElement {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items
  const allCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [
      // Navigation commands
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        icon: <LayoutDashboard size={16} />,
        shortcut: "",
        category: "navigation",
        keywords: ["home", "main", "overview"],
        onSelect: () => {
          onNavigateDashboard();
          onClose();
        },
      },
      {
        id: "nav-todos",
        label: "Go to Todos",
        icon: <CheckSquare size={16} />,
        shortcut: "",
        category: "navigation",
        keywords: ["tasks", "checklist", "list"],
        onSelect: () => {
          onNavigateTodos();
          onClose();
        },
      },
      {
        id: "nav-stats",
        label: "Go to Stats",
        icon: <BarChart3 size={16} />,
        shortcut: "",
        category: "navigation",
        keywords: ["statistics", "analytics", "charts", "reports"],
        onSelect: () => {
          onNavigateStats();
          onClose();
        },
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        icon: <Settings size={16} />,
        shortcut: "",
        category: "navigation",
        keywords: ["preferences", "config", "options"],
        onSelect: () => {
          onNavigateSettings();
          onClose();
        },
      },
      // Action commands
      {
        id: "action-tracking",
        label: isTrackingPaused ? "Resume Tracking" : "Pause Tracking",
        icon: isTrackingPaused ? <Play size={16} /> : <Pause size={16} />,
        shortcut: "",
        category: "action",
        keywords: ["stop", "start", "toggle", "timer"],
        onSelect: () => {
          onToggleTracking();
          onClose();
        },
      },
      {
        id: "action-floating",
        label: isMiniTimerVisible
          ? "Hide Floating Window"
          : "Show Floating Window",
        icon: <PictureInPicture2 size={16} />,
        shortcut: "",
        category: "action",
        keywords: ["mini", "timer", "pip", "picture in picture", "overlay"],
        onSelect: () => {
          onToggleFloatingWindow();
          onClose();
        },
      },
    ];

    // Only add sound toggle if the callback is provided
    if (onToggleSound !== undefined) {
      commands.push({
        id: "action-sound",
        label: isSoundEnabled ? "Disable Sound Alerts" : "Enable Sound Alerts",
        icon: isSoundEnabled ? <VolumeX size={16} /> : <Volume2 size={16} />,
        shortcut: "",
        category: "action",
        keywords: ["audio", "notification", "mute", "unmute"],
        onSelect: () => {
          onToggleSound();
          onClose();
        },
      });
    }

    return commands;
  }, [
    isTrackingPaused,
    isMiniTimerVisible,
    isSoundEnabled,
    onNavigateDashboard,
    onNavigateTodos,
    onNavigateStats,
    onNavigateSettings,
    onToggleTracking,
    onToggleFloatingWindow,
    onToggleSound,
    onClose,
  ]);

  // Filter commands based on search query
  const filteredCommands = useMemo(
    () => filterCommands(allCommands, query),
    [allCommands, query],
  );

  // Group filtered commands by category
  const groupedCommands = useMemo<CommandGroup[]>(() => {
    const groups: CommandGroup[] = [];

    for (const category of CATEGORY_ORDER) {
      const items = filteredCommands.filter((cmd) => cmd.category === category);
      if (items.length > 0) {
        groups.push({
          category,
          label: CATEGORY_LABELS[category],
          items,
        });
      }
    }

    return groups;
  }, [filteredCommands]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1,
          );
          break;
        case "Enter":
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].onSelect();
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Calculate flat index for rendering
  let flatIndex = 0;

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[20%] z-50 w-full max-w-lg translate-x-[-50%]",
            "bg-background border border-border rounded-lg shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[10%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[10%]",
            "duration-200",
          )}
          onKeyDown={handleKeyDown}
          aria-label="Command palette"
        >
          {/* Hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">
            Command Palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search for commands to navigate or perform actions. Use arrow keys
            to navigate and Enter to select.
          </DialogPrimitive.Description>

          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={18} className="text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className={cn(
                "flex-1 bg-transparent text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none",
              )}
              aria-label="Search commands"
              aria-autocomplete="list"
              aria-controls="command-list"
              aria-activedescendant={
                filteredCommands[selectedIndex]
                  ? `command-${filteredCommands[selectedIndex].id}`
                  : undefined
              }
            />
            <kbd
              className={cn(
                "hidden sm:flex items-center gap-1 px-2 py-1 rounded",
                "bg-muted text-muted-foreground text-xs font-mono",
              )}
            >
              <Command size={12} />K
            </kbd>
          </div>

          {/* Command List */}
          <ScrollArea className="max-h-80">
            <div
              ref={listRef}
              id="command-list"
              role="listbox"
              aria-label="Commands"
              className="py-2"
            >
              {groupedCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No commands found
                </div>
              ) : (
                groupedCommands.map((group) => (
                  <div key={group.category} className="mb-2 last:mb-0">
                    {/* Category Header */}
                    <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>

                    {/* Command Items */}
                    {group.items.map((item) => {
                      const currentIndex = flatIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          id={`command-${item.id}`}
                          data-index={currentIndex}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => item.onSelect()}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-4 py-2.5",
                            "text-sm text-left transition-colors",
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/50",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {item.icon && (
                              <span
                                className={cn(
                                  "flex-shrink-0",
                                  isSelected
                                    ? "text-accent-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {item.icon}
                              </span>
                            )}
                            <span>{item.label}</span>
                          </div>
                          {item.shortcut && (
                            <kbd
                              className={cn(
                                "px-1.5 py-0.5 rounded text-xs font-mono",
                                isSelected
                                  ? "bg-accent-foreground/20 text-accent-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer with hints */}
          <div className="flex items-center justify-between gap-4 px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-muted font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-muted font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-muted font-mono">esc</kbd>
                close
              </span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
