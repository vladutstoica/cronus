/**
 * Types for the Integration Setup Wizard
 */

import type { TaskProvider } from "../../../../shared/taskTypes";

/** Wizard step identifiers */
export type WizardStep =
  | "provider-selection"
  | "jira-setup"
  | "linear-setup"
  | "completion";

/** Provider selection state */
export interface ProviderSelectionState {
  jira: boolean;
  linear: boolean;
}

/** Jira credentials form data */
export interface JiraCredentials {
  instanceUrl: string;
  email: string;
  apiToken: string;
}

/** Linear credentials form data */
export interface LinearCredentials {
  apiKey: string;
}

/** Connection test status */
export type ConnectionStatus = "idle" | "testing" | "success" | "error";

/** Connection test result */
export interface ConnectionTestResult {
  status: ConnectionStatus;
  message?: string;
  userName?: string;
}

/** Wizard state */
export interface WizardState {
  currentStep: WizardStep;
  selectedProviders: ProviderSelectionState;
  jiraCredentials: JiraCredentials;
  linearCredentials: LinearCredentials;
  jiraConnectionStatus: ConnectionTestResult;
  linearConnectionStatus: ConnectionTestResult;
}

/** Provider info for display */
export interface ProviderInfo {
  id: TaskProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
}

/** Props for step components */
export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
}
