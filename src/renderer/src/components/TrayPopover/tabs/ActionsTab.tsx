import {
  Pause,
  Play,
  ExternalLink,
  Settings,
  PanelTop,
  Power,
} from "lucide-react";

interface TrayStatusUpdate {
  dailyProductiveMs: number;
  dailyUnproductiveMs: number;
  totalTrackedMs: number;
  isTrackingPaused: boolean;
}

interface ActionsTabProps {
  statusUpdate: TrayStatusUpdate | null;
  onOpenMainApp: () => void;
  onOpenSettings: () => void;
  onToggleTracking?: () => void;
  onToggleFloatingWidget?: () => void;
  onQuitApp?: () => void;
}

export function ActionsTab({
  statusUpdate,
  onOpenMainApp,
  onOpenSettings,
  onToggleTracking,
  onToggleFloatingWidget,
  onQuitApp,
}: ActionsTabProps) {
  const isTrackingPaused = statusUpdate?.isTrackingPaused ?? false;

  return (
    <div className="space-y-3">
      {/* Tracking Status */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Tracking Status
            </p>
            <p
              className={`text-xs ${isTrackingPaused ? "text-warning" : "text-success"}`}
            >
              {isTrackingPaused ? "Paused" : "Active"}
            </p>
          </div>
          {onToggleTracking && (
            <button
              onClick={onToggleTracking}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isTrackingPaused
                  ? "bg-success/20 hover:bg-success/30 text-success"
                  : "bg-warning/20 hover:bg-warning/30 text-warning"
              }`}
            >
              {isTrackingPaused ? (
                <>
                  <Play size={14} />
                  Resume
                </>
              ) : (
                <>
                  <Pause size={14} />
                  Pause
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Open Main App */}
        <button
          onClick={onOpenMainApp}
          className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
        >
          <ExternalLink size={20} className="text-chart-accent" />
          <span className="text-xs font-medium text-foreground">
            Open Main App
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
        >
          <Settings size={20} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Settings</span>
        </button>

        {/* Floating Widget */}
        {onToggleFloatingWidget && (
          <button
            onClick={onToggleFloatingWidget}
            className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <PanelTop size={20} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              Floating Widget
            </span>
          </button>
        )}

        {/* Quit App */}
        {onQuitApp && (
          <button
            onClick={onQuitApp}
            className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <Power size={20} className="text-destructive" />
            <span className="text-xs font-medium text-destructive">
              Quit App
            </span>
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-2">Keyboard Shortcuts</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Navigate tabs</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">
              Arrow Keys
            </kbd>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Select tab</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">
              Enter
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
