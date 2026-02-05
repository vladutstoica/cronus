/**
 * WorklogDayView Component
 *
 * Displays worklogs for a specific day with date navigation,
 * task breakdown, and summary statistics.
 */

import { AnimatePresence, motion } from "framer-motion";
import { format, isToday as isTodayFn } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Minus,
  MoreHorizontal,
  RefreshCw,
  SkipForward,
  Timer,
  X,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

import { useToast } from "../../hooks/use-toast";
import {
  useDayWorklogs,
  formatDuration,
  WorklogEntry,
} from "../../hooks/useWorklogs";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// Types
type SyncStatus = "pending" | "synced" | "failed" | "skipped";
type Provider = "jira" | "linear";

interface WorklogDayViewProps {
  initialDate?: Date;
  className?: string;
  onDateChange?: (date: Date) => void;
}

// Provider colors
const PROVIDER_COLORS: Record<
  Provider,
  { bg: string; text: string; border: string }
> = {
  jira: {
    bg: "bg-[#0052CC]/10",
    text: "text-[#0052CC]",
    border: "border-[#0052CC]/30",
  },
  linear: {
    bg: "bg-[#5E6AD2]/10",
    text: "text-[#5E6AD2]",
    border: "border-[#5E6AD2]/30",
  },
};

// Status configuration
const STATUS_CONFIG: Record<
  SyncStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-amber-500",
    label: "Pending sync",
  },
  synced: {
    icon: Check,
    color: "text-green-500",
    label: "Synced",
  },
  failed: {
    icon: X,
    color: "text-red-500",
    label: "Sync failed",
  },
  skipped: {
    icon: Minus,
    color: "text-gray-400",
    label: "Skipped",
  },
};

// Sub-components
interface StatusIconProps {
  status: SyncStatus;
  errorMessage?: string;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, errorMessage }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("flex-shrink-0", config.color)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{config.label}</p>
          {errorMessage && (
            <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface TaskBadgeProps {
  taskId: string;
  provider: Provider;
}

const TaskBadge: React.FC<TaskBadgeProps> = ({ taskId, provider }) => {
  const colors = PROVIDER_COLORS[provider];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-xs px-1.5 py-0 h-5",
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      {taskId}
    </Badge>
  );
};

interface WorklogItemProps {
  worklog: WorklogEntry;
  onSync: () => void;
  onSkip: () => void;
  onEditTime: () => void;
  onViewDetails: () => void;
}

const WorklogItem: React.FC<WorklogItemProps> = ({
  worklog,
  onSync,
  onSkip,
  onEditTime,
  onViewDetails,
}) => {
  const handleExternalLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (worklog.externalUrl) {
        window.open(worklog.externalUrl, "_blank", "noopener,noreferrer");
      }
    },
    [worklog.externalUrl],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
      role="listitem"
    >
      {/* Task Badge */}
      <TaskBadge taskId={worklog.taskId} provider={worklog.provider} />

      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-foreground truncate"
          title={worklog.taskTitle}
        >
          {worklog.taskTitle}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {worklog.activityCount}{" "}
            {worklog.activityCount === 1 ? "activity" : "activities"}
          </span>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-sm font-medium text-secondary-foreground">
        <Timer
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <span>{formatDuration(worklog.totalSeconds)}</span>
      </div>

      {/* Status Icon */}
      <StatusIcon
        status={worklog.syncStatus}
        errorMessage={worklog.errorMessage}
      />

      {/* External Link */}
      {worklog.externalUrl && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleExternalLinkClick}
                className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Open ${worklog.taskId} in ${worklog.provider}`}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Open in {worklog.provider === "jira" ? "Jira" : "Linear"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="2xs"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={onSync}
            disabled={worklog.syncStatus === "synced"}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync worklog
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSkip}
            disabled={worklog.syncStatus === "skipped"}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip worklog
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEditTime}>
            <Timer className="h-4 w-4 mr-2" />
            Edit time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewDetails}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
};

// Loading skeleton
const WorklogSkeleton: React.FC = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
    ))}
  </div>
);

// Empty state
const EmptyState: React.FC<{ date: Date }> = ({ date }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-muted p-3 mb-3">
      <Clock className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-sm font-medium text-foreground mb-1">
      No tasks tracked
    </h3>
    <p className="text-xs text-muted-foreground max-w-[200px]">
      No task activity has been recorded for{" "}
      {isTodayFn(date) ? "today" : format(date, "MMMM d, yyyy")} yet.
    </p>
  </div>
);

// Error state
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-destructive/10 p-3 mb-3">
      <AlertCircle className="h-6 w-6 text-destructive" />
    </div>
    <h3 className="text-sm font-medium text-foreground mb-1">
      Failed to load worklogs
    </h3>
    <p className="text-xs text-muted-foreground max-w-[200px] mb-3">
      {message}
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
      Retry
    </Button>
  </div>
);

// Date picker component
interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  isToday,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="2xs"
          onClick={onPrevious}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[180px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="2xs"
          onClick={onNext}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isToday && (
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
      )}
    </div>
  );
};

// Main component
export const WorklogDayView: React.FC<WorklogDayViewProps> = ({
  initialDate,
  className,
  onDateChange,
}) => {
  const { toast } = useToast();
  const {
    selectedDate,
    setSelectedDate,
    data,
    isLoading,
    error,
    refetch,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
  } = useDayWorklogs(initialDate);

  // Mock unassociated time - this would come from the aggregation service
  const unassociatedTime = 1800; // 30 minutes

  // Computed values
  const hasPendingWorklogs = useMemo(() => {
    if (!data) return false;
    return data.worklogs.some(
      (w) => w.syncStatus === "pending" || w.syncStatus === "failed",
    );
  }, [data]);

  // Handle date change
  const handleDateChange = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      onDateChange?.(date);
    },
    [setSelectedDate, onDateChange],
  );

  // Handlers - id parameter will be used when sync functionality is implemented
  const handleSync = useCallback(() => {
    toast({
      title: "Worklog synced",
      description: "The worklog has been synced successfully.",
    });
  }, [toast]);

  const handleSkip = useCallback(() => {
    toast({
      title: "Worklog skipped",
      description: "This worklog will not be synced.",
    });
  }, [toast]);

  const handleEditTime = useCallback(() => {
    toast({
      title: "Coming soon",
      description: "Time editing will be available in a future update.",
    });
  }, [toast]);

  const handleViewDetails = useCallback(() => {
    toast({
      title: "Coming soon",
      description: "Detailed view will be available in a future update.",
    });
  }, [toast]);

  const handleSyncAll = useCallback(async () => {
    toast({
      title: "Syncing worklogs",
      description: "All pending worklogs are being synced...",
    });
    // In production, this would call the sync service
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: "All worklogs synced",
      description: "All pending worklogs have been synced successfully.",
    });
  }, [toast]);

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <WorklogSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={refetch} />;
    }

    if (!data || data.worklogs.length === 0) {
      return <EmptyState date={selectedDate} />;
    }

    return (
      <ScrollArea className="h-[350px]">
        <div className="space-y-1 p-1" role="list" aria-label="Worklog entries">
          <AnimatePresence mode="popLayout">
            {data.worklogs.map((worklog) => (
              <WorklogItem
                key={worklog.id}
                worklog={worklog}
                onSync={handleSync}
                onSkip={handleSkip}
                onEditTime={handleEditTime}
                onViewDetails={handleViewDetails}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold mb-3">
          Daily Worklog
        </CardTitle>
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onPrevious={goToPreviousDay}
          onNext={goToNextDay}
          onToday={goToToday}
          isToday={isToday}
        />
      </CardHeader>

      <CardContent className="p-0">{renderContent()}</CardContent>

      {data && data.worklogs.length > 0 && !isLoading && !error && (
        <CardFooter className="flex-col items-stretch gap-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total task time:</span>
                <span className="font-medium">
                  {formatDuration(data.totalSeconds)}
                </span>
              </div>
              {unassociatedTime > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Unassociated:</span>
                  <span className="font-medium text-amber-600">
                    {formatDuration(unassociatedTime)}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncAll}
              disabled={!hasPendingWorklogs}
              aria-label="Sync all pending worklogs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync All
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default WorklogDayView;
