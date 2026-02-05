import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
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
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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

interface WorklogEntry {
  id: number;
  taskId: string;
  taskTitle: string;
  totalSeconds: number;
  syncStatus: SyncStatus;
  provider: Provider;
  activityCount: number;
  errorMessage?: string;
  externalUrl?: string;
}

interface WorklogSummaryWidgetProps {
  date?: string; // YYYY-MM-DD, defaults to today
  className?: string;
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

// Mock data for demo
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
  },
  {
    id: 4,
    taskId: "PROJ-789",
    taskTitle: "Update dashboard analytics components with new metrics",
    totalSeconds: 1800,
    syncStatus: "skipped",
    provider: "jira",
    activityCount: 3,
    externalUrl: "https://example.atlassian.net/browse/PROJ-789",
  },
];

// Utility functions
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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
  onSync: (id: number) => void;
  onSkip: (id: number) => void;
  onEditTime: (id: number) => void;
  onViewDetails: (id: number) => void;
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
        <span>{formatTime(worklog.totalSeconds)}</span>
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
            onClick={() => onSync(worklog.id)}
            disabled={worklog.syncStatus === "synced"}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync worklog
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSkip(worklog.id)}
            disabled={worklog.syncStatus === "skipped"}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip worklog
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEditTime(worklog.id)}>
            <Timer className="h-4 w-4 mr-2" />
            Edit time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewDetails(worklog.id)}>
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
const EmptyState: React.FC<{ date?: string }> = ({ date }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
    <div className="rounded-full bg-muted p-3 mb-3">
      <Clock className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-sm font-medium text-foreground mb-1">
      No tasks tracked
    </h3>
    <p className="text-xs text-muted-foreground max-w-[200px]">
      No task activity has been recorded for {date ? formatDate(date) : "today"}{" "}
      yet.
    </p>
  </div>
);

// Error state
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
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

// Main component
export const WorklogSummaryWidget: React.FC<WorklogSummaryWidgetProps> = ({
  date,
  className,
}) => {
  const { toast } = useToast();

  // State - in production, this would be fetched from IPC
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worklogs, setWorklogs] = useState<WorklogEntry[]>(mockWorklogs);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Computed values
  const { totalTaskTime, unassociatedTime, hasPendingWorklogs } =
    useMemo(() => {
      const total = worklogs.reduce((sum, w) => sum + w.totalSeconds, 0);
      const pending = worklogs.some(
        (w) => w.syncStatus === "pending" || w.syncStatus === "failed",
      );
      // Mock unassociated time - this would come from the aggregation service
      const unassociated = 1800; // 30 minutes

      return {
        totalTaskTime: total,
        unassociatedTime: unassociated,
        hasPendingWorklogs: pending,
      };
    }, [worklogs]);

  // Handlers
  const handleSync = useCallback(
    (id: number) => {
      setWorklogs((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, syncStatus: "synced" as SyncStatus } : w,
        ),
      );
      toast({
        title: "Worklog synced",
        description: "The worklog has been synced successfully.",
      });
    },
    [toast],
  );

  const handleSkip = useCallback(
    (id: number) => {
      setWorklogs((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, syncStatus: "skipped" as SyncStatus } : w,
        ),
      );
      toast({
        title: "Worklog skipped",
        description: "This worklog will not be synced.",
      });
    },
    [toast],
  );

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
    setIsSyncingAll(true);

    // Simulate async sync
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setWorklogs((prev) =>
      prev.map((w) =>
        w.syncStatus === "pending" || w.syncStatus === "failed"
          ? { ...w, syncStatus: "synced" as SyncStatus }
          : w,
      ),
    );

    setIsSyncingAll(false);
    toast({
      title: "All worklogs synced",
      description: "All pending worklogs have been synced successfully.",
    });
  }, [toast]);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // Simulate retry
    setTimeout(() => {
      setIsLoading(false);
      setWorklogs(mockWorklogs);
    }, 1000);
  }, []);

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <WorklogSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={handleRetry} />;
    }

    if (worklogs.length === 0) {
      return <EmptyState date={date} />;
    }

    return (
      <ScrollArea className="h-[280px]">
        <div className="space-y-1 p-1" role="list" aria-label="Worklog entries">
          <AnimatePresence mode="popLayout">
            {worklogs.map((worklog) => (
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Task Time Summary
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatDate(date)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">{renderContent()}</CardContent>

      {worklogs.length > 0 && !isLoading && !error && (
        <CardFooter className="flex-col items-stretch gap-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total task time:</span>
                <span className="font-medium">{formatTime(totalTaskTime)}</span>
              </div>
              {unassociatedTime > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Unassociated:</span>
                  <span className="font-medium text-amber-600">
                    {formatTime(unassociatedTime)}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncAll}
              disabled={!hasPendingWorklogs || isSyncingAll}
              aria-label="Sync all pending worklogs"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Sync All
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default WorklogSummaryWidget;
