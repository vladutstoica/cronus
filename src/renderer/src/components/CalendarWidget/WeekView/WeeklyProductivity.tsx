import type { JSX } from "react";
import { useMemo } from "react";
import { processColor } from "../../../lib/colors";
import type { ProcessedEventBlock } from "../../DashboardView";
import { notionStyleCategoryColors } from "../../Settings/CategoryForm";
import { Skeleton } from "../../ui/skeleton";
import { TooltipProvider } from "../../ui/tooltip";
import { ProductiveVsUnproductiveDisplay } from "../ProductiveVsUnproductiveDisplay";

interface WeekOverWeekComparisonProps {
  processedEvents: ProcessedEventBlock[] | null;
  isDarkMode: boolean;
  weekViewMode: "stacked" | "grouped";
  isLoading?: boolean;
  viewingDate: Date;
}

interface CategoryTotal {
  categoryId: string | null;
  name: string;
  categoryColor?: string;
  totalDurationMs: number;
  isProductive?: boolean;
}

interface WeekSummary {
  startDate: Date;
  endDate: Date;
  productiveCategories: CategoryTotal[];
  totalProductiveDuration: number;
  totalUnproductiveDuration: number;
  totalWeekDuration: number;
}

export function WeeklyProductivity({
  processedEvents,
  isDarkMode,
  isLoading = false,
  viewingDate,
}: WeekOverWeekComparisonProps): JSX.Element {
  const weekData = useMemo<WeekSummary[]>(() => {
    if (!processedEvents) {
      return [];
    }

    const weeks: WeekSummary[] = [];
    const now = viewingDate;

    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7 + 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const weekEvents = processedEvents.filter((event) => {
        const eventTime = event.startTime.getTime();
        return eventTime >= start.getTime() && eventTime < end.getTime();
      });

      const productiveCategoriesMap = new Map<string, CategoryTotal>();
      const unproductiveCategoriesMap = new Map<string, CategoryTotal>();

      weekEvents.forEach((event) => {
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
      const totalProductiveDuration = productiveCategories.reduce(
        (sum, cat) => sum + cat.totalDurationMs,
        0,
      );
      const totalUnproductiveDuration = Array.from(
        unproductiveCategoriesMap.values(),
      ).reduce((sum, cat) => sum + cat.totalDurationMs, 0);
      const totalWeekDuration =
        totalProductiveDuration + totalUnproductiveDuration;

      weeks.push({
        startDate: start,
        endDate: end,
        productiveCategories,
        totalProductiveDuration,
        totalUnproductiveDuration,
        totalWeekDuration,
      });
    }

    return weeks;
  }, [processedEvents, viewingDate]);

  const formatWeekLabel = (startDate: Date, endDate: Date): string => {
    const startMonth = startDate.toLocaleDateString(undefined, {
      month: "short",
    });
    const endMonth = endDate.toLocaleDateString(undefined, { month: "short" });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg bg-card p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="h-40 flex flex-col mt-4">
          <div className="grid grid-cols-4 gap-2 h-28">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <Skeleton className="h-4 w-16 mb-2" />
                <div className="w-full h-full flex flex-col justify-end relative">
                  <Skeleton className="w-full h-full rounded-t-sm" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border border-border rounded-lg bg-card p-4">
        <h3 className="text-lg font-semibold text-foreground">
          Weekly Productivity
        </h3>

        {/* Bar Chart Section */}
        <div className="h-40 flex flex-col mt-4">
          <div className="grid grid-cols-4 gap-2 h-28">
            {weekData.map(
              (
                {
                  startDate,
                  endDate,
                  totalProductiveDuration,
                  totalUnproductiveDuration,
                  totalWeekDuration,
                },
                index,
              ) => {
                const today = new Date();
                const isActualCurrentWeek =
                  today >= startDate && today < endDate;

                const productivePercentage =
                  totalWeekDuration > 0
                    ? (totalProductiveDuration / totalWeekDuration) * 100
                    : 0;
                const unproductivePercentage =
                  totalWeekDuration > 0
                    ? (totalUnproductiveDuration / totalWeekDuration) * 100
                    : 0;

                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-xs font-medium text-foreground mb-2">
                      {formatWeekLabel(startDate, endDate)}
                    </div>

                    <div
                      className={`w-full h-full flex flex-col justify-end relative ${
                        isActualCurrentWeek ? "opacity-70" : ""
                      }`}
                    >
                      {totalWeekDuration > 0 ? (
                        <div className="w-full h-full flex flex-col">
                          {totalUnproductiveDuration > 0 && (
                            <div
                              className={`w-full transition-all duration-300 ${
                                totalProductiveDuration > 0
                                  ? "rounded-t-sm"
                                  : "rounded-sm"
                              }`}
                              style={{
                                height: `${unproductivePercentage}%`,
                                backgroundColor: processColor(
                                  notionStyleCategoryColors[1],
                                  {
                                    isDarkMode,
                                    opacity: isDarkMode ? 0.7 : 0.6,
                                  },
                                ),
                              }}
                            />
                          )}
                          {totalProductiveDuration > 0 && (
                            <div
                              className={`w-full transition-all duration-300 ${
                                totalUnproductiveDuration > 0
                                  ? "rounded-b-sm"
                                  : "rounded-sm"
                              }`}
                              style={{
                                height: `${productivePercentage}%`,
                                backgroundColor: processColor(
                                  notionStyleCategoryColors[0],
                                  {
                                    isDarkMode,
                                    opacity: isDarkMode ? 0.7 : 0.6,
                                  },
                                ),
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-sm flex items-center justify-center">
                          <div className="text-xs text-muted-foreground">
                            No data
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-2">
            {weekData.map((week, index) => (
              <div key={index} className="text-left text-xs">
                {week.totalWeekDuration > 0 ? (
                  <ProductiveVsUnproductiveDisplay
                    productiveDuration={week.totalProductiveDuration}
                    unproductiveDuration={week.totalUnproductiveDuration}
                    isDarkMode={isDarkMode}
                  />
                ) : (
                  <div className="text-muted-foreground">No tracking</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
