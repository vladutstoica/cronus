/**
 * Linear Setup Step
 *
 * Form for configuring Linear integration credentials
 * using an API key.
 */

import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { ConnectionTestResult, LinearCredentials } from "./types";

interface LinearSetupProps {
  credentials: LinearCredentials;
  onCredentialsChange: (credentials: LinearCredentials) => void;
  connectionStatus: ConnectionTestResult;
  onTestConnection: () => Promise<void>;
  onSaveCredentials: () => Promise<void>;
}

export function LinearSetup({
  credentials,
  onCredentialsChange,
  connectionStatus,
  onTestConnection,
  onSaveCredentials,
}: LinearSetupProps) {
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = credentials.apiKey.trim() !== "";

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

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Connect Linear</h2>
        <p className="text-muted-foreground">
          Enter your Linear API key to connect your workspace.
        </p>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="linear-api-key">API Key</Label>
          <Input
            id="linear-api-key"
            type="password"
            placeholder="lin_api_..."
            value={credentials.apiKey}
            onChange={(e) =>
              onCredentialsChange({
                ...credentials,
                apiKey: e.target.value,
              })
            }
            disabled={isTesting}
            aria-describedby="linear-api-key-hint"
          />
          <p id="linear-api-key-hint" className="text-xs text-muted-foreground">
            <a
              href="https://linear.app/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Generate an API key
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            from your Linear settings. Create a personal API key with read/write
            access.
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
