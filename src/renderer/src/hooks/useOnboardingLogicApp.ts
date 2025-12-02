import { useCallback, useEffect, useState } from "react";

interface UseOnboardingLogicProps {
  permissionsChecked: boolean; // Whether accessibility permission check has completed
  missingAccessibilityPermissions: boolean;
}

interface UseOnboardingLogicReturn {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  handleOnboardingComplete: () => void;
  handleResetOnboarding: () => void;
}

export function useOnboardingLogic({
  permissionsChecked,
  missingAccessibilityPermissions,
}: UseOnboardingLogicProps): UseOnboardingLogicReturn {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Initialize tracking when onboarding is complete (safety net for app restarts)
  useEffect(() => {
    const hasCompletedOnboarding =
      localStorage.getItem("hasCompletedOnboarding") === "true";

    if (hasCompletedOnboarding) {
      console.log(
        "[Permissions] Onboarding complete, initializing tracking...",
      );

      const initializeTracking = async () => {
        try {
          await window.api.enablePermissionRequests();
          // Add delay to ensure native flag is set before starting tracking
          await new Promise((resolve) => setTimeout(resolve, 500));
          await window.api.startWindowTracking();
          console.log("[Permissions] Window tracking initialized");
        } catch (error) {
          console.error("[Permissions] Failed to initialize tracking:", error);
        }
      };

      initializeTracking();
    }
  }, []);

  // Show onboarding only if user hasn't completed it locally
  useEffect(() => {
    if (!permissionsChecked) {
      return; // Wait for permission check to complete
    }

    const hasCompletedOnboardingLocally =
      localStorage.getItem("hasCompletedOnboarding") === "true";

    if (!hasCompletedOnboardingLocally) {
      setShowOnboarding(true);
    } else {
      // User has completed onboarding, check if they've seen the tutorial
      const hasSeenTutorial =
        localStorage.getItem("hasSeenTutorial") === "true";
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    }
  }, [permissionsChecked, missingAccessibilityPermissions]);

  const handleOnboardingComplete = useCallback((): void => {
    setShowOnboarding(false);
    localStorage.setItem("hasCompletedOnboarding", "true");

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke("set-open-at-login", true);
      window.electron.ipcRenderer.invoke("enable-permission-requests");
    }

    setShowTutorial(true);
  }, []);

  const handleResetOnboarding = useCallback((): void => {
    setShowOnboarding(true);
    localStorage.removeItem("hasCompletedOnboarding");
  }, []);

  return {
    showOnboarding,
    setShowOnboarding,
    showTutorial,
    setShowTutorial,
    handleOnboardingComplete,
    handleResetOnboarding,
  };
}
