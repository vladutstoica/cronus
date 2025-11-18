import { memo, useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { AISettings } from "./Settings/AISettings";
import { CategoryManagementSettings } from "./Settings/CategoryManagementSettings";
import { DistractionSoundSettings } from "./Settings/DistractionSoundSettings";
import GoalInputForm from "./Settings/GoalInputForm";
import { ManualUpdateSettings } from "./Settings/ManualUpdateSettings";
import { MultiPurposeAppsSettings } from "./Settings/MultiPurposeAppsSettings";
import PauseTrackingSettings from "./Settings/PauseTrackingSettings";
import { PermissionsStatus } from "./Settings/PermissionsStatus";
import { ThemeSwitcher } from "./Settings/ThemeSwitcher";
import { AppInformation } from "./Settings/VersionDisplay";

interface SettingsPageProps {
  onResetOnboarding: () => void;
  isTrackingPaused: boolean;
  onToggleTracking: () => void;
}

export const SettingsPage = memo(function SettingsPage({
  onResetOnboarding,
  isTrackingPaused,
  onToggleTracking,
}: SettingsPageProps) {
  const { user } = useAuth();
  const { focusOn, setFocusOn } = useSettings();
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    if (focusOn === "goal-input" || focusOn === "pause-tracking") {
      // The focusing logic will be inside the respective components
      // We reset the focus request here after a short delay
      // to allow the component to render and focus.
      setTimeout(() => setFocusOn(null), 100);
    }
  }, [focusOn, setFocusOn]);

  // By wrapping this in useCallback, we ensure the function reference doesn't
  // change on re-renders, preventing unnecessary re-renders of AppInformation.
  const handleShowPermissions = useCallback(() => {
    setShowPermissions((v) => !v);
  }, []);

  console.log("SettingsPage re-rendered");

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 p-2 pt-0 pb-4">
      <div className="space-y-4">
        <GoalInputForm shouldFocus={focusOn === "goal-input"} />
        <AISettings />
        <CategoryManagementSettings />
        <PauseTrackingSettings
          isTrackingPaused={isTrackingPaused}
          onToggleTracking={onToggleTracking}
          shouldFocus={focusOn === "pause-tracking"}
        />
        <DistractionSoundSettings />
        <MultiPurposeAppsSettings />
        <ThemeSwitcher />
        <ManualUpdateSettings />
        <AppInformation onShowPermissions={handleShowPermissions} />
        {showPermissions && <PermissionsStatus />}
      </div>
    </div>
  );
});
