import { type DaySegment } from "@renderer/lib/dayTimelineHelpers";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { getDarkerColor, getLighterColor } from "../../../lib/colors";
import { ActivityIcon } from "../../ActivityList/ActivityIcon";

interface TimelineSegmentContentProps {
  segment: DaySegment;
  isDarkMode: boolean;
}

function isTitleNotMeaningful(segment) {
  const title = segment.description?.trim() || "";
  // If there's no title, or it's only one word, treat as not meaningful
  return title.split(/\s+/).length <= 1;
}

const TimelineSegmentContent = ({
  segment,
  isDarkMode,
}: TimelineSegmentContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canShowContent, setCanShowContent] = useState(false);
  const [isLarge, setIsLarge] = useState(false);

  useLayoutEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        // Show content when height is sufficient for a line of text.
        setCanShowContent(height > 18);
        // Consider it "large" if it's taller than 50px.
        setIsLarge(height > 30);
      }
    };
    checkSize();

    const resizeObserver = new ResizeObserver(checkSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const textColor = segment.categoryColor
    ? isDarkMode
      ? getLighterColor(segment.categoryColor, 0.8)
      : getDarkerColor(segment.categoryColor, 0.6)
    : undefined;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "w-full h-full flex flex-row justify-between space-x-2 overflow-hidden px-2 flex-grow",
      )}
      style={{ color: textColor }}
      title={
        segment.originalEvent?.llmSummary ||
        segment.originalEvent?.categoryReasoning ||
        ""
      }
    >
      <div
        className={clsx(
          "flex flex-row justify-start space-x-2 overflow-hidden flex-grow min-w-0 h-full",
          isLarge ? "items-start pt-2" : "items-center",
        )}
      >
        {canShowContent && (
          <>
            {segment.type === "manual" || segment.isSuggestion ? (
              <div
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: segment.categoryColor }}
              />
            ) : (
              <ActivityIcon
                url={segment.url}
                appName={segment.name}
                size={12}
                className="flex-shrink-0"
              />
            )}
            <span className="truncate text-xs font-medium text-left leading-tight min-w-0">
              {segment.isSuggestion
                ? `${segment.name} (${segment.categoryName})`
                : segment.originalEvent?.generatedTitle ||
                  segment.description ||
                  segment.name}
            </span>
          </>
        )}
      </div>

      {segment.isSuggestion && (
        <div className="flex items-end opacity-0 group-hover:opacity-100 transition-opacity pb-1">
          <button
            className="p-1 rounded-full hover:bg-green-500/20"
            onClick={(e) => segment.onAccept?.(e)}
          >
            <Check className="h-4 w-4 text-green-500" />
          </button>
          <button
            className="p-1 rounded-full hover:bg-red-500/20"
            onClick={(e) => segment.onReject?.(e)}
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TimelineSegmentContent;
