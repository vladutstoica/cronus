import { memo, useCallback, useEffect, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { AISettings } from "./Settings/AISettings";
import { CategoryManagementSettings } from "./Settings/CategoryManagementSettings";
import { DistractionSoundSettings } from "./Settings/DistractionSoundSettings";
import GoalInputForm from "./Settings/GoalInputForm";
import { ManualUpdateSettings } from "./Settings/ManualUpdateSettings";
import { MultiPurposeAppsSettings } from "./Settings/MultiPurposeAppsSettings";
import PauseTrackingSettings from "./Settings/PauseTrackingSettings";
import { PermissionsStatus } from "./Settings/PermissionsStatus";
import {
  SettingsSidebar,
  SettingsSection,
} from "./Settings/SettingsSidebar";
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
  const { focusOn, setFocusOn } = useSettings();
  const [showPermissions, setShowPermissions] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

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

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-4">
            <GoalInputForm shouldFocus={focusOn === "goal-input"} />
            <AISettings />
            <PauseTrackingSettings
              isTrackingPaused={isTrackingPaused}
              onToggleTracking={onToggleTracking}
              shouldFocus={focusOn === "pause-tracking"}
            />
          </div>
        );
      case "categories":
        return <CategoryManagementSettings />;
      case "appearance":
        return (
          <div className="space-y-4">
            <ThemeSwitcher />
            <DistractionSoundSettings />
          </div>
        );
      case "apps":
        return <MultiPurposeAppsSettings />;
      case "about":
        return (
          <div className="space-y-4">
            <AppInformation onShowPermissions={handleShowPermissions} />
            <ManualUpdateSettings />
            {showPermissions && <PermissionsStatus />}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="p-4 pr-2 border-r border-border">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 p-4 pt-4 pb-4">
        {renderContent()}
      </div>
    </div>
  );
});
