import { useState } from "react";
import { localApi } from "../lib/localApi";

interface UseOnboardingCompletionProps {
  steps: Array<{ id: string }>;
}

export function useOnboardingCompletion({
  steps,
}: UseOnboardingCompletionProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (
    referralSource: string,
    onComplete: () => void,
    selectedTemplate?: string | null,
  ) => {
    console.log(
      "🔍 [ONBOARDING MODAL DEBUG] handleComplete called - starting onboarding completion",
    );
    setIsCompleting(true);

    if (referralSource.trim()) {
      console.log(
        "🔍 [ONBOARDING MODAL DEBUG] Updating referral source:",
        referralSource,
      );
      try {
        await localApi.user.update({
          referral_source: referralSource,
        });
        console.log(
          "✅ [ONBOARDING MODAL DEBUG] Referral source updated successfully.",
        );
      } catch (error) {
        console.error(
          "❌ [ONBOARDING MODAL DEBUG] Failed to update referral source:",
          error,
        );
      }
    }

    // Apply selected template if one was chosen
    if (selectedTemplate) {
      console.log(
        "🔍 [ONBOARDING MODAL DEBUG] Applying template:",
        selectedTemplate,
      );
      try {
        const result = await window.api.applyTemplate(selectedTemplate);
        if (result.success) {
          console.log(
            "✅ [ONBOARDING MODAL DEBUG] Template applied successfully:",
            result,
          );
        } else {
          console.error(
            "❌ [ONBOARDING MODAL DEBUG] Failed to apply template:",
            result.error,
          );
        }
      } catch (error) {
        console.error(
          "❌ [ONBOARDING MODAL DEBUG] Failed to apply template:",
          error,
        );
      }
    }

    console.log("🔍 [ONBOARDING MODAL DEBUG] Starting window tracking");
    try {
      await window.api.enablePermissionRequests();
      console.log(
        "🔍 [ONBOARDING MODAL DEBUG] Permission requests enabled, adding delay before starting tracking",
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      await window.api.startWindowTracking();
      console.log(
        "🔍 [ONBOARDING MODAL DEBUG] Window tracking started successfully",
      );
    } catch (error) {
      console.error(
        "❌ [ONBOARDING MODAL DEBUG] Failed to start window tracking:",
        error,
      );
    }

    // PostHog has been removed - no analytics tracking

    console.log(
      "🔍 [ONBOARDING MODAL DEBUG] Calling onComplete callback in 500ms",
    );
    setTimeout(() => {
      console.log(
        "🔍 [ONBOARDING MODAL DEBUG] Executing onComplete callback now",
      );
      onComplete();
    }, 500);
  };

  return {
    isCompleting,
    handleComplete,
  };
}
