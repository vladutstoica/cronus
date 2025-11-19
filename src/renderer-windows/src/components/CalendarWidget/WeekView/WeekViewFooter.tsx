import { ProductiveVsUnproductiveDisplay } from "../ProductiveVsUnproductiveDisplay";

interface WeekViewFooterProps {
  totalDayDuration: number;
  totalProductiveDuration: number;
  totalUnproductiveDuration: number;
  isDarkMode: boolean;
  formatDuration: (ms: number) => string | null;
}

export const WeekViewFooter = ({
  totalDayDuration,
  totalProductiveDuration,
  totalUnproductiveDuration,
  isDarkMode,
  formatDuration,
}: WeekViewFooterProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground text-xs font-normal p-1 border-t h-16 dark:border-slate-700">
      {totalDayDuration > 0 ? (
        <>
          <div className="text-foreground font-medium">
            {formatDuration(totalDayDuration)}
          </div>
          <div className="flex flex-col items-left gap-0.5">
            <ProductiveVsUnproductiveDisplay
              productiveDuration={totalProductiveDuration}
              unproductiveDuration={totalUnproductiveDuration}
              isDarkMode={isDarkMode}
              formatDuration={formatDuration}
            />
          </div>
        </>
      ) : (
        <div>No data</div>
      )}
    </div>
  );
};
