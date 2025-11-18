import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface UseOnboardingLogicProps {
  permissionsChecked: boolean; // Whether accessibility permission check has completed
  missingAccessibilityPermissions: boolean;
  isAuthenticated: boolean;
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
  isAuthenticated,
}: UseOnboardingLogicProps): UseOnboardingLogicReturn {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Override localStorage methods to track hasCompletedOnboarding changes
  useEffect(() => {
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;

    localStorage.setItem = function (key: string, value: string) {
      if (key === "hasCompletedOnboarding") {
        console.log(
          "🔍 [PERMISSIONS DEBUG] localStorage.setItem called for hasCompletedOnboarding",
        );
      }
      return originalSetItem.call(this, key, value);
    };

    localStorage.removeItem = function (key: string) {
      if (key === "hasCompletedOnboarding") {
        console.log(
          "🔍 [PERMISSIONS DEBUG] localStorage.removeItem called for hasCompletedOnboarding",
        );
      }
      return originalRemoveItem.call(this, key);
    };

    localStorage.clear = function () {
      console.log("🔍 [PERMISSIONS DEBUG] localStorage.clear called");
      return originalClear.call(this);
    };

    return () => {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      localStorage.clear = originalClear;
    };
  }, []);

  // Initialize tracking for authenticated users with completed onboarding (safety net for app restarts)
  useEffect(() => {
    const hasCompletedOnboarding =
      localStorage.getItem("hasCompletedOnboarding") === "true";

    console.log(
      "🔍 [PERMISSIONS DEBUG] app.tsx is loading (empty useEffect) with isAuthenticated:",
      isAuthenticated,
      "and hasCompletedOnboarding:",
      hasCompletedOnboarding,
    );

    if (isAuthenticated && hasCompletedOnboarding) {
      console.log(
        "🔍 [PERMISSIONS DEBUG] App is loaded, user is authenticated and has completed onboarding. Starting permission requests and window tracking as safety net.",
      );

      // RE-ENABLED: These API calls are crucial for app restarts and as safeguard
      // OnboardingModal calls these during initial completion, but we need them on every app start
      // for existing users who restart the app
      const initializeTracking = async () => {
        try {
          console.log(
            "🔍 [PERMISSIONS DEBUG] Calling enablePermissionRequests()",
          );
          await window.api.enablePermissionRequests();

          // Add delay to ensure native _explicitPermissionDialogsEnabled flag is properly set
          // This prevents Chrome Apple Events permission race condition
          console.log(
            "🔍 [PERMISSIONS DEBUG] Adding 500ms delay before startWindowTracking()",
          );
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log("🔍 [PERMISSIONS DEBUG] Calling startWindowTracking()");
          await window.api.startWindowTracking();

          console.log(
            "✅ [PERMISSIONS DEBUG] Window tracking initialization completed successfully",
          );
        } catch (error) {
          console.error(
            "❌ [PERMISSIONS DEBUG] Failed to initialize window tracking:",
            error,
          );
        }
      };

      initializeTracking();
    }
  }, []);

  // Show onboarding only if user hasn't completed it locally (Electron app should show onboarding on each fresh install)
  useEffect(() => {
    console.log("🔍 [ONBOARDING DEBUG] useEffect triggered", {
      permissionsChecked,
      missingAccessibilityPermissions,
      user: user?.email,
      userHasCompletedOnboarding: user?.hasCompletedOnboarding,
      stack: new Error().stack,
    });

    if (!permissionsChecked) {
      console.log("🔍 [ONBOARDING DEBUG] Waiting for permissions check");
      return; // Wait for permission check to complete
    }

    // For Electron app, only check localStorage since users might reinstall on different computers
    // and need to grant permissions again. Server-side flag is kept for consistency but not used for decision.
    const hasCompletedOnboardingLocally =
      localStorage.getItem("hasCompletedOnboarding") === "true";

    console.log(
      "🔍 [ONBOARDING DEBUG] Checking onboarding status (localStorage only)",
      {
        hasCompletedOnboardingLocally,
        localStorageValue: localStorage.getItem("hasCompletedOnboarding"),
        allLocalStorageKeys: Object.keys(localStorage),
        serverSideFlag: user?.hasCompletedOnboarding,
        note: "Using localStorage only for Electron app onboarding decision",
      },
    );

    // Show onboarding only if it hasn't been completed locally
    // Note: Permissions are handled within the onboarding flow itself
    if (!hasCompletedOnboardingLocally) {
      console.log(
        "🚨 [ONBOARDING DEBUG] SHOWING ONBOARDING - not completed locally",
        {
          hasCompletedOnboardingLocally,
          missingAccessibilityPermissions,
          stack: new Error().stack,
        },
      );
      setShowOnboarding(true);
    } else {
      console.log(
        "🔍 [ONBOARDING DEBUG] Onboarding completed locally, checking tutorial",
      );
      // User has completed onboarding, check if they've seen the tutorial
      const hasSeenTutorial =
        localStorage.getItem("hasSeenTutorial") === "true";
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    }
  }, [permissionsChecked, missingAccessibilityPermissions, user]);

  const handleOnboardingComplete = useCallback((): void => {
    console.log(
      "🔍 [ONBOARDING DEBUG] handleOnboardingComplete called - starting completion process",
    );

    setShowOnboarding(false);
    console.log("🔍 [ONBOARDING DEBUG] Set showOnboarding to false");

    // Set the local storage flag to mark onboarding as completed
    const previousValue = localStorage.getItem("hasCompletedOnboarding");
    localStorage.setItem("hasCompletedOnboarding", "true");
    console.log(
      "🔍 [ONBOARDING DEBUG] localStorage hasCompletedOnboarding set to true",
      {
        previousValue,
        newValue: localStorage.getItem("hasCompletedOnboarding"),
        timestamp: new Date().toISOString(),
      },
    );

    if (window.electron?.ipcRenderer) {
      console.log(
        "🔍 [PERMISSIONS DEBUG] Setting open at login to true and enabling permission requests",
      );
      window.electron.ipcRenderer.invoke("set-open-at-login", true);
      // Enable permission requests now that onboarding is complete
      window.electron.ipcRenderer.invoke("enable-permission-requests");
    }

    console.log("🔍 [ONBOARDING DEBUG] Setting tutorial to show");
    setShowTutorial(true);

    console.log(
      "🔍 [ONBOARDING DEBUG] handleOnboardingComplete completed successfully",
    );
  }, []);

  const handleResetOnboarding = useCallback((): void => {
    console.log("🔍 [PERMISSIONS DEBUG] Resetting onboarding");
    setShowOnboarding(true);
    // Remove the local storage flag to allow onboarding to show again
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
