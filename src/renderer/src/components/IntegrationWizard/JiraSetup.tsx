/**
 * Jira Setup Step
 *
 * Form for configuring Jira integration credentials including
 * instance URL, email, and API token.
 */

import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { ConnectionTestResult, JiraCredentials } from "./types";

interface JiraSetupProps {
  credentials: JiraCredentials;
  onCredentialsChange: (credentials: JiraCredentials) => void;
  connectionStatus: ConnectionTestResult;
  onTestConnection: () => Promise<void>;
  onSaveCredentials: () => Promise<void>;
}

export function JiraSetup({
  credentials,
  onCredentialsChange,
  connectionStatus,
  onTestConnection,
  onSaveCredentials,
}: JiraSetupProps) {
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid =
    credentials.instanceUrl.trim() !== "" &&
    credentials.email.trim() !== "" &&
    credentials.apiToken.trim() !== "";

  const isTesting = connectionStatus.status === "testing";
  const isSuccess = connectionStatus.status === "success";
  const isError = connectionStatus.status === "error";

  const handleTestConnection = async () => {
    if (!isFormValid || isTesting) return;
    await onTestConnection();
  };

  const handleSave = async () => {
    if (!isSuccess || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveCredentials();
    } finally {
      setIsSaving(false);
    }
  };

  // Normalize instance URL (remove protocol and trailing slashes)
  const normalizeInstanceUrl = (url: string): string => {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .trim();
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Connect Jira</h2>
        <p className="text-muted-foreground">
          Enter your Jira credentials to connect your account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Instance URL */}
        <div className="space-y-2">
          <Label htmlFor="jira-instance">Jira Instance URL</Label>
          <Input
            id="jira-instance"
            type="text"
            placeholder="mycompany.atlassian.net"
            value={credentials.instanceUrl}
            onChange={(e) =>
              onCredentialsChange({
                ...credentials,
                instanceUrl: normalizeInstanceUrl(e.target.value),
              })
            }
            disabled={isTesting}
            aria-describedby="jira-instance-hint"
          />
          <p id="jira-instance-hint" className="text-xs text-muted-foreground">
            Your Atlassian domain (e.g., mycompany.atlassian.net)
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="jira-email">Email Address</Label>
          <Input
            id="jira-email"
            type="email"
            placeholder="you@company.com"
            value={credentials.email}
            onChange={(e) =>
              onCredentialsChange({
                ...credentials,
                email: e.target.value.trim(),
              })
            }
            disabled={isTesting}
            aria-describedby="jira-email-hint"
          />
          <p id="jira-email-hint" className="text-xs text-muted-foreground">
            The email address associated with your Jira account
          </p>
        </div>

        {/* API Token */}
        <div className="space-y-2">
          <Label htmlFor="jira-token">API Token</Label>
          <Input
            id="jira-token"
            type="password"
            placeholder="Enter your API token"
            value={credentials.apiToken}
            onChange={(e) =>
              onCredentialsChange({
                ...credentials,
                apiToken: e.target.value,
              })
            }
            disabled={isTesting}
            aria-describedby="jira-token-hint"
          />
          <p id="jira-token-hint" className="text-xs text-muted-foreground">
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Generate an API token
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            from your Atlassian account settings
          </p>
        </div>
      </div>

      {/* Connection Status */}
      {(isSuccess || isError) && (
        <div
          className={cn(
            "p-4 rounded-lg flex items-start gap-3",
            isSuccess && "bg-green-500/10 text-green-600 dark:text-green-400",
            isError && "bg-destructive/10 text-destructive",
          )}
          role="alert"
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {isSuccess ? "Connection successful!" : "Connection failed"}
            </p>
            {connectionStatus.message && (
              <p className="text-sm mt-1 opacity-90">
                {connectionStatus.message}
              </p>
            )}
            {isSuccess && connectionStatus.userName && (
              <p className="text-sm mt-1 opacity-90">
                Connected as: {connectionStatus.userName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleTestConnection}
          disabled={!isFormValid || isTesting}
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {isSuccess && (
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
