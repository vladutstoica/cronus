import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { ProcessedEventBlock } from "../DashboardView";
import { formatDuration } from "../../lib/timeFormatting";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useDarkMode } from "../../hooks/useDarkMode";
import WeekProductivityBarChart from "../CalendarWidget/WeekView/WeekProductivityBarChart";
import WeekBreakdown from "../CalendarWidget/WeekView/WeekBreakdown";
import { WeeklyProductivity } from "../CalendarWidget/WeekView/WeeklyProductivity";
import { ProductivityTrendChart } from "../CalendarWidget/WeekView/ProductiveHoursChart";

interface StatsViewProps {
  processedEvents: ProcessedEventBlock[] | null;
  selectedDate: Date;
  isLoading?: boolean;
}

interface CategoryStat {
  name: string;
  value: number; // duration in ms
  color: string;
  percentage: number;
  [key: string]: string | number; // Index signature for recharts
}

const COLLABORATION_COLOR = "#8B5CF6"; // Purple for collaboration

export function StatsView({
  processedEvents,
  selectedDate,
  isLoading,
}: StatsViewProps) {
  const isDarkMode = useDarkMode();
  const [weekViewMode, setWeekViewMode] = useState<"stacked" | "grouped">("grouped");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Calculate stats by category + collaboration
  const stats = useMemo(() => {
    if (!processedEvents || processedEvents.length === 0) {
      return { categories: [], collaboration: 0, total: 0 };
    }

    // Filter events for selected date
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayEvents = processedEvents.filter((event) => {
      const eventStart = event.startTime.getTime();
      return eventStart >= dayStart.getTime() && eventStart <= dayEnd.getTime();
    });

    // Group by category
    const categoryMap = new Map<
      string,
      { duration: number; color: string; isCollaboration: boolean }
    >();
    let collaborationTime = 0;
    let totalTime = 0;

    dayEvents.forEach((event) => {
      const categoryName = event.categoryName || "Uncategorized";
      const color = event.categoryColor || "#6b7280";
      const duration = event.durationMs;
      const isCollab = categoryName.toLowerCase() === "communication";

      totalTime += duration;

      if (isCollab) {
        collaborationTime += duration;
      }

      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.duration += duration;
        existing.isCollaboration = existing.isCollaboration || isCollab;
      } else {
        categoryMap.set(categoryName, {
          duration,
          color,
          isCollaboration: isCollab,
        });
      }
    });

    // Convert to array and calculate percentages
    const categories: CategoryStat[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.duration,
        color: data.color,
        percentage: totalTime > 0 ? (data.duration / totalTime) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      categories,
      collaboration: collaborationTime,
      total: totalTime,
    };
  }, [processedEvents, selectedDate]);

  // Prepare pie chart data (top 5 categories + "Other")
  const pieData = useMemo(() => {
    const topCategories = stats.categories.slice(0, 5);
    const otherCategories = stats.categories.slice(5);

    if (otherCategories.length > 0) {
      const otherTotal = otherCategories.reduce((sum, c) => sum + c.value, 0);
      topCategories.push({
        name: "Other",
        value: otherTotal,
        color: "#9CA3AF",
        percentage: stats.total > 0 ? (otherTotal / stats.total) * 100 : 0,
      });
    }

    return topCategories;
  }, [stats]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!processedEvents || stats.total === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No activity data for this day
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
      {/* Week Productivity Bar Chart */}
      <div className="h-[30rem] overflow-auto">
        <WeekProductivityBarChart
          processedEvents={processedEvents}
          selectedDate={selectedDate}
          isDarkMode={isDarkMode}
          weekViewMode={weekViewMode}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          isLoading={isLoading || false}
        />
      </div>

      {/* Week Breakdown */}
      <WeekBreakdown
        processedEvents={processedEvents}
        isDarkMode={isDarkMode}
        isLoading={isLoading || false}
        viewingDate={selectedDate}
      />

      {/* Weekly Productivity */}
      <WeeklyProductivity
        processedEvents={processedEvents}
        isDarkMode={isDarkMode}
        weekViewMode={weekViewMode}
        isLoading={isLoading}
        viewingDate={selectedDate}
      />

      {/* Productivity Trend Chart */}
      <ProductivityTrendChart
        processedEvents={processedEvents}
        isDarkMode={isDarkMode}
        isLoading={isLoading}
        viewingDate={selectedDate}
      />

      {/* Time Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatDuration(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Total time */}
          <div className="text-center mt-4">
            <p className="text-2xl font-bold">{formatDuration(stats.total)}</p>
            <p className="text-sm text-muted-foreground">Total tracked time</p>
          </div>
        </CardContent>
      </Card>

      {/* Collaboration Time Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLLABORATION_COLOR }}
            />
            Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {formatDuration(stats.collaboration)}
              </p>
              <p className="text-sm text-muted-foreground">
                Meetings, calls, chat
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-muted-foreground">
                {stats.total > 0
                  ? Math.round((stats.collaboration / stats.total) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">of total time</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${stats.total > 0 ? (stats.collaboration / stats.total) * 100 : 0}%`,
                backgroundColor: COLLABORATION_COLOR,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.categories.map((category) => (
            <div key={category.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {formatDuration(category.value)} (
                  {Math.round(category.percentage)}%)
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${category.percentage}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
