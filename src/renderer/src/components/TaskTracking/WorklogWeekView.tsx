/**
 * WorklogWeekView Component
 *
 * Displays weekly worklog summary with day-by-day breakdown,
 * bar chart visualization, and task totals.
 */

import { AnimatePresence, motion } from "framer-motion";
import { format, isToday as isTodayFn } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";

import { useWeekWorklogs, formatDuration } from "../../hooks/useWorklogs";
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

interface WorklogWeekViewProps {
  initialDate?: Date;
  className?: string;
  onDateChange?: (date: Date) => void;
}

// Chart configuration
const chartConfig: ChartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--primary))",
  },
};

// Provider colors
const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  jira: {
    bg: "bg-[#0052CC]/10",
    text: "text-[#0052CC]",
  },
  linear: {
    bg: "bg-[#5E6AD2]/10",
    text: "text-[#5E6AD2]",
  },
};

// Loading skeleton
const WeekSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Chart skeleton */}
    <div className="h-[200px] flex items-end justify-between gap-2 px-4">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <Skeleton
            className="w-full"
            style={{ height: `${Math.random() * 100 + 50}px` }}
          />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
    {/* Summary skeleton */}
    <div className="space-y-3 px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
);

// Empty state
const EmptyState: React.FC<{ weekStart: Date; weekEnd: Date }> = ({
  weekStart,
  weekEnd,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-muted p-3 mb-3">
      <Clock className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-sm font-medium text-foreground mb-1">
      No tasks tracked this week
    </h3>
    <p className="text-xs text-muted-foreground max-w-[250px]">
      No task activity has been recorded for {format(weekStart, "MMM d")} -{" "}
      {format(weekEnd, "MMM d, yyyy")}.
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

// Week navigation component
interface WeekNavigatorProps {
  weekStart: Date;
  weekEnd: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  onCurrentWeek: () => void;
  isCurrentWeek: boolean;
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  weekStart,
  weekEnd,
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onCurrentWeek,
  isCurrentWeek,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="2xs"
          onClick={onPrevious}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[200px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
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
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isCurrentWeek && (
        <Button variant="ghost" size="sm" onClick={onCurrentWeek}>
          This Week
        </Button>
      )}
    </div>
  );
};

// Day card component for task breakdown
interface DayCardProps {
  date: string;
  dayName: string;
  totalSeconds: number;
  worklogs: Array<{
    taskId: string;
    taskTitle: string;
    totalSeconds: number;
    provider: string;
  }>;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  dayName,
  totalSeconds,
  worklogs,
  isToday,
  isSelected,
  onClick,
}) => {
  const dayDate = new Date(date);
  const dayNumber = format(dayDate, "d");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        "hover:border-primary/50 hover:shadow-sm",
        isSelected && "border-primary bg-primary/5",
        isToday && !isSelected && "border-amber-500/50 bg-amber-500/5",
        !isSelected && !isToday && "border-border bg-card",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              isToday ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {dayName}
          </span>
          <span className="text-sm font-semibold">{dayNumber}</span>
        </div>
        <span className="text-sm font-medium">
          {totalSeconds > 0 ? formatDuration(totalSeconds) : "-"}
        </span>
      </div>

      {worklogs.length > 0 ? (
        <div className="space-y-1.5">
          {worklogs.slice(0, 3).map((worklog, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] px-1 py-0 h-4",
                  PROVIDER_COLORS[worklog.provider]?.bg,
                  PROVIDER_COLORS[worklog.provider]?.text,
                )}
              >
                {worklog.taskId}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {formatDuration(worklog.totalSeconds)}
              </span>
            </div>
          ))}
          {worklogs.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{worklogs.length - 3} more
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No tasks</p>
      )}
    </motion.div>
  );
};

// Custom bar chart component
interface WeeklyBarChartProps {
  data: Array<{
    day: string;
    hours: number;
    isToday: boolean;
  }>;
}

const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data }) => {
  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}h`}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toFixed(1)}h`, "Hours"]}
              hideIndicator
            />
          }
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.isToday ? "hsl(var(--chart-2))" : "hsl(var(--primary))"
              }
              opacity={entry.hours === 0 ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

// Task summary row
interface TaskSummaryRowProps {
  taskId: string;
  taskTitle: string;
  provider: string;
  totalSeconds: number;
  daysActive: number;
}

const TaskSummaryRow: React.FC<TaskSummaryRowProps> = ({
  taskId,
  taskTitle,
  provider,
  totalSeconds,
  daysActive,
}) => {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-xs px-1.5 py-0 h-5 shrink-0",
          PROVIDER_COLORS[provider]?.bg,
          PROVIDER_COLORS[provider]?.text,
        )}
      >
        {taskId}
      </Badge>
      <span
        className="text-sm text-foreground flex-1 truncate"
        title={taskTitle}
      >
        {taskTitle}
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground">
              {daysActive} {daysActive === 1 ? "day" : "days"}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Active on {daysActive} {daysActive === 1 ? "day" : "days"} this
              week
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-sm font-medium tabular-nums">
        {formatDuration(totalSeconds)}
      </span>
    </div>
  );
};

// Main component
export const WorklogWeekView: React.FC<WorklogWeekViewProps> = ({
  initialDate,
  className,
  onDateChange,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    weekStart,
    weekEnd,
    data,
    isLoading,
    error,
    refetch,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isCurrentWeek,
  } = useWeekWorklogs(initialDate);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.days.map((day) => ({
      day: day.dayName,
      hours: day.totalSeconds / 3600,
      isToday: isTodayFn(new Date(day.date)),
    }));
  }, [data]);

  // Aggregate task totals for the week
  const taskTotals = useMemo(() => {
    if (!data) return [];

    const totals: Record<
      string,
      {
        taskId: string;
        taskTitle: string;
        provider: string;
        totalSeconds: number;
        daysActive: Set<string>;
      }
    > = {};

    for (const day of data.days) {
      for (const worklog of day.worklogs) {
        if (!totals[worklog.taskId]) {
          totals[worklog.taskId] = {
            taskId: worklog.taskId,
            taskTitle: worklog.taskTitle,
            provider: worklog.provider,
            totalSeconds: 0,
            daysActive: new Set(),
          };
        }
        totals[worklog.taskId].totalSeconds += worklog.totalSeconds;
        totals[worklog.taskId].daysActive.add(day.date);
      }
    }

    return Object.values(totals)
      .map((t) => ({
        ...t,
        daysActive: t.daysActive.size,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [data]);

  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  };

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <WeekSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={refetch} />;
    }

    if (!data || data.totalSeconds === 0) {
      return <EmptyState weekStart={weekStart} weekEnd={weekEnd} />;
    }

    return (
      <div className="space-y-4">
        {/* Bar Chart */}
        <div className="px-2">
          <WeeklyBarChart data={chartData} />
        </div>

        {/* Day Cards */}
        <div className="grid grid-cols-7 gap-2 px-2">
          {data.days.map((day) => (
            <DayCard
              key={day.date}
              date={day.date}
              dayName={day.dayName}
              totalSeconds={day.totalSeconds}
              worklogs={day.worklogs}
              isToday={isTodayFn(new Date(day.date))}
              isSelected={selectedDay === day.date}
              onClick={() =>
                setSelectedDay(selectedDay === day.date ? null : day.date)
              }
            />
          ))}
        </div>

        {/* Task Summary */}
        {taskTotals.length > 0 && (
          <div className="border-t pt-4 px-2">
            <h4 className="text-sm font-medium mb-3">Weekly Task Summary</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {taskTotals.map((task) => (
                    <motion.div
                      key={task.taskId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <TaskSummaryRow
                        taskId={task.taskId}
                        taskTitle={task.taskTitle}
                        provider={task.provider}
                        totalSeconds={task.totalSeconds}
                        daysActive={task.daysActive}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold mb-3">
          Weekly Worklog
        </CardTitle>
        <WeekNavigator
          weekStart={weekStart}
          weekEnd={weekEnd}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onPrevious={goToPreviousWeek}
          onNext={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
          isCurrentWeek={isCurrentWeek}
        />
      </CardHeader>

      <CardContent className="p-2">{renderContent()}</CardContent>

      {data && data.totalSeconds > 0 && !isLoading && !error && (
        <CardFooter className="flex items-center justify-between pt-3 border-t px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-semibold">
                {formatDuration(data.totalSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Avg/day:</span>
              <span className="text-sm font-medium">
                {formatDuration(Math.round(data.totalSeconds / 7))}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {taskTotals.length} {taskTotals.length === 1 ? "task" : "tasks"}
          </Badge>
        </CardFooter>
      )}
    </Card>
  );
};

export default WorklogWeekView;
