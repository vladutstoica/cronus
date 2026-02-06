/**
 * ActiveTaskBadge Component
 *
 * A compact badge displaying the currently active task.
 * Shows the task identifier with provider-specific colors.
 * Click to open the task quick picker, or click X to clear.
 */

import React from "react";
import { X, ListTodo } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";
import type { TaskProvider } from "../../../../shared/taskTypes";
import type { ActiveTask } from "../../hooks/useActiveTask";

// ============================================================================
// Types
// ============================================================================

interface ActiveTaskBadgeProps {
  activeTask: ActiveTask | null;
  onOpenPicker: () => void;
  onClearTask: () => void;
  className?: string;
  /** Compact mode for smaller displays like the floating widget */
  compact?: boolean;
}

// ============================================================================
// Provider Colors
// ============================================================================

const PROVIDER_COLORS: Record<
  TaskProvider,
  { bg: string; text: string; border: string; hoverBg: string }
> = {
  jira: {
    bg: "bg-[#0052CC]/15",
    text: "text-[#0052CC]",
    border: "border-[#0052CC]/30",
    hoverBg: "hover:bg-[#0052CC]/25",
  },
  linear: {
    bg: "bg-[#5E6AD2]/15",
    text: "text-[#5E6AD2]",
    border: "border-[#5E6AD2]/30",
    hoverBg: "hover:bg-[#5E6AD2]/25",
  },
};

// ============================================================================
// Component
// ============================================================================

export const ActiveTaskBadge: React.FC<ActiveTaskBadgeProps> = ({
  activeTask,
  onOpenPicker,
  onClearTask,
  className,
  compact = false,
}) => {
  // No active task - show placeholder button
  if (!activeTask) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "2xs" : "xs"}
              onClick={onOpenPicker}
              className={cn(
                "gap-1 text-muted-foreground hover:text-foreground",
                compact && "px-1.5 h-5",
                className,
              )}
            >
              <ListTodo
                className={cn(
                  "flex-shrink-0",
                  compact ? "h-3 w-3" : "h-3.5 w-3.5",
                )}
              />
              {!compact && <span className="text-xs">No task</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Click to select a task (Cmd+Shift+T)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const colors = PROVIDER_COLORS[activeTask.provider];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full",
              className,
            )}
          >
            {/* Task Badge - clickable to open picker */}
            <Badge
              variant="outline"
              onClick={onOpenPicker}
              className={cn(
                "cursor-pointer font-mono transition-colors",
                colors.bg,
                colors.text,
                colors.border,
                colors.hoverBg,
                compact
                  ? "text-[10px] px-1.5 py-0 h-5"
                  : "text-xs px-2 py-0.5 h-6",
              )}
            >
              {activeTask.identifier}
            </Badge>

            {/* Clear button */}
            <Button
              variant="ghost"
              size="2xs"
              onClick={(e) => {
                e.stopPropagation();
                onClearTask();
              }}
              className={cn(
                "p-0 rounded-full hover:bg-destructive/10 hover:text-destructive",
                compact ? "h-4 w-4" : "h-5 w-5",
              )}
              aria-label="Clear active task"
            >
              <X className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px]">
          <div className="space-y-1">
            <p className="font-medium">{activeTask.title}</p>
            <p className="text-xs text-muted-foreground">
              Click badge to change task, or X to clear
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ActiveTaskBadge;
