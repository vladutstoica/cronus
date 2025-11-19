import { ChevronDownIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { Category as SharedCategory } from "@shared/types";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { toast } from "../../hooks/use-toast";
import useActivitySelection from "../../hooks/useActivitySelection";
import { getTimeRangeDescription } from "../../lib/activityMoving";
import {
  ActivityItem,
  ProcessedCategory,
  processActivityEvents,
} from "../../lib/activityProcessing";
import { SYSTEM_EVENT_NAMES } from "../../lib/constants";
import { showActivityMovedToast } from "../../lib/custom-toasts";
import { localApi } from "../../lib/localApi";
import type { ProcessedEventBlock } from "../DashboardView";
import { CategoryForm } from "../Settings/CategoryForm";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import ActivityByCategorySkeleton from "./ActivityByCategorySkeleton";
import { ActivityList } from "./ActivityList";
import { CategorySectionHeader } from "./CategorySectionHeader";
import { TimeRangeSelectionInfo } from "./TimeRangeSelectionInfo";

interface ActivitiesByCategoryWidgetProps {
  processedEvents: ProcessedEventBlock[] | null;
  isLoadingEvents: boolean;
  startDateMs: number | null;
  endDateMs: number | null;
  refetchEvents: () => void;
  selectedHour: number | null;
  onHourSelect: (hour: number | null) => void;
  selectedDay: Date | null;
  onDaySelect: (day: Date | null) => void;
}

const ActivitiesByCategoryWidget = ({
  processedEvents: todayProcessedEvents,
  isLoadingEvents: isLoadingEventsProp,
  startDateMs,
  endDateMs,
  refetchEvents,
  selectedHour,
  onHourSelect,
  selectedDay,
  onDaySelect,
}: ActivitiesByCategoryWidgetProps): React.ReactElement => {
  const { user, isAuthenticated } = useAuth();
  const { setIsSettingsOpen, setFocusOn } = useSettings();
  const [processedData, setProcessedData] = useState<ProcessedCategory[]>([]);
  const [faviconErrors, setFaviconErrors] = useState<Set<string>>(new Set());
  const [hoveredActivityKey, setHoveredActivityKey] = useState<string | null>(
    null,
  );
  const [openDropdownActivityKey, setOpenDropdownActivityKey] = useState<
    string | null
  >(null);
  const [showMore, setShowMore] = useState<Record<string, boolean>>({});
  const [showSmallCategories, setShowSmallCategories] = useState(false);
  const { selectedActivities, handleSelectActivity, clearSelection } =
    useActivitySelection(processedData, showMore);
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);

  const [categories, setCategories] = useState<SharedCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // Load categories
  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await localApi.categories.getAll();
      setCategories(data as SharedCategory[]);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const createCategoryMutation = {
    mutateAsync: async (data: any) => {
      setIsCreatingCategory(true);
      try {
        await localApi.categories.create(data);
        await loadCategories();
      } catch (error) {
        console.error("Error creating category:", error);
        throw error;
      } finally {
        setIsCreatingCategory(false);
      }
    },
    isLoading: isCreatingCategory,
  };

  const updateCategoryMutation = {
    mutate: (variables: {
      newCategoryId: string;
      activityIdentifier: string;
      itemType: "app" | "website";
      startDateMs: number;
      endDateMs: number;
    }) => {
      setIsUpdatingCategory(true);

      // Perform update asynchronously
      (async () => {
        try {
          // Update events by recategorizing them in the database
          const updatedCount = await localApi.events.recategorizeByIdentifier(
            variables.activityIdentifier,
            variables.itemType,
            variables.startDateMs,
            variables.endDateMs,
            variables.newCategoryId,
          );

          console.log(`Successfully recategorized ${updatedCount} events`);

          // Refetch events to show updated data
          await refetchEvents();

          // Notify DistractionStatusBar to refresh today's events for floating window update
          window.dispatchEvent(new CustomEvent("refresh-today-events"));

          const targetCategory = categories?.find(
            (cat) => cat._id === variables.newCategoryId,
          );
          const targetCategoryName = targetCategory
            ? targetCategory.name
            : "Unknown Category";
          const timeRangeDescription = getTimeRangeDescription(
            selectedHour,
            selectedDay,
            "day",
            startDateMs,
            endDateMs,
          );

          showActivityMovedToast({
            activityIdentifier: variables.activityIdentifier,
            targetCategoryName,
            timeRangeDescription,
            setIsSettingsOpen,
            setFocusOn,
          });
        } catch (error) {
          console.error("Error updating category:", error);
          toast({
            title: "Error",
            description: "Failed to move activity. Please try again.",
            variant: "destructive",
            duration: 3000,
          });
        } finally {
          setIsUpdatingCategory(false);
        }
      })();
    },
    mutateAsync: async (variables: {
      newCategoryId: string;
      activityIdentifier: string;
      itemType: "app" | "website";
      startDateMs: number;
      endDateMs: number;
    }) => {
      setIsUpdatingCategory(true);
      try {
        // Update events by recategorizing them in the database
        const updatedCount = await localApi.events.recategorizeByIdentifier(
          variables.activityIdentifier,
          variables.itemType,
          variables.startDateMs,
          variables.endDateMs,
          variables.newCategoryId,
        );

        console.log(`Successfully recategorized ${updatedCount} events`);

        // Refetch events to show updated data
        await refetchEvents();

        // Notify DistractionStatusBar to refresh today's events for floating window update
        window.dispatchEvent(new CustomEvent("refresh-today-events"));

        const targetCategory = categories?.find(
          (cat) => cat._id === variables.newCategoryId,
        );
        const targetCategoryName = targetCategory
          ? targetCategory.name
          : "Unknown Category";
        const timeRangeDescription = getTimeRangeDescription(
          selectedHour,
          selectedDay,
          "day",
          startDateMs,
          endDateMs,
        );

        showActivityMovedToast({
          activityIdentifier: variables.activityIdentifier,
          targetCategoryName,
          timeRangeDescription,
          setIsSettingsOpen,
          setFocusOn,
        });
      } catch (error) {
        console.error("Error updating category:", error);
        toast({
          title: "Error",
          description: "Failed to move activity. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
        throw error;
      } finally {
        setIsUpdatingCategory(false);
      }
    },
    isLoading: isUpdatingCategory,
  };

  const bulkUpdateCategoryMutation = updateCategoryMutation;

  const handleSaveNewCategory = async (
    data: Omit<SharedCategory, "_id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<void> => {
    try {
      await createCategoryMutation.mutateAsync(data);
      // Reload categories
      await loadCategories();
      setIsCreateCategoryOpen(false);
      toast({
        title: "Category Created",
        duration: 1500,
        description: `Category "${data.name}" has been created.`,
      });

      // If there are selected activities, move them to the new category
      const selectedActivitiesToMove = processedData
        .flatMap((cat) => cat.activities)
        .filter((act) =>
          selectedActivities.has(`${act.identifier}-${act.name}`),
        );
      if (selectedActivitiesToMove.length > 0 && categories.length > 0) {
        const newCategory = categories[categories.length - 1]; // Get the last added category
        handleMoveMultipleActivities(selectedActivitiesToMove, newCategory._id);
      }
    } catch (err) {
      toast({
        duration: 1500,
        title: "Error creating category",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleMoveMultipleActivities = async (
    activitiesToMove: ActivityItem[],
    targetCategoryId: string,
  ): Promise<void> => {
    if (
      startDateMs === null ||
      endDateMs === null ||
      activitiesToMove.length === 0
    ) {
      return;
    }

    setIsBulkMoving(true);

    const targetCategory = categories?.find(
      (cat) => cat._id === targetCategoryId,
    );
    const targetCategoryName = targetCategory
      ? targetCategory.name
      : "Unknown Category";

    const movePromises = activitiesToMove.map((activity) =>
      bulkUpdateCategoryMutation.mutateAsync({
        startDateMs,
        endDateMs,
        activityIdentifier: activity.identifier,
        itemType: activity.itemType,
        newCategoryId: targetCategoryId,
      }),
    );

    try {
      await Promise.all(movePromises);
      refetchEvents();

      const timeRangeDescription = getTimeRangeDescription(
        selectedHour,
        selectedDay,
        "day",
        startDateMs,
        endDateMs,
      );

      showActivityMovedToast({
        activityIdentifier: activitiesToMove.length,
        targetCategoryName,
        timeRangeDescription,
        setIsSettingsOpen,
        setFocusOn,
      });
      clearSelection();
    } catch (error) {
      console.error("Error moving activities:", error);
      toast({
        duration: 1500,
        title: "Error",
        description: "Could not move all activities.",
        variant: "destructive",
      });
    } finally {
      setIsBulkMoving(false);
    }
  };

  const handleAddNewCategory = (): void => {
    setOpenDropdownActivityKey(null); // close any open dropdowns
    setIsCreateCategoryOpen(true);
  };

  useEffect(() => {
    if (isLoadingCategories || isLoadingEventsProp) {
      setProcessedData([]);
      return;
    }

    if (!categories || !todayProcessedEvents) {
      setProcessedData([]);
      return;
    }

    const filteredEvents = todayProcessedEvents.filter(
      (event) => !SYSTEM_EVENT_NAMES.includes(event.name),
    );

    const categoriesMap = new Map<string, SharedCategory>(
      (categories || []).map((cat: SharedCategory) => [cat._id, cat]),
    );

    let processedCategoriesResult: ProcessedCategory[] = [];

    if (filteredEvents.length === 0) {
      processedCategoriesResult = [];
    } else {
      processedCategoriesResult = processActivityEvents(
        filteredEvents,
        categoriesMap,
      );
    }

    const finalResult = processedCategoriesResult.sort((a, b) => {
      if (a.isProductive !== b.isProductive) {
        return a.isProductive ? -1 : 1;
      }
      return b.totalDurationMs - a.totalDurationMs;
    });

    setProcessedData(finalResult);
  }, [
    categories,
    todayProcessedEvents,
    isLoadingCategories,
    isLoadingEventsProp,
  ]);

  const handleFaviconError = (identifier: string): void => {
    setFaviconErrors((prev) => new Set(prev).add(identifier));
  };

  const handleMoveActivity = (
    activity: ActivityItem,
    targetCategoryId: string,
  ): void => {
    console.log("handleMoveActivity in ActivitiesByCategoryWidget.tsx");
    if (startDateMs === null || endDateMs === null) {
      console.error("Missing date range for move operation");
      return;
    }
    updateCategoryMutation.mutate({
      startDateMs,
      endDateMs,
      activityIdentifier: activity.identifier,
      itemType: activity.itemType,
      newCategoryId: targetCategoryId,
    });
  };

  const oneMinuteMs = 60 * 1000;
  const visibleCategories = processedData.filter(
    (cat) => cat.totalDurationMs >= oneMinuteMs,
  );
  const hiddenCategories = processedData.filter(
    (cat) => cat.totalDurationMs > 0 && cat.totalDurationMs < oneMinuteMs,
  );

  const shouldShowAllCategories =
    visibleCategories.length === 0 && hiddenCategories.length > 0;
  const categoriesToShow = shouldShowAllCategories
    ? processedData.filter((c) => c.totalDurationMs > 0)
    : visibleCategories;
  const categoriesToHide = shouldShowAllCategories ? [] : hiddenCategories;

  const renderCategoryItems = (
    categoriesToRender: ProcessedCategory[],
    variant?: "empty",
  ): React.ReactElement[] => {
    return categoriesToRender
      .map((category) => {
        if (category.totalDurationMs === 0 && variant !== "empty") return null;

        const isAnyActivitySelected = category.activities.some((act) =>
          selectedActivities.has(`${act.identifier}-${act.name}`),
        );
        const otherCategories =
          categories?.filter((cat) => cat._id !== category.id) || [];
        const selectedActivitiesInThisCategory = category.activities.filter(
          (act) => selectedActivities.has(`${act.identifier}-${act.name}`),
        );
        const handleMoveSelected = (targetCategoryId: string): void => {
          handleMoveMultipleActivities(
            selectedActivitiesInThisCategory,
            targetCategoryId,
          );
        };

        return (
          <div key={category.id}>
            <CategorySectionHeader
              category={category}
              variant={variant}
              isAnyActivitySelected={isAnyActivitySelected}
              otherCategories={otherCategories}
              isMovingActivity={isBulkMoving}
              handleMoveSelected={handleMoveSelected}
              handleClearSelection={clearSelection}
              onAddNewCategory={handleAddNewCategory}
            />
            {variant === "empty" ? (
              <ActivityList
                activities={[]} // Pass empty array to trigger empty state UI
                currentCategory={category}
                allUserCategories={categories}
                handleMoveActivity={handleMoveActivity}
                isMovingActivity={updateCategoryMutation.isLoading}
                faviconErrors={faviconErrors}
                handleFaviconError={handleFaviconError}
                isShowMore={!!showMore[category.id]}
                onToggleShowMore={() =>
                  setShowMore((prev) => ({
                    ...prev,
                    [category.id]: !prev[category.id],
                  }))
                }
                hoveredActivityKey={hoveredActivityKey}
                setHoveredActivityKey={setHoveredActivityKey}
                openDropdownActivityKey={openDropdownActivityKey}
                setOpenDropdownActivityKey={setOpenDropdownActivityKey}
                selectedHour={selectedHour}
                selectedDay={selectedDay}
                viewMode="day"
                startDateMs={startDateMs}
                endDateMs={endDateMs}
                selectedActivities={selectedActivities}
                onSelectActivity={handleSelectActivity}
                onAddNewCategory={handleAddNewCategory}
              />
            ) : (
              <ActivityList
                activities={category.activities}
                currentCategory={category}
                allUserCategories={categories}
                handleMoveActivity={handleMoveActivity}
                isMovingActivity={updateCategoryMutation.isLoading}
                faviconErrors={faviconErrors}
                handleFaviconError={handleFaviconError}
                isShowMore={!!showMore[category.id]}
                onToggleShowMore={() =>
                  setShowMore((prev) => ({
                    ...prev,
                    [category.id]: !prev[category.id],
                  }))
                }
                hoveredActivityKey={hoveredActivityKey}
                setHoveredActivityKey={setHoveredActivityKey}
                openDropdownActivityKey={openDropdownActivityKey}
                setOpenDropdownActivityKey={setOpenDropdownActivityKey}
                selectedHour={selectedHour}
                selectedDay={selectedDay}
                viewMode="day"
                startDateMs={startDateMs}
                endDateMs={endDateMs}
                selectedActivities={selectedActivities}
                onSelectActivity={handleSelectActivity}
                onAddNewCategory={handleAddNewCategory}
              />
            )}
          </div>
        );
      })
      .filter(Boolean) as React.ReactElement[];
  };

  if (isLoadingEventsProp || isLoadingCategories) {
    return <ActivityByCategorySkeleton />;
  }

  const hasNoActivities =
    !todayProcessedEvents ||
    todayProcessedEvents.length === 0 ||
    todayProcessedEvents.every((event) =>
      SYSTEM_EVENT_NAMES.includes(event.name),
    ) ||
    processedData.every((p) => p.totalDurationMs === 0);

  if (hasNoActivities) {
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
                  <Badge variant="secondary" className="font-normal">
                    {format(selectedDay, "MMMM d, yyyy")}
                  </Badge>
                ) : (
                  "No activities recorded for this day. Open Chrome or another application to start tracking."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Flatten all activities
  const allActivities = processedData.flatMap((cat) => cat.activities);
  const hasOnlyCronusOrElectron =
    allActivities.length > 0 &&
    allActivities.every((act) => ["Electron", "Cronus"].includes(act.name));

  return (
    <>
      <Dialog
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your activities.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSave={handleSaveNewCategory}
            onCancel={() => setIsCreateCategoryOpen(false)}
            isSaving={createCategoryMutation.isLoading}
          />
        </DialogContent>
      </Dialog>
      <Card>
        <CardContent className="space-y-4 px-2 pt-2 pb-3">
          <TimeRangeSelectionInfo
            selectedHour={selectedHour}
            onHourSelect={onHourSelect}
            selectedDay={selectedDay}
            onDaySelect={onDaySelect}
          />
          {renderCategoryItems(categoriesToShow)}
          {categoriesToHide.length > 0 && (
            <Button
              variant="link"
              className="p-1 px-2 mt-2 w-full h-auto text-xs text-left justify-start text-slate-600 dark:text-slate-400 hover:text-foreground transition-colors flex items-center gap-1"
              onClick={() => setShowSmallCategories(!showSmallCategories)}
            >
              {showSmallCategories
                ? "Show less"
                : `Show ${categoriesToHide.length} more categories`}
              <ChevronDownIcon
                className={`ml-.5 h-4 w-4 transition-transform duration-200 ${
                  showSmallCategories ? "rotate-180" : ""
                }`}
              />
            </Button>
          )}
          <AnimatePresence>
            {showSmallCategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {renderCategoryItems(categoriesToHide)}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Show the note if only Cronus/Electron activities are present */}
          {hasOnlyCronusOrElectron && (
            <Card className="border-dashed mt-4 bg-yellow-50 dark:bg-yellow-900/30">
              <CardContent className="pt-4 pb-3 flex flex-col items-center text-center space-y-2">
                <div className="rounded-full bg-yellow-100 p-2">
                  <ClipboardIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <span className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                    Now open Chrome or other applications to start tracking.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default React.memo(ActivitiesByCategoryWidget);
