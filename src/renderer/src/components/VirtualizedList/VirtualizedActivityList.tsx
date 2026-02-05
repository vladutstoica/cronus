import React, { useCallback, useMemo, useState } from "react";
import { Category as SharedCategory } from "@shared/types";
import { ActivityItem, ProcessedCategory } from "../../lib/activityProcessing";
import { VirtualizedList } from "./VirtualizedList";
import { ActivityListItem } from "../ActivityList/ActivityListItem";
import { cn } from "../../lib/utils";

/** Threshold for using virtualization (number of items) */
const VIRTUALIZATION_THRESHOLD = 50;

/** Default estimated item height in pixels */
const DEFAULT_ITEM_HEIGHT = 32;

/** Maximum height before scrolling (in pixels) */
const DEFAULT_MAX_HEIGHT = 400;

interface VirtualizedActivityListProps {
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
  /** Maximum height for the virtualized list before scrolling. Defaults to 400px */
  maxHeight?: number;
  /** Custom class name for the container */
  className?: string;
  /** Force virtualization regardless of item count (useful for testing) */
  forceVirtualization?: boolean;
}

/**
 * A virtualized activity list that efficiently renders large numbers of activities.
 * Automatically falls back to regular rendering for small lists.
 *
 * Performance characteristics:
 * - Uses virtualization for lists > 50 items
 * - Only renders visible items + 5 overscan items
 * - Maintains scroll position on data changes
 * - Supports keyboard navigation
 *
 * @example
 * ```tsx
 * <VirtualizedActivityList
 *   activities={activities}
 *   currentCategory={category}
 *   allUserCategories={categories}
 *   handleMoveActivity={handleMove}
 *   isMovingActivity={false}
 *   faviconErrors={new Set()}
 *   handleFaviconError={() => {}}
 *   hoveredActivityKey={null}
 *   setHoveredActivityKey={() => {}}
 *   openDropdownActivityKey={null}
 *   setOpenDropdownActivityKey={() => {}}
 *   selectedHour={null}
 *   selectedDay={null}
 *   viewMode="day"
 *   startDateMs={Date.now()}
 *   endDateMs={Date.now()}
 *   selectedActivities={new Set()}
 *   onSelectActivity={() => {}}
 *   onAddNewCategory={() => {}}
 * />
 * ```
 */
export function VirtualizedActivityList({
  activities,
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
  selectedHour,
  selectedDay,
  viewMode,
  startDateMs,
  endDateMs,
  selectedActivities,
  onSelectActivity,
  onAddNewCategory,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
  forceVirtualization = false,
}: VirtualizedActivityListProps): React.ReactElement {
  // Track scroll position for restoration
  const [scrollOffset, setScrollOffset] = useState(0);

  // Determine if we should use virtualization based on item count
  const shouldVirtualize = useMemo(
    () => forceVirtualization || activities.length >= VIRTUALIZATION_THRESHOLD,
    [activities.length, forceVirtualization],
  );

  // Memoize the key extractor to avoid recreating on each render
  const getItemKey = useCallback(
    (activity: ActivityItem): string => {
      return `${currentCategory.id}-${activity.identifier}-${activity.name}`;
    },
    [currentCategory.id],
  );

  // Compute selection state for items
  const selectionState = useMemo(() => {
    return activities.map((activity, index) => {
      const activityKey = `${activity.identifier}-${activity.name}`;
      const isSelected = selectedActivities.has(activityKey);

      const prevItem = activities[index - 1];
      const nextItem = activities[index + 1];

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
    });
  }, [activities, selectedActivities]);

  // Render function for each activity item
  const renderActivity = useCallback(
    (activity: ActivityItem, index: number): React.ReactNode => {
      const { isSelected, isPrevSelected, isNextSelected } = selectionState[
        index
      ] || {
        isSelected: false,
        isPrevSelected: false,
        isNextSelected: false,
      };

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
      selectionState,
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

  // Handle empty state
  if (activities.length === 0) {
    return <div className={className} />;
  }

  // For small lists, render without virtualization for simpler DOM structure
  if (!shouldVirtualize) {
    return (
      <div className={cn("space-y-0", className)}>
        {activities.map((activity, index) => (
          <div key={getItemKey(activity)}>
            {renderActivity(activity, index)}
          </div>
        ))}
      </div>
    );
  }

  // Use virtualization for large lists
  return (
    <VirtualizedList
      items={activities}
      renderItem={renderActivity}
      estimateSize={DEFAULT_ITEM_HEIGHT}
      overscan={5}
      maxHeight={maxHeight}
      className={cn(
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      getItemKey={getItemKey}
      onScroll={setScrollOffset}
      initialScrollOffset={scrollOffset}
    />
  );
}

export default VirtualizedActivityList;
