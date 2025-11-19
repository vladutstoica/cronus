import { ChevronRightIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { VisualSegment } from "../../../lib/dayTimelineHelpers";
import { formatDuration } from "../../../lib/timeFormatting";
import { ActivityIcon } from "../../ActivityList/ActivityIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { CalendarEventTooltip } from "./CalendarEventTooltip";

interface TimelineSegmentTooltipProps {
  segment: VisualSegment;
  children: React.ReactNode;
}

export const TimelineSegmentTooltip = ({
  segment,
  children,
}: TimelineSegmentTooltipProps) => {
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Check if this is a Google Calendar event
  const isCalendarEvent = segment.name === "Google Calendar";

  // For calendar events, use the CalendarEventTooltip
  if (isCalendarEvent && (segment as any).originalEvent) {
    return (
      <CalendarEventTooltip event={(segment as any).originalEvent}>
        {children}
      </CalendarEventTooltip>
    );
  }

  if (
    segment.type === "manual" ||
    Object.keys(segment.allActivities).length === 0
  ) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="start" sideOffset={10}>
        <motion.div
          className="p-2 space-y-1 w-64 text-left"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.p
            className="font-bold mb-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            Activities in this slot:
          </motion.p>
          {(() => {
            const allActivitiesSorted = Object.entries(
              segment.allActivities,
            ).sort(([, a], [, b]) => b.duration - a.duration);

            const mainActivities = allActivitiesSorted.filter(
              ([, data]) => data.duration >= 30000,
            );
            const shortActivities = allActivitiesSorted.filter(
              ([, data]) => data.duration < 30000,
            );

            return (
              <>
                {/* Always show main activities */}
                {mainActivities.map(([key, data], index) => (
                  <motion.div
                    key={key}
                    className="flex items-center justify-between text-xs"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.1 + index * 0.03,
                      duration: 0.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <ActivityIcon
                        url={data.block.url}
                        appName={key}
                        size={12}
                      />
                      <span className="truncate">{key}</span>
                    </div>
                    <span className="flex-shrink-0 text-muted-foreground pl-2">
                      {formatDuration(data.duration)}
                    </span>
                  </motion.div>
                ))}

                {/* Expandable short activities section */}
                {shortActivities.length > 0 && (
                  <motion.div
                    className="pt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: 0.1 + mainActivities.length * 0.03,
                      duration: 0.2,
                    }}
                  >
                    <motion.button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.1 }}
                    >
                      <motion.div
                        animate={{ rotate: showAllActivities ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ChevronRightIcon className="w-3 h-3" />
                      </motion.div>
                      <span className="italic">
                        {shortActivities.length} short activit
                        {shortActivities.length > 1 ? "ies" : "y"} (&lt;30s)
                      </span>
                    </motion.button>

                    <AnimatePresence mode="wait">
                      {showAllActivities && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -4 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -4 }}
                          transition={{
                            duration: 0.25,
                            ease: [0.16, 1, 0.3, 1],
                            height: { duration: 0.3 },
                          }}
                          className="ml-4 mt-1 space-y-1 border-l border-border pl-2"
                        >
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 rounded-md dark:scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600">
                            {shortActivities.map(([key, data], index) => (
                              <motion.div
                                key={key}
                                className="flex items-center justify-between text-xs opacity-80"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 0.8, x: 0 }}
                                transition={{
                                  delay: index * 0.04,
                                  duration: 0.2,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <ActivityIcon
                                    url={data.block.url}
                                    appName={key}
                                    size={10}
                                  />
                                  <span className="truncate">{key}</span>
                                </div>
                                <span className="flex-shrink-0 text-muted-foreground pl-2">
                                  {formatDuration(data.duration)}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </>
            );
          })()}
        </motion.div>
      </TooltipContent>
    </Tooltip>
  );
};
