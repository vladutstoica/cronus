import clsx from "clsx";
import { useMemo } from "react";
import { formatDuration } from "../../../lib/timeFormatting";
import { getWeekStart } from "../../../lib/weekHelpers";
import type { ProcessedEventBlock } from "../../DashboardView";
import { notionStyleCategoryColors } from "../../Settings/CategoryForm";
import { TooltipProvider } from "../../ui/tooltip";
import { GroupedWeekViewBar } from "./GroupedWeekViewBar";
import { WeekProductivityBarChartSkeleton } from "./WeekProductivityBarChartSkeleton";
import { WeekViewFooter } from "./WeekViewFooter";
import { WeekViewStackedBar } from "./WeekViewStackedBar";

interface WeekProductivityBarChartProps {
  processedEvents: ProcessedEventBlock[] | null;
  selectedDate: Date;
  isDarkMode: boolean;
  weekViewMode: "stacked" | "grouped";
  selectedDay: Date | null;
  onDaySelect: (day: Date | null) => void;
  isLoading: boolean;
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  categoryColor?: string;
  totalDurationMs: number;
  isProductive?: boolean;
  _otherCategories?: Array<{ name: string; duration: number }>;
}

const WeekProductivityBarChart = ({
  processedEvents,
  selectedDate,
  isDarkMode,
  weekViewMode,
  selectedDay,
  onDaySelect,
  isLoading,
}: WeekProductivityBarChartProps) => {
  const weekData = useMemo(() => {
    if (!processedEvents) {
      return [];
    }

    const startOfWeek = getWeekStart(selectedDate);

    const days = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      day.setHours(0, 0, 0, 0); // Set to start of day
      return day;
    });

    return days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = new Date(day);
      dayEnd.setDate(day.getDate() + 1);
      const dayEndMs = dayEnd.getTime();

      const dayEvents =
        processedEvents?.filter((event) => {
          const eventTime = event.startTime.getTime();
          return eventTime >= dayStart && eventTime < dayEndMs;
        }) || [];

      const productiveCategoriesMap = new Map<string, CategoryTotal>();
      const unproductiveCategoriesMap = new Map<string, CategoryTotal>();

      dayEvents.forEach((event) => {
        const key = event.categoryId || "uncategorized";
        const targetMap = event.isProductive
          ? productiveCategoriesMap
          : unproductiveCategoriesMap;

        const existing = targetMap.get(key);
        if (existing) {
          existing.totalDurationMs += event.durationMs;
        } else {
          targetMap.set(key, {
            categoryId: event.categoryId || null,
            name: event.categoryName || "Uncategorized",
            categoryColor: event.categoryColor || "#808080",
            totalDurationMs: event.durationMs,
            isProductive: event.isProductive,
          });
        }
      });

      const productiveCategories = Array.from(
        productiveCategoriesMap.values(),
      ).sort((a, b) => b.totalDurationMs - a.totalDurationMs);
      const unproductiveCategories = Array.from(
        unproductiveCategoriesMap.values(),
      ).sort((a, b) => b.totalDurationMs - a.totalDurationMs);

      const totalProductiveDuration = productiveCategories.reduce(
        (sum, cat) => sum + cat.totalDurationMs,
        0,
      );
      const totalUnproductiveDuration = unproductiveCategories.reduce(
        (sum, cat) => sum + cat.totalDurationMs,
        0,
      );
      const totalDayDuration =
        totalProductiveDuration + totalUnproductiveDuration;

      return {
        date: day,
        productiveCategories,
        unproductiveCategories,
        totalProductiveDuration,
        totalUnproductiveDuration,
        totalDayDuration,
      };
    });
  }, [processedEvents, selectedDate]);

  // Find the max totalDayDuration for the week (avoid 0 by defaulting to 1)
  const maxDayDurationMs = useMemo(() => {
    if (!weekData.length) return 1;
    return Math.max(1, ...weekData.map((d) => d.totalDayDuration));
  }, [weekData]);

  // The tallest bar should be 80% of the height
  const maxBarHeightPercent = 80;

  // For grouped view: find the max single bar (productive or unproductive) duration in the week
  const maxSingleBarDuration = useMemo(() => {
    if (!weekData.length) return 1;
    let max = 1;
    for (const d of weekData) {
      max = Math.max(
        max,
        d.totalProductiveDuration,
        d.totalUnproductiveDuration,
      );
    }
    return max;
  }, [weekData]);

  if (isLoading) {
    return <WeekProductivityBarChartSkeleton weekViewMode={weekViewMode} />;
  }

  return (
    <TooltipProvider>
      <div className="flex-1 h-full flex flex-col border border-border border-t-0 rounded-b-lg bg-card">
        <div className="grid grid-cols-7 h-full">
          {weekData.map(
            (
              {
                date,
                productiveCategories,
                unproductiveCategories,
                totalProductiveDuration,
                totalUnproductiveDuration,
                totalDayDuration,
              },
              index,
            ) => {
              // Use dynamic max for both stacked and grouped views
              const stackedMax = maxDayDurationMs;
              const groupedMax = maxSingleBarDuration;
              const dayHeightPercentage = Math.min(
                maxBarHeightPercent,
                (totalDayDuration /
                  (weekViewMode === "stacked"
                    ? stackedMax
                    : maxDayDurationMs)) *
                  maxBarHeightPercent,
              );
              const isCurrentDay =
                date.toDateString() === new Date().toDateString();
              const isSelectedDay =
                selectedDay?.toDateString() === date.toDateString();

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isFutureDay = date > today;

              // For grouped view: scale each bar by maxSingleBarDuration
              const productiveHeight = Math.min(
                maxBarHeightPercent,
                (totalProductiveDuration / groupedMax) * maxBarHeightPercent,
              );
              const unproductiveHeight = Math.min(
                maxBarHeightPercent,
                (totalUnproductiveDuration / groupedMax) * maxBarHeightPercent,
              );

              // Combine productive and unproductive categories for stacked view
              const allCategories = [
                ...productiveCategories.map((cat) => ({
                  ...cat,
                  isProductive: true,
                })),
                ...unproductiveCategories.map((cat) => ({
                  ...cat,
                  isProductive: false,
                })),
              ];

              return (
                <div
                  key={index}
                  className={`flex flex-col border-1 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    isFutureDay
                      ? "cursor-not-allowed opacity-50 pointer-events-none"
                      : "cursor-pointer"
                  } ${
                    index === 6 ? "border-r-0" : "border-r"
                  } ${isSelectedDay ? "bg-blue-200/20 dark:bg-blue-800/30" : ""}`}
                  onClick={() => {
                    if (!isFutureDay) onDaySelect(isSelectedDay ? null : date);
                  }}
                >
                  <div
                    className={clsx(
                      "text-center text-xs p-1 border-b dark:border-slate-700",
                      isCurrentDay && !isSelectedDay
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "",
                    )}
                  >
                    <div className="font-semibold">
                      {date.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div className="text-muted-foreground">
                      {date.toLocaleDateString(undefined, { day: "numeric" })}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-end relative overflow-hidden">
                    {totalDayDuration > 0 &&
                      (weekViewMode === "stacked" ? (
                        <div
                          className="w-full flex flex-col transition-all duration-500 gap-px"
                          style={{ height: `${dayHeightPercentage}%` }}
                        >
                          <WeekViewStackedBar
                            categories={allCategories}
                            totalDuration={totalDayDuration}
                            percentage={100}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      ) : (
                        <GroupedWeekViewBar
                          productiveHeight={productiveHeight}
                          unproductiveHeight={unproductiveHeight}
                          isDarkMode={isDarkMode}
                          productiveColor={notionStyleCategoryColors[0]}
                          unproductiveColor={notionStyleCategoryColors[1]}
                          totalProductiveDuration={totalProductiveDuration}
                          totalUnproductiveDuration={totalUnproductiveDuration}
                        />
                      ))}
                  </div>
                  <WeekViewFooter
                    totalDayDuration={totalDayDuration}
                    totalProductiveDuration={totalProductiveDuration}
                    totalUnproductiveDuration={totalUnproductiveDuration}
                    isDarkMode={isDarkMode}
                    formatDuration={formatDuration}
                  />
                </div>
              );
            },
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default WeekProductivityBarChart;
