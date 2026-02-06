/**
 * Integration Wizard Container
 *
 * Multi-step wizard modal for setting up Jira and/or Linear integrations.
 * Manages wizard state and navigation between steps.
 */

import { useCallback, useMemo, useState } from "react";
import type { TaskProvider } from "../../../../shared/taskTypes";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CompletionStep } from "./CompletionStep";
import { JiraSetup } from "./JiraSetup";
import { LinearSetup } from "./LinearSetup";
import { ProviderSelection } from "./ProviderSelection";
import type {
  ConnectionTestResult,
  JiraCredentials,
  LinearCredentials,
  ProviderSelectionState,
  WizardStep,
} from "./types";

interface WizardContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const INITIAL_JIRA_CREDENTIALS: JiraCredentials = {
  instanceUrl: "",
  email: "",
  apiToken: "",
};

const INITIAL_LINEAR_CREDENTIALS: LinearCredentials = {
  apiKey: "",
};

const INITIAL_CONNECTION_STATUS: ConnectionTestResult = {
  status: "idle",
};

export function WizardContainer({
  open,
  onOpenChange,
  onComplete,
}: WizardContainerProps) {
  // Wizard state
  const [currentStep, setCurrentStep] =
    useState<WizardStep>("provider-selection");
  const [selectedProviders, setSelectedProviders] =
    useState<ProviderSelectionState>({
      jira: false,
      linear: false,
    });
  const [jiraCredentials, setJiraCredentials] = useState<JiraCredentials>(
    INITIAL_JIRA_CREDENTIALS,
  );
  const [linearCredentials, setLinearCredentials] = useState<LinearCredentials>(
    INITIAL_LINEAR_CREDENTIALS,
  );
  const [jiraConnectionStatus, setJiraConnectionStatus] =
    useState<ConnectionTestResult>(INITIAL_CONNECTION_STATUS);
  const [linearConnectionStatus, setLinearConnectionStatus] =
    useState<ConnectionTestResult>(INITIAL_CONNECTION_STATUS);
  const [jiraSaved, setJiraSaved] = useState(false);
  const [linearSaved, setLinearSaved] = useState(false);

  // Determine which steps to show based on selection
  const steps = useMemo<WizardStep[]>(() => {
    const result: WizardStep[] = ["provider-selection"];
    if (selectedProviders.jira) result.push("jira-setup");
    if (selectedProviders.linear) result.push("linear-setup");
    result.push("completion");
    return result;
  }, [selectedProviders.jira, selectedProviders.linear]);

  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const hasAnySelection = selectedProviders.jira || selectedProviders.linear;

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setCurrentStep("provider-selection");
    setSelectedProviders({ jira: false, linear: false });
    setJiraCredentials(INITIAL_JIRA_CREDENTIALS);
    setLinearCredentials(INITIAL_LINEAR_CREDENTIALS);
    setJiraConnectionStatus(INITIAL_CONNECTION_STATUS);
    setLinearConnectionStatus(INITIAL_CONNECTION_STATUS);
    setJiraSaved(false);
    setLinearSaved(false);
  }, []);

  // Handle dialog close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset wizard when closing
        resetWizard();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetWizard],
  );

  // Provider toggle
  const handleProviderToggle = useCallback((provider: TaskProvider) => {
    setSelectedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  }, []);

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  }, [currentStepIndex, steps]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  }, [currentStepIndex, steps]);

  const handleSkip = useCallback(() => {
    // Skip to completion
    setCurrentStep("completion");
  }, []);

  const handleComplete = useCallback(() => {
    handleOpenChange(false);
    onComplete?.();
  }, [handleOpenChange, onComplete]);

  // Jira connection test
  const handleTestJiraConnection = useCallback(async () => {
    setJiraConnectionStatus({ status: "testing" });

    try {
      // First save credentials temporarily to test them
      const saveResult = await window.electron.ipcRenderer.invoke(
        "integration:save-credentials",
        {
          provider: "jira" as TaskProvider,
          authType: "api_token",
          apiToken: jiraCredentials.apiToken,
          email: jiraCredentials.email,
          baseUrl: `https://${jiraCredentials.instanceUrl}`,
        },
      );

      if (saveResult.verification?.success) {
        setJiraConnectionStatus({
          status: "success",
          message: "Connected successfully",
          userName:
            saveResult.verification.userName || saveResult.verification.email,
        });
      } else {
        setJiraConnectionStatus({
          status: "error",
          message:
            saveResult.verification?.error ||
            "Failed to verify credentials. Please check your details.",
        });
      }
    } catch (error) {
      setJiraConnectionStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  }, [jiraCredentials]);

  // Jira save (credentials are already saved during test, just mark as saved)
  const handleSaveJiraCredentials = useCallback(async () => {
    setJiraSaved(true);
    handleNext();
  }, [handleNext]);

  // Linear connection test
  const handleTestLinearConnection = useCallback(async () => {
    setLinearConnectionStatus({ status: "testing" });

    try {
      const saveResult = await window.electron.ipcRenderer.invoke(
        "integration:save-credentials",
        {
          provider: "linear" as TaskProvider,
          authType: "api_token",
          apiToken: linearCredentials.apiKey,
        },
      );

      if (saveResult.verification?.success) {
        setLinearConnectionStatus({
          status: "success",
          message: "Connected successfully",
          userName:
            saveResult.verification.userName || saveResult.verification.email,
        });
      } else {
        setLinearConnectionStatus({
          status: "error",
          message:
            saveResult.verification?.error ||
            "Failed to verify credentials. Please check your API key.",
        });
      }
    } catch (error) {
      setLinearConnectionStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  }, [linearCredentials]);

  // Linear save
  const handleSaveLinearCredentials = useCallback(async () => {
    setLinearSaved(true);
    handleNext();
  }, [handleNext]);

  // Step titles
  const stepTitles: Record<WizardStep, string> = {
    "provider-selection": "Select Providers",
    "jira-setup": "Jira Setup",
    "linear-setup": "Linear Setup",
    completion: "Complete",
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "provider-selection":
        return (
          <ProviderSelection
            selectedProviders={selectedProviders}
            onProviderToggle={handleProviderToggle}
          />
        );
      case "jira-setup":
        return (
          <JiraSetup
            credentials={jiraCredentials}
            onCredentialsChange={setJiraCredentials}
            connectionStatus={jiraConnectionStatus}
            onTestConnection={handleTestJiraConnection}
            onSaveCredentials={handleSaveJiraCredentials}
          />
        );
      case "linear-setup":
        return (
          <LinearSetup
            credentials={linearCredentials}
            onCredentialsChange={setLinearCredentials}
            connectionStatus={linearConnectionStatus}
            onTestConnection={handleTestLinearConnection}
            onSaveCredentials={handleSaveLinearCredentials}
          />
        );
      case "completion":
        return (
          <CompletionStep
            selectedProviders={selectedProviders}
            jiraConnectionStatus={jiraConnectionStatus}
            linearConnectionStatus={linearConnectionStatus}
          />
        );
      default:
        return null;
    }
  };

  // Check if we can proceed from current step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case "provider-selection":
        return hasAnySelection;
      case "jira-setup":
        return jiraSaved || jiraConnectionStatus.status === "success";
      case "linear-setup":
        return linearSaved || linearConnectionStatus.status === "success";
      case "completion":
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    hasAnySelection,
    jiraSaved,
    jiraConnectionStatus.status,
    linearSaved,
    linearConnectionStatus.status,
  ]);

  // Check if skip is available
  const canSkip = useMemo(() => {
    return currentStep === "jira-setup" || currentStep === "linear-setup";
  }, [currentStep]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Integration Setup Wizard</DialogTitle>
          <DialogDescription>
            Connect your project management tools to Cronus
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span className="text-sm font-medium">
              {stepTitles[currentStep]}
            </span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#213BF7] to-[#8593FB] h-2 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  // Only allow going back to completed steps
                  if (index < currentStepIndex) {
                    goToStep(step);
                  }
                }}
                disabled={index > currentStepIndex}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors",
                  index < currentStepIndex &&
                    "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90",
                  index === currentStepIndex &&
                    "bg-primary text-primary-foreground",
                  index > currentStepIndex &&
                    "bg-muted text-muted-foreground cursor-not-allowed",
                )}
                aria-label={`Go to step ${index + 1}: ${stepTitles[step]}`}
                aria-current={index === currentStepIndex ? "step" : undefined}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4">{renderStepContent()}</div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {!isFirstStep && !isLastStep && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canSkip && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}

            {isLastStep ? (
              <Button onClick={handleComplete}>Done</Button>
            ) : currentStep === "provider-selection" ? (
              <Button onClick={handleNext} disabled={!canProceed}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
