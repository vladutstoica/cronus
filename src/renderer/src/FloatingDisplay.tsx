import clsx from "clsx";
import { AppWindowMac, Pause, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Category } from "@shared/types";
import { Button } from "./components/ui/button";
import StatusBox from "./components/ui/StatusBox";

type LatestStatusType = "productive" | "unproductive" | "maybe" | null;

interface FloatingStatusUpdate {
  latestStatus: LatestStatusType;
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  categoryDetails?: Category;
  activityIdentifier?: string;
  itemType?: "app" | "website";
  activityName?: string;
  activityUrl?: string;
  categoryReasoning?: string;
  isTrackingPaused?: boolean;
  ocrCaptured?: boolean;
  eventId?: string;
}

// Helper to format milliseconds to HH:MM:SS
const formatMsToTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const FloatingDisplay: React.FC = () => {
  const [latestStatus, setLatestStatus] = useState<LatestStatusType>(null);
  const [displayedProductiveTimeMs, setDisplayedProductiveTimeMs] =
    useState<number>(0);
  const [dailyUnproductiveMs, setDailyUnproductiveMs] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isTrackingPaused, setIsTrackingPaused] = useState<boolean>(false);
  const [currentCategoryDetails, setCurrentCategoryDetails] = useState<
    Category | undefined
  >(undefined);
  const [activityInfo, setActivityInfo] = useState<{
    identifier?: string;
    itemType?: "app" | "website";
    name?: string;
    url?: string;
    categoryReasoning?: string;
  }>({});
  const [showOcrIndicator, setShowOcrIndicator] = useState(false);
  const ocrIndicatorTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastEventIdWithOcr = useRef<string | null>(null);

  // State for handling "maybe" pending state
  const [frozenProductiveTimeMs, setFrozenProductiveTimeMs] =
    useState<number>(0);
  const [frozenUnproductiveTimeMs, setFrozenUnproductiveTimeMs] =
    useState<number>(0);
  const [pendingStartTime, setPendingStartTime] = useState<number | null>(null);

  const draggableRef = useRef<HTMLDivElement>(null);
  const dragStartInfoRef = useRef<{
    initialMouseX: number;
    initialMouseY: number;
  } | null>(null);
  const lastBackendUpdateTime = useRef<number>(Date.now());

  useEffect(() => {
    if (window.floatingApi) {
      const cleanup = window.floatingApi.onStatusUpdate(
        (data: FloatingStatusUpdate) => {
          setLatestStatus(data.latestStatus);
          setDisplayedProductiveTimeMs(data.dailyProductiveMs);
          setDailyUnproductiveMs(data.dailyUnproductiveMs);
          setCurrentCategoryDetails(data.categoryDetails);
          setIsTrackingPaused(data.isTrackingPaused || false);
          setActivityInfo({
            identifier: data.activityIdentifier,
            itemType: data.itemType,
            name: data.activityName,
            url: data.activityUrl,
            categoryReasoning: data.categoryReasoning,
          });
          setIsVisible(true);
          // Update last backend update timestamp
          lastBackendUpdateTime.current = Date.now();

          // Show OCR indicator briefly when new OCR content is captured
          if (data.ocrCaptured && data.eventId && data.eventId !== lastEventIdWithOcr.current) {
            lastEventIdWithOcr.current = data.eventId;
            if (ocrIndicatorTimeout.current) {
              clearTimeout(ocrIndicatorTimeout.current);
            }
            setShowOcrIndicator(true);
            ocrIndicatorTimeout.current = setTimeout(() => {
              setShowOcrIndicator(false);
            }, 2000); // Show for 2 seconds
          }
        },
      );
      return cleanup;
    }
    return () => {};
  }, []);

  // Fallback timer: increment locally if no backend update for 10+ seconds
  // This provides continuity when backend updates stop (prevents freezing)
  useEffect(() => {
    const fallbackInterval = setInterval(() => {
      if (isTrackingPaused || latestStatus === "maybe") {
        return; // Don't increment when paused or in "maybe" state
      }

      const timeSinceLastUpdate = Date.now() - lastBackendUpdateTime.current;

      // If no update for 10 seconds, start fallback local increments
      if (timeSinceLastUpdate > 10000) {
        console.warn(
          "[FloatingDisplay] No backend update for 10s, using fallback local timer",
        );

        if (latestStatus === "productive") {
          setDisplayedProductiveTimeMs((prev) => prev + 1000);
        } else if (latestStatus === "unproductive") {
          setDailyUnproductiveMs((prev) => prev + 1000);
        }
      }
    }, 1000);

    return () => clearInterval(fallbackInterval);
  }, [latestStatus, isTrackingPaused]);

  // Handle state transitions and freeze/unfreeze timers
  useEffect(() => {
    if (latestStatus === "maybe") {
      // Entering "maybe" state - freeze both timers
      if (pendingStartTime === null) {
        setFrozenProductiveTimeMs(displayedProductiveTimeMs);
        setFrozenUnproductiveTimeMs(dailyUnproductiveMs);
        setPendingStartTime(Date.now());
      }
    } else if (pendingStartTime !== null) {
      // Exiting "maybe" state - allocate pending time to the correct category
      const pendingTime = Date.now() - pendingStartTime;

      if (latestStatus === "productive") {
        setDisplayedProductiveTimeMs((prev) => prev + pendingTime);
      } else if (latestStatus === "unproductive") {
        setDailyUnproductiveMs((prev) => prev + pendingTime);
      }

      // Reset pending tracking
      setPendingStartTime(null);
    }
  }, [
    latestStatus,
    pendingStartTime,
    displayedProductiveTimeMs,
    dailyUnproductiveMs,
  ]);

  // Timer updates now come exclusively from backend (DistractionStatusBar polls every 1s)
  // This eliminates race conditions between local increments and backend updates

  const handleGlobalMouseMove = useCallback((event: globalThis.MouseEvent) => {
    if (!dragStartInfoRef.current || !window.floatingApi) return;
    const deltaX = event.clientX - dragStartInfoRef.current.initialMouseX;
    const deltaY = event.clientY - dragStartInfoRef.current.initialMouseY;
    window.floatingApi.moveWindow(deltaX, deltaY);
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    if (draggableRef.current) {
      draggableRef.current.style.cursor = "grab";
    }
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);
    dragStartInfoRef.current = null;
  }, [handleGlobalMouseMove]);

  const handleMouseDownOnDraggable = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    if (
      (event.target as HTMLElement).closest(".close-button-area") ||
      (event.target as HTMLElement).closest(".edit-icon-area")
    ) {
      return;
    }
    if (draggableRef.current) {
      draggableRef.current.style.cursor = "grabbing";
    }
    dragStartInfoRef.current = {
      initialMouseX: event.clientX,
      initialMouseY: event.clientY,
    };
    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleClose = () => {
    if (window.floatingApi) {
      window.floatingApi.hideFloatingWindow();
    }
  };

  const handleCategoryNameClick = () => {
    console.log(
      "[FloatingDisplay] handleCategoryNameClick",
      currentCategoryDetails,
      activityInfo,
    );

    if (window.floatingApi && window.floatingApi.requestRecategorizeView) {
      if (
        !currentCategoryDetails ||
        !activityInfo.identifier ||
        !activityInfo.itemType
      ) {
        console.warn(
          "[FloatingDisplay] Not enough information to send for recategorization.",
          currentCategoryDetails,
          activityInfo,
        );
        return;
      }
      const activityToRecategorize = {
        identifier: activityInfo.identifier,
        nameToDisplay: activityInfo.name || "Unknown Activity",
        itemType: activityInfo.itemType,
        currentCategoryId: currentCategoryDetails._id,
        currentCategoryName: currentCategoryDetails.name,
        currentCategoryColor: currentCategoryDetails.color,
        originalUrl: activityInfo.url,
        categoryReasoning: activityInfo.categoryReasoning,
      };

      console.log(
        "[FloatingDisplay] Sending activity to recategorize:",
        activityToRecategorize,
      );

      window.floatingApi.requestRecategorizeView(activityToRecategorize);
    } else {
      console.warn(
        "[FloatingDisplay] floatingApi.requestRecategorizeView is not available.",
      );
    }
  };

  const handleOpenMainAppWindow = () => {
    if (window.floatingApi && window.floatingApi.openMainAppWindow) {
      window.floatingApi.openMainAppWindow();
    } else {
      console.warn(
        "[FloatingDisplay] floatingApi.openMainAppWindow is not available.",
      );
    }
  };

  if (!isVisible && latestStatus === null) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2 rounded-xl bg-background border-2 border-secondary/50">
        <span className="text-xs text-muted-foreground animate-pulse">
          Waiting for activity...
        </span>
      </div>
    );
  }

  let productiveIsHighlighted = false;
  let productiveIsEnlarged = false;
  const productiveHighlightColor: "green" | "red" | "orange" | undefined =
    "green";

  let unproductiveIsHighlighted = false;
  let unproductiveIsEnlarged = false;
  let unproductiveHighlightColor: "green" | "red" | "orange" | undefined =
    "red";
  let unproductiveLabel = "Distractions";

  // Use frozen times when in "maybe" state, otherwise use current times
  const productiveTimeFormatted = formatMsToTime(
    latestStatus === "maybe"
      ? frozenProductiveTimeMs
      : displayedProductiveTimeMs,
  );
  const unproductiveTimeFormatted = formatMsToTime(
    latestStatus === "maybe" ? frozenUnproductiveTimeMs : dailyUnproductiveMs,
  );

  let productiveBoxCategoryDetails: Category | undefined = undefined;
  let unproductiveBoxCategoryDetails: Category | undefined = undefined;

  if (latestStatus === "productive") {
    productiveIsHighlighted = true;
    productiveIsEnlarged = true;
    productiveBoxCategoryDetails = currentCategoryDetails;
  } else if (latestStatus === "unproductive") {
    unproductiveIsHighlighted = true;
    unproductiveIsEnlarged = true;
    unproductiveBoxCategoryDetails = currentCategoryDetails;
  } else if (latestStatus === "maybe") {
    // In "maybe" state, don't highlight either box - they'll both be small
    // The pending icon in the center will be emphasized
    productiveIsHighlighted = false;
    productiveIsEnlarged = false;
    unproductiveIsHighlighted = false;
    unproductiveIsEnlarged = false;
  }

  // visual indication when tracking is paused
  const getPauseIndicator = () => {
    if (isTrackingPaused) {
      return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center">
          <div className="bg-blue-700 text-white px-2 py-1 opacity-90 rounded-lg font-semibold text-xs shadow-lg flex items-center gap-1">
            <Pause size={12} />
            PAUSED
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={draggableRef}
      className={clsx(
        "w-full h-full flex items-center px-0.5 rounded-[10px] select-none relative",
        "border-2 border-secondary/50",
        isTrackingPaused && "opacity-75",
        latestStatus === "maybe" && "animate-pulse",
      )}
      onMouseDown={handleMouseDownOnDraggable}
      title="Drag to move"
      style={{ cursor: "grab" }}
    >
      {getPauseIndicator()}
      <div className="flex flex-col gap-[-1px] mr-[-1px] items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="close-button-area p-1 w-5 h-5 mr-1 rounded-[7px]"
          title="Close Mini Timer"
        >
          <X className="w-[8px] h-[8px] text-muted-foreground hover:text-primary" />
        </Button>
        {/* button to open the main app window - turns blue when OCR captures */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenMainAppWindow}
          className="open-main-app-window-butto p-1 w-5 h-5 mr-1 rounded-[7px]"
          title={showOcrIndicator ? "Screen text captured" : "Open Main App Window"}
        >
          <AppWindowMac
            className={clsx(
              "w-[8px] h-[8px]",
              showOcrIndicator
                ? "text-blue-400 animate-pulse"
                : "text-muted-foreground hover:text-primary",
            )}
          />
        </Button>
      </div>

      <div className="flex-grow flex items-stretch gap-1 h-full">
        {latestStatus === "maybe" ? (
          // Both boxes shown equally when pending (window pulses)
          <>
            <div className="flex-1 min-w-0 h-full [&>div]:!w-full">
              <StatusBox
                label="Productive"
                time={productiveTimeFormatted}
                isHighlighted={false}
                highlightColor={productiveHighlightColor}
                isEnlarged={false}
                categoryDetails={undefined}
                onCategoryClick={handleCategoryNameClick}
                disabled={true}
              />
            </div>
            <div className="flex-1 min-w-0 h-full [&>div]:!w-full">
              <StatusBox
                label={unproductiveLabel}
                time={unproductiveTimeFormatted}
                isHighlighted={false}
                highlightColor={unproductiveHighlightColor}
                isEnlarged={false}
                categoryDetails={undefined}
                onCategoryClick={handleCategoryNameClick}
                disabled={true}
              />
            </div>
          </>
        ) : (
          // Normal state - one box highlighted/enlarged
          <>
            <StatusBox
              label="Productive"
              time={productiveTimeFormatted}
              isHighlighted={productiveIsHighlighted}
              highlightColor={productiveHighlightColor}
              isEnlarged={productiveIsEnlarged}
              categoryDetails={productiveBoxCategoryDetails}
              onCategoryClick={handleCategoryNameClick}
              disabled={!currentCategoryDetails}
            />
            <StatusBox
              label={unproductiveLabel}
              time={unproductiveTimeFormatted}
              isHighlighted={unproductiveIsHighlighted}
              highlightColor={unproductiveHighlightColor}
              isEnlarged={unproductiveIsEnlarged}
              categoryDetails={unproductiveBoxCategoryDetails}
              onCategoryClick={handleCategoryNameClick}
              disabled={!currentCategoryDetails}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingDisplay;
