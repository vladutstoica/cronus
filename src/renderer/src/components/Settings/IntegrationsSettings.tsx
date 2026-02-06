/**
 * Integrations Settings Component
 *
 * Allows users to connect Jira and Linear for task tracking integration.
 * Shows current connection status and provides access to the setup wizard.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Plug, Settings2 } from "lucide-react";
import type { TaskProvider } from "../../../../shared/taskTypes";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { WizardContainer } from "../IntegrationWizard/WizardContainer";

interface IntegrationStatus {
  jira: {
    connected: boolean;
    userName?: string;
    email?: string;
  };
  linear: {
    connected: boolean;
    userName?: string;
    email?: string;
  };
}

export function IntegrationsSettings() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus>({
    jira: { connected: false },
    linear: { connected: false },
  });
  const [loading, setLoading] = useState(true);

  // Load integration status on mount
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Check Jira connection
      const jiraResult = await window.electron.ipcRenderer.invoke(
        "integration:has-credentials",
        "jira" as TaskProvider
      );

      // Check Linear connection
      const linearResult = await window.electron.ipcRenderer.invoke(
        "integration:has-credentials",
        "linear" as TaskProvider
      );

      setStatus({
        jira: {
          connected: jiraResult?.hasCredentials ?? false,
          userName: jiraResult?.userName,
          email: jiraResult?.email,
        },
        linear: {
          connected: linearResult?.hasCredentials ?? false,
          userName: linearResult?.userName,
          email: linearResult?.email,
        },
      });
    } catch (error) {
      console.error("Failed to load integration status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleWizardComplete = useCallback(() => {
    // Reload status after wizard completes
    loadStatus();
  }, [loadStatus]);

  const handleDisconnect = useCallback(async (provider: TaskProvider) => {
    try {
      await window.electron.ipcRenderer.invoke(
        "integration:delete-credentials",
        provider
      );
      loadStatus();
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    }
  }, [loadStatus]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug size={20} />
            Task Integrations
          </CardTitle>
          <CardDescription>
            Connect your project management tools to track time against specific tasks.
            Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd+Shift+T</kbd> to quickly select a task.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Jira Integration */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0052CC]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#0052CC]" fill="currentColor">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium">Jira</h4>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : status.jira.connected ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    Connected{status.jira.email ? ` as ${status.jira.email}` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle size={14} className="text-muted-foreground" />
                    Not connected
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status.jira.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect("jira")}
                  className="text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardOpen(true)}
              >
                {status.jira.connected ? <Settings2 size={14} className="mr-1" /> : null}
                {status.jira.connected ? "Reconfigure" : "Connect"}
              </Button>
            </div>
          </div>

          {/* Linear Integration */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#5E6AD2]" fill="currentColor">
                  <path d="M3.004 6.306a9.446 9.446 0 0 0-.406 1.094l13.072 10.33a9.491 9.491 0 0 0 .963-.692L3.004 6.306zm-.69 2.39A9.502 9.502 0 0 0 12 21.5c1.388 0 2.71-.297 3.9-.832L2.314 8.696zM20.496 17.694a9.446 9.446 0 0 0 .406-1.094L7.83 6.27a9.491 9.491 0 0 0-.963.692l13.629 10.732zM21.186 15.304A9.502 9.502 0 0 0 12 2.5c-1.388 0-2.71.297-3.9.832l13.086 11.972z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium">Linear</h4>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : status.linear.connected ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    Connected{status.linear.userName ? ` as ${status.linear.userName}` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle size={14} className="text-muted-foreground" />
                    Not connected
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status.linear.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect("linear")}
                  className="text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardOpen(true)}
              >
                {status.linear.connected ? <Settings2 size={14} className="mr-1" /> : null}
                {status.linear.connected ? "Reconfigure" : "Connect"}
              </Button>
            </div>
          </div>

          {/* Setup Wizard Button */}
          {!status.jira.connected && !status.linear.connected && (
            <Button
              onClick={() => setWizardOpen(true)}
              className="w-full"
            >
              <Plug size={16} className="mr-2" />
              Set Up Integrations
            </Button>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Integrations allow you to select tasks from Jira or Linear and track time against them.
            Your credentials are stored securely on your device using encrypted storage.
          </p>
        </CardContent>
      </Card>

      {/* Integration Wizard Dialog */}
      <WizardContainer
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}
