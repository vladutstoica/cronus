export function WorkGoalImprovementHint({
  setIsSettingsOpen,
  setFocusOn,
}: {
  setIsSettingsOpen: (open: boolean) => void;
  setFocusOn: (field: string) => void;
}) {
  return (
    <div className="text-sm text-muted-foreground">
      Make your{" "}
      <button
        onClick={() => {
          setIsSettingsOpen(true);
          setFocusOn("goal-input");
        }}
        className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        Work & Goals
      </button>{" "}
      setting more specific for better AI categorization.
    </div>
  );
}
