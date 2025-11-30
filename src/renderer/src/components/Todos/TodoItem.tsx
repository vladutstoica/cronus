import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Info,
  Star,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  isFocus: boolean;
  tags: string[];
  scheduledDate: string;
  originalDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: string) => void;
  onToggleFocus: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: "low" | "medium" | "high") => void;
}

const priorityColors = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

const priorityBgColors = {
  high: "bg-red-500/10 border-red-500/30",
  medium: "bg-yellow-500/10 border-yellow-500/30",
  low: "bg-blue-500/10 border-blue-500/30",
};

export function TodoItem({
  todo,
  onToggleComplete,
  onToggleFocus,
  onDelete,
  onUpdatePriority,
}: TodoItemProps) {
  const [showDescription, setShowDescription] = useState(false);
  const isCompleted = todo.status === "completed";
  const isRolledOver =
    todo.originalDate && todo.originalDate !== todo.scheduledDate;

  const cyclePriority = () => {
    const priorities: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
    const currentIndex = priorities.indexOf(todo.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    onUpdatePriority(todo.id, priorities[nextIndex]);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-2 p-3 rounded-lg border transition-all",
        isCompleted
          ? "bg-muted/30 border-border/50"
          : priorityBgColors[todo.priority],
        todo.isFocus && !isCompleted && "ring-2 ring-primary/50",
      )}
    >
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-50 cursor-grab mt-0.5">
        <GripVertical size={16} className="text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(todo.id)}
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
          isCompleted
            ? "bg-primary border-primary"
            : "border-muted-foreground/50 hover:border-primary",
        )}
      >
        {isCompleted && <Check size={12} className="text-primary-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex-1 text-sm",
              isCompleted && "line-through text-muted-foreground",
            )}
          >
            {todo.title}
          </span>

          {/* Rolled over indicator */}
          {isRolledOver && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                  Rolled over
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Originally created on{" "}
                {new Date(todo.originalDate!).toLocaleDateString()}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Tags */}
          {todo.tags.length > 0 && (
            <div className="flex gap-1">
              {todo.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground"
                >
                  {tag}
                </span>
              ))}
              {todo.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{todo.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description (expandable) */}
        {showDescription && todo.description && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {todo.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
          {todo.completedAt && (
            <span>Done {new Date(todo.completedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Priority toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={cyclePriority}
            >
              {todo.priority === "high" ? (
                <ChevronUp size={16} className={priorityColors.high} />
              ) : todo.priority === "medium" ? (
                <Circle size={14} className={priorityColors.medium} />
              ) : (
                <ChevronDown size={16} className={priorityColors.low} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Priority: {todo.priority} (click to change)
          </TooltipContent>
        </Tooltip>

        {/* Focus toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleFocus(todo.id)}
            >
              <Star
                size={16}
                className={cn(
                  todo.isFocus
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {todo.isFocus ? "Remove from focus" : "Set as focus"}
          </TooltipContent>
        </Tooltip>

        {/* Info toggle */}
        {todo.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowDescription(!showDescription)}
              >
                <Info
                  size={16}
                  className={cn(
                    showDescription ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showDescription ? "Hide description" : "Show description"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(todo.id)}
            >
              <Trash2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
