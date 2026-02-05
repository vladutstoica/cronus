import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import React, { useCallback, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Function to render each item */
  renderItem: (
    item: T,
    index: number,
    virtualItem: VirtualItem,
  ) => React.ReactNode;
  /** Estimated height of each item in pixels (default: 32) */
  estimateSize?: number;
  /** Number of items to render above/below the visible area for smoother scrolling (default: 5) */
  overscan?: number;
  /** Fixed height for the container. If not provided, the list will use available space */
  height?: number | string;
  /** Maximum height for the container before scrolling kicks in */
  maxHeight?: number | string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Unique key extractor for each item */
  getItemKey?: (item: T, index: number) => string | number;
  /** Callback when scroll position changes */
  onScroll?: (scrollOffset: number) => void;
  /** Initial scroll offset to restore scroll position */
  initialScrollOffset?: number;
  /** Gap between items in pixels (default: 0) */
  gap?: number;
  /** Callback when a range of items becomes visible */
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
}

/**
 * A generic virtualized list component using @tanstack/react-virtual.
 * Only renders visible items plus a small buffer for optimal performance with large datasets.
 *
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={activities}
 *   renderItem={(activity, index) => (
 *     <ActivityListItem key={activity.id} activity={activity} />
 *   )}
 *   estimateSize={40}
 *   maxHeight={400}
 * />
 * ```
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 32,
  overscan = 5,
  height,
  maxHeight,
  className,
  getItemKey,
  onScroll,
  initialScrollOffset,
  gap = 0,
  onRangeChange,
}: VirtualizedListProps<T>): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<{ startIndex: number; endIndex: number } | null>(
    null,
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
    gap,
  });

  // Handle initial scroll offset
  useEffect(() => {
    if (initialScrollOffset !== undefined && parentRef.current) {
      virtualizer.scrollToOffset(initialScrollOffset);
    }
  }, [initialScrollOffset, virtualizer]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (onScroll && parentRef.current) {
      onScroll(parentRef.current.scrollTop);
    }
  }, [onScroll]);

  const virtualItems = virtualizer.getVirtualItems();

  // Track range changes
  useEffect(() => {
    if (onRangeChange && virtualItems.length > 0) {
      const newRange = {
        startIndex: virtualItems[0].index,
        endIndex: virtualItems[virtualItems.length - 1].index,
      };
      if (
        !rangeRef.current ||
        rangeRef.current.startIndex !== newRange.startIndex ||
        rangeRef.current.endIndex !== newRange.endIndex
      ) {
        rangeRef.current = newRange;
        onRangeChange(newRange);
      }
    }
  }, [virtualItems, onRangeChange]);

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const scrollElement = parentRef.current;
      if (!scrollElement) return;

      const scrollAmount = estimateSize;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          scrollElement.scrollTop += scrollAmount;
          break;
        case "ArrowUp":
          event.preventDefault();
          scrollElement.scrollTop -= scrollAmount;
          break;
        case "PageDown":
          event.preventDefault();
          scrollElement.scrollTop += scrollElement.clientHeight;
          break;
        case "PageUp":
          event.preventDefault();
          scrollElement.scrollTop -= scrollElement.clientHeight;
          break;
        case "Home":
          event.preventDefault();
          scrollElement.scrollTop = 0;
          break;
        case "End":
          event.preventDefault();
          scrollElement.scrollTop = scrollElement.scrollHeight;
          break;
      }
    },
    [estimateSize],
  );

  // Handle empty state
  if (items.length === 0) {
    return <div className={className} />;
  }

  const containerStyle: React.CSSProperties = {
    height: height ?? "auto",
    maxHeight: maxHeight ?? "auto",
    overflow: "auto",
  };

  return (
    <div
      ref={parentRef}
      className={cn("relative", className)}
      style={containerStyle}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="list"
      aria-label="Virtualized list"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
            role="listitem"
          >
            {renderItem(
              items[virtualItem.index],
              virtualItem.index,
              virtualItem,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualizedList;
