import { ChevronDownIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo, useCallback } from "react";
import { Category as SharedCategory } from "@shared/types";
import { ActivityItem, ProcessedCategory } from "../../lib/activityProcessing";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { ClipboardIcon } from "lucide-react";
import { ActivityListItem } from "./ActivityListItem";
import { VirtualizedList } from "../VirtualizedList/VirtualizedList";

/** Threshold for using virtualization (number of items) */
const VIRTUALIZATION_THRESHOLD = 100;

/** Default estimated item height in pixels */
const DEFAULT_ITEM_HEIGHT = 32;

/** Maximum height for virtualized list before scrolling (in pixels) */
const DEFAULT_MAX_HEIGHT = 400;

interface ActivityListProps {
  activities: ActivityItem[];
  currentCategory: ProcessedCategory;
  allUserCategories: SharedCategory[] | undefined;
  handleMoveActivity: (
    activity: ActivityItem,
    targetCategoryId: string,
  ) => void;
  isMovingActivity: boolean;
  faviconErrors: Set<string>;
  handleFaviconError: (identifier: string) => void;
  isShowMore: boolean;
  onToggleShowMore: () => void;
  hoveredActivityKey: string | null;
  setHoveredActivityKey: (key: string | null) => void;
  openDropdownActivityKey: string | null;
  setOpenDropdownActivityKey: (key: string | null) => void;
  selectedHour: number | null;
  selectedDay: Date | null;
  viewMode: "day" | "week";
  startDateMs: number | null;
  endDateMs: number | null;
  selectedActivities: Set<string>;
  onSelectActivity: (activityKey: string, event: React.MouseEvent) => void;
  onAddNewCategory: () => void;
  /** Maximum height for virtualized lists before scrolling. Defaults to 400px */
  maxVirtualizedHeight?: number;
  /** Force virtualization regardless of item count (useful for testing) */
  forceVirtualization?: boolean;
}

export const ActivityList = ({
  activities,
  currentCategory,
  allUserCategories,
  handleMoveActivity,
  isMovingActivity,
  faviconErrors,
  handleFaviconError,
  isShowMore,
  onToggleShowMore,
  hoveredActivityKey,
  setHoveredActivityKey,
  openDropdownActivityKey,
  setOpenDropdownActivityKey,
  selectedHour,
  selectedDay,
  viewMode,
  startDateMs,
  endDateMs,
  selectedActivities,
  onSelectActivity,
  onAddNewCategory,
  maxVirtualizedHeight = DEFAULT_MAX_HEIGHT,
  forceVirtualization = false,
}: ActivityListProps): React.ReactElement => {
  const oneMinuteMs = 60 * 1000;
  const visibleActivities = activities.filter(
    (act) => act.durationMs >= oneMinuteMs,
  );
  const hiddenActivities = activities.filter(
    (act) => act.durationMs < oneMinuteMs,
  );

  // If all activities are below 1 minute, show them all directly
  const shouldShowAllActivities =
    visibleActivities.length === 0 && hiddenActivities.length > 0;
  const activitiesToShow = shouldShowAllActivities
    ? activities
    : visibleActivities;
  const activitiesToHide = shouldShowAllActivities ? [] : hiddenActivities;

  // Determine if we should use virtualization based on total item count
  const shouldVirtualize = useMemo(
    () => forceVirtualization || activities.length >= VIRTUALIZATION_THRESHOLD,
    [activities.length, forceVirtualization],
  );

  // Pre-compute selection state for all items to avoid recalculating in render
  const getSelectionState = useCallback(
    (items: ActivityItem[], index: number) => {
      const activity = items[index];
      const activityKey = `${activity.identifier}-${activity.name}`;
      const isSelected = selectedActivities.has(activityKey);

      const prevItem = items[index - 1];
      const nextItem = items[index + 1];

      const prevActivityKey = prevItem
        ? `${prevItem.identifier}-${prevItem.name}`
        : null;
      const nextActivityKey = nextItem
        ? `${nextItem.identifier}-${nextItem.name}`
        : null;

      const isPrevSelected = prevActivityKey
        ? selectedActivities.has(prevActivityKey)
        : false;
      const isNextSelected = nextActivityKey
        ? selectedActivities.has(nextActivityKey)
        : false;

      return { isSelected, isPrevSelected, isNextSelected };
    },
    [selectedActivities],
  );

  // Key extractor for virtualized list
  const getItemKey = useCallback(
    (activity: ActivityItem): string => {
      return `${currentCategory.id}-${activity.identifier}-${activity.name}`;
    },
    [currentCategory.id],
  );

  // Render function for virtualized items (no animation for performance)
  const renderVirtualizedItem = useCallback(
    (items: ActivityItem[]) =>
      // eslint-disable-next-line react/display-name
      (activity: ActivityItem, index: number): React.ReactNode => {
        const { isSelected, isPrevSelected, isNextSelected } =
          getSelectionState(items, index);

        return (
          <ActivityListItem
            activity={activity}
            isSelected={isSelected}
            isPrevSelected={isPrevSelected}
            isNextSelected={isNextSelected}
            currentCategory={currentCategory}
            allUserCategories={allUserCategories}
            handleMoveActivity={handleMoveActivity}
            isMovingActivity={isMovingActivity}
            faviconErrors={faviconErrors}
            handleFaviconError={handleFaviconError}
            hoveredActivityKey={hoveredActivityKey}
            setHoveredActivityKey={setHoveredActivityKey}
            openDropdownActivityKey={openDropdownActivityKey}
            setOpenDropdownActivityKey={setOpenDropdownActivityKey}
            onSelectActivity={onSelectActivity}
            selectedHour={selectedHour}
            selectedDay={selectedDay}
            viewMode={viewMode}
            startDateMs={startDateMs}
            endDateMs={endDateMs}
            onAddNewCategory={onAddNewCategory}
          />
        );
      },
    [
      getSelectionState,
      currentCategory,
      allUserCategories,
      handleMoveActivity,
      isMovingActivity,
      faviconErrors,
      handleFaviconError,
      hoveredActivityKey,
      setHoveredActivityKey,
      openDropdownActivityKey,
      setOpenDropdownActivityKey,
      onSelectActivity,
      selectedHour,
      selectedDay,
      viewMode,
      startDateMs,
      endDateMs,
      onAddNewCategory,
    ],
  );

  // Render items with animation (for small lists)
  const renderAnimatedItems = (items: ActivityItem[]): React.ReactElement[] => {
    return items.map((activity, index) => {
      const activityKey = `${activity.identifier}-${activity.name}`;
      const { isSelected, isPrevSelected, isNextSelected } = getSelectionState(
        items,
        index,
      );

      return (
        <motion.div
          key={activityKey}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
            delay: index * 0.03, // Stagger each item
          }}
        >
          <ActivityListItem
            activity={activity}
            isSelected={isSelected}
            isPrevSelected={isPrevSelected}
            isNextSelected={isNextSelected}
            currentCategory={currentCategory}
            allUserCategories={allUserCategories}
            handleMoveActivity={handleMoveActivity}
            isMovingActivity={isMovingActivity}
            faviconErrors={faviconErrors}
            handleFaviconError={handleFaviconError}
            hoveredActivityKey={hoveredActivityKey}
            setHoveredActivityKey={setHoveredActivityKey}
            openDropdownActivityKey={openDropdownActivityKey}
            setOpenDropdownActivityKey={setOpenDropdownActivityKey}
            onSelectActivity={onSelectActivity}
            selectedHour={selectedHour}
            selectedDay={selectedDay}
            viewMode={viewMode}
            startDateMs={startDateMs}
            endDateMs={endDateMs}
            onAddNewCategory={onAddNewCategory}
          />
        </motion.div>
      );
    });
  };

  // Render virtualized list
  const renderVirtualizedList = (items: ActivityItem[]): React.ReactElement => {
    return (
      <VirtualizedList
        items={items}
        renderItem={renderVirtualizedItem(items)}
        estimateSize={DEFAULT_ITEM_HEIGHT}
        overscan={5}
        maxHeight={maxVirtualizedHeight}
        getItemKey={getItemKey}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      />
    );
  };

  if (activities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-4 flex flex-col items-center text-center space-y-3">
            <div className="rounded-full bg-secondary/25 p-3">
              <ClipboardIcon className="w-6 h-6 text-secondary-foreground/70" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm">No activities tracked</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDay ? (
                  <>
                    No activities recorded for{" "}
                    <Badge variant="secondary" className="font-normal">
                      {format(selectedDay, "MMMM d, yyyy")}
                    </Badge>
                  </>
                ) : (
                  "No activities recorded for this period"
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // For large lists, use virtualization without animations
  if (shouldVirtualize) {
    // Combine all items when using virtualization
    const allItems = isShowMore
      ? [...activitiesToShow, ...activitiesToHide]
      : activitiesToShow;

    return (
      <div>
        {renderVirtualizedList(allItems)}
        {activitiesToHide.length > 0 && (
          <Button
            variant="link"
            className="p-1 px-2 mt-2 w-full h-auto text-xs text-left justify-start text-slate-600 dark:text-slate-400 hover:text-foreground transition-colors flex items-center gap-1"
            onClick={onToggleShowMore}
          >
            {isShowMore ? "Show less" : `Show ${activitiesToHide.length} more`}
            <ChevronDownIcon
              className={`ml-.5 h-4 w-4 transition-transform duration-200 ${
                isShowMore ? "rotate-180" : ""
              }`}
            />
          </Button>
        )}
      </div>
    );
  }

  // For small lists, use the original animated rendering
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderAnimatedItems(activitiesToShow)}
        {activitiesToHide.length > 0 && (
          <Button
            variant="link"
            className="p-1 px-2 mt-2 w-full h-auto text-xs text-left justify-start text-slate-600 dark:text-slate-400 hover:text-foreground transition-colors flex items-center gap-1"
            onClick={onToggleShowMore}
          >
            {isShowMore ? "Show less" : `Show ${activitiesToHide.length} more`}
            <ChevronDownIcon
              className={`ml-.5 h-4 w-4 transition-transform duration-200 ${
                isShowMore ? "rotate-180" : ""
              }`}
            />
          </Button>
        )}
        <AnimatePresence>
          {isShowMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
                height: { duration: 0.3 },
              }}
              className="overflow-hidden"
            >
              {renderAnimatedItems(activitiesToHide)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
