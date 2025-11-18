import { Skeleton } from "@renderer/components/ui/skeleton";

export const WeekProductivityBarChartSkeleton = ({
  weekViewMode,
}: {
  weekViewMode: "stacked" | "grouped";
}) => {
  if (weekViewMode === "grouped") {
    // For grouped: two bars per day, side by side, w-1/3 each
    // Productive bar generally taller, both as % of container height
    const prodHeights = Array.from({ length: 7 }).map(() => {
      // 50% to 90%
      return Math.round(50 + Math.random() * 40);
    });
    const unprodHeights = prodHeights.map((prod) => {
      // 10% to (prod-10)%
      const maxUnprod = Math.max(10, prod - 10);
      return Math.round(10 + Math.random() * (maxUnprod - 10));
    });
    return (
      <div className="flex-1 h-full flex flex-col">
        <div className="grid grid-cols-7 h-full">
          {prodHeights.map((prodHeight, index) => (
            <div
              key={index}
              className="flex flex-col border-1 border-slate-300 dark:border-slate-700"
            >
              <div className="text-center text-xs p-1 border-b dark:border-slate-700">
                <Skeleton className="h-4 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-6 mx-auto" />
              </div>
              <div className="flex-1 flex flex-row items-end justify-evenly relative overflow-hidden">
                <Skeleton
                  className="w-1/3 mx-0 rounded-md"
                  style={{ height: `${prodHeight}%` }}
                />
                <Skeleton
                  className="w-1/3 mx-0 rounded-md"
                  style={{ height: `${unprodHeights[index]}%` }}
                />
              </div>
              <div className="p-2">
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // Stacked: single bar per day, as %
    const randomHeights = Array.from({ length: 7 }).map(() =>
      Math.round(40 + Math.random() * 50),
    );
    return (
      <div className="flex-1 h-full flex flex-col">
        <div className="grid grid-cols-7 h-full">
          {randomHeights.map((barHeight, index) => (
            <div
              key={index}
              className="flex flex-col border-1 border-slate-300 dark:border-slate-700"
            >
              <div className="text-center text-xs p-1 border-b dark:border-slate-700">
                <Skeleton className="h-4 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-6 mx-auto" />
              </div>
              <div className="flex-1 flex flex-col justify-end relative overflow-hidden">
                <Skeleton
                  className="w-full mx-auto rounded-md"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <div className="p-2">
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
};
