import { WorkGoalImprovementHint } from "../components/ActivityList/WorkGoalImprovementHint";
import { toast } from "../hooks/use-toast";

interface ActivityMovedToastProps {
  activityIdentifier: string | number;
  targetCategoryName: string;
  timeRangeDescription: string;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setFocusOn: (focusOn: string | null) => void;
}

export const showActivityMovedToast = ({
  activityIdentifier,
  targetCategoryName,
  timeRangeDescription,
  setIsSettingsOpen,
  setFocusOn,
}: ActivityMovedToastProps) => {
  const isBulk = typeof activityIdentifier === "number";
  const title = isBulk ? "Activities Moved" : "Activity Moved";
  const duration = 2500;

  let description;

  if (isBulk) {
    description = (
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {activityIdentifier}
        </span>{" "}
        activities moved to{" "}
        <span className="font-semibold text-foreground">
          {targetCategoryName}
        </span>{" "}
        for {timeRangeDescription}.
      </div>
    );
  } else {
    const truncatedIdentifier =
      String(activityIdentifier).length > 40
        ? `${String(activityIdentifier).substring(0, 40)}...`
        : activityIdentifier;
    description = (
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {truncatedIdentifier}
        </span>{" "}
        moved to{" "}
        <span className="font-semibold text-foreground">
          {targetCategoryName}
        </span>{" "}
        for {timeRangeDescription}
      </div>
    );
  }

  toast({
    title: title,
    duration: duration,
    description: (
      <div className="flex flex-col gap-2">
        {description}
        <WorkGoalImprovementHint
          setIsSettingsOpen={setIsSettingsOpen}
          setFocusOn={setFocusOn}
        />
      </div>
    ),
  });
};
