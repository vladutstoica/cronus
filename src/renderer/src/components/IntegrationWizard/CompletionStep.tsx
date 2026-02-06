/**
 * Completion Step
 *
 * Final step showing a summary of connected integrations
 * with a link to settings for future modifications.
 */

import { CheckCircle2, Settings, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ProviderSelectionState, ConnectionTestResult } from "./types";

// SVG icons for providers (matching ProviderSelection)
const JiraIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn("w-6 h-6", className)}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23 0z" />
  </svg>
);

const LinearIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn("w-6 h-6", className)}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3.532 12.87a9.194 9.194 0 0 1-.5-2.378L.014 13.51c.1 1.44.465 2.81 1.065 4.066l2.453-4.706zm.638-3.49c.122-.508.28-1.002.473-1.479L1.72 5.078a11.893 11.893 0 0 0-1.24 3.574l3.69.729zM12 2.805c.37 0 .735.02 1.097.058l2.023-3.014A12.03 12.03 0 0 0 12 0c-.98 0-1.936.117-2.848.339l.717 3.933c.7-.303 1.47-.467 2.13-.467zm6.535 1.52a9.17 9.17 0 0 1 1.65 1.49l2.935-2.17a11.944 11.944 0 0 0-2.936-2.618l-1.649 3.298zm3.95 5.198a9.097 9.097 0 0 1 .315 2.377l3.019 2.023c.119-1.05.12-2.115.003-3.167l-3.337-1.233zm-1.45 7.006a9.19 9.19 0 0 1-1.195 1.756l1.825 3.3a11.905 11.905 0 0 0 2.267-3.133l-2.897-1.923zm-4.988 4.05a9.252 9.252 0 0 1-2.147.621l-.32 3.783c1.38-.096 2.72-.413 3.98-.928l-1.513-3.476zm-7.595-1.102a9.118 9.118 0 0 1-1.717-1.193l-2.886 1.967a11.88 11.88 0 0 0 3.096 2.24l1.507-3.014zM12 18.205a6.205 6.205 0 1 1 0-12.41 6.205 6.205 0 0 1 0 12.41z" />
  </svg>
);

interface IntegrationSummaryProps {
  provider: "jira" | "linear";
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  userName?: string;
}

function IntegrationSummary({
  name,
  icon,
  isConnected,
  userName,
}: IntegrationSummaryProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border",
        isConnected
          ? "border-green-500/30 bg-green-500/5"
          : "border-border bg-muted/50",
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg",
          isConnected
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{name}</p>
        {isConnected && userName && (
          <p className="text-sm text-muted-foreground">
            Connected as {userName}
          </p>
        )}
        {!isConnected && (
          <p className="text-sm text-muted-foreground">Not connected</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {isConnected ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

interface CompletionStepProps {
  selectedProviders: ProviderSelectionState;
  jiraConnectionStatus: ConnectionTestResult;
  linearConnectionStatus: ConnectionTestResult;
}

export function CompletionStep({
  selectedProviders,
  jiraConnectionStatus,
  linearConnectionStatus,
}: CompletionStepProps) {
  const jiraConnected =
    selectedProviders.jira && jiraConnectionStatus.status === "success";
  const linearConnected =
    selectedProviders.linear && linearConnectionStatus.status === "success";

  const anyConnected = jiraConnected || linearConnected;

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        {anyConnected ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Setup Complete!
            </h2>
            <p className="text-muted-foreground">
              Your integrations are now connected. You can start tracking time
              against your tasks.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground">
              No Integrations Connected
            </h2>
            <p className="text-muted-foreground">
              You can set up integrations later from the settings page.
            </p>
          </>
        )}
      </div>

      {/* Integration Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Integration Status
        </h3>

        {selectedProviders.jira && (
          <IntegrationSummary
            provider="jira"
            name="Jira"
            icon={<JiraIcon />}
            isConnected={jiraConnected}
            userName={jiraConnectionStatus.userName}
          />
        )}

        {selectedProviders.linear && (
          <IntegrationSummary
            provider="linear"
            name="Linear"
            icon={<LinearIcon />}
            isConnected={linearConnected}
            userName={linearConnectionStatus.userName}
          />
        )}

        {!selectedProviders.jira && !selectedProviders.linear && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No providers were selected
          </p>
        )}
      </div>

      {/* Settings hint */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
        <Settings className="w-4 h-4" />
        <span>You can modify integrations anytime in Settings</span>
      </div>
    </div>
  );
}
