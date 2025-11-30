import { useMemo } from "react";

// Import curated icons
import cursorIcon from "../../assets/icons/cursor.png";
import chromeIcon from "../../assets/icons/chrome.png";
import safariIcon from "../../assets/icons/safari.png";
import electronIcon from "../../assets/icons/electron.png";
import spotifyIcon from "../../assets/icons/spotify.png";
import figmaIcon from "../../assets/icons/figma.png";
import notionIcon from "../../assets/icons/notion.png";
import slackIcon from "../../assets/icons/slack.png";
import githubIcon from "../../assets/icons/github.png";
import terminalIcon from "../../assets/icons/terminal.png";
import settingsIcon from "../../assets/icons/settings.png";

interface TopApp {
  name: string;
  durationMs: number;
}

interface TrayAppsListProps {
  topApps: TopApp[];
  isLoading: boolean;
}

// Curated icon map
const iconMap: { [key: string]: string } = {
  Cursor: cursorIcon,
  "Google Chrome": chromeIcon,
  Safari: safariIcon,
  Electron: electronIcon,
  Spotify: spotifyIcon,
  Figma: figmaIcon,
  Notion: notionIcon,
  Slack: slackIcon,
  GitHub: githubIcon,
  Terminal: terminalIcon,
  Settings: settingsIcon,
};

// Get app-specific gradient colors for fallback
const getAppColor = (name: string): string => {
  const colors: { [key: string]: string } = {
    Cursor: "from-blue-500 to-purple-500",
    "Google Chrome": "from-yellow-400 to-red-500",
    Safari: "from-blue-400 to-blue-600",
    Electron: "from-teal-400 to-cyan-500",
    Terminal: "from-gray-700 to-gray-900",
    Slack: "from-purple-500 to-pink-500",
    Discord: "from-indigo-500 to-purple-600",
    Notion: "from-gray-600 to-gray-800",
    Figma: "from-orange-400 to-red-500",
    Spotify: "from-green-500 to-green-700",
    Settings: "from-gray-400 to-gray-600",
  };
  return colors[name] || "from-gray-500 to-gray-700";
};

// Simple app icon component for tray
function TrayAppIcon({
  appName,
  size = 20,
}: {
  appName: string;
  size?: number;
}) {
  // Try to find exact match or partial match in curated icons
  let iconSrc = iconMap[appName];

  if (!iconSrc) {
    // Try partial matching for apps like "Google Chrome Beta"
    const matchedKey = Object.keys(iconMap).find(
      (key) => appName.includes(key) || key.includes(appName),
    );
    if (matchedKey) {
      iconSrc = iconMap[matchedKey];
    }
  }

  // Show curated icon if available
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={`${appName} icon`}
        width={size}
        height={size}
        className="rounded-sm"
      />
    );
  }

  // Fallback: Letter with gradient background
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${getAppColor(appName)} rounded-sm text-primary-foreground font-semibold`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {appName.charAt(0).toUpperCase()}
    </div>
  );
}

export function TrayAppsList({ topApps, isLoading }: TrayAppsListProps) {
  // Calculate max duration for progress bar
  const maxDuration = useMemo(() => {
    return Math.max(...topApps.map((a) => a.durationMs), 1);
  }, [topApps]);

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg p-3">
        <div className="h-4 bg-muted rounded w-28 mb-3 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-24 mb-1 animate-pulse"></div>
                <div className="h-1.5 bg-muted rounded w-full animate-pulse"></div>
              </div>
              <div className="h-3 bg-muted rounded w-12 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topApps.length === 0) {
    return (
      <div className="border border-border rounded-lg p-3">
        <h3 className="text-xs text-muted-foreground mb-3">Apps & Websites</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity tracked yet today
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-xs text-muted-foreground mb-3">Apps & Websites</h3>

      <div className="space-y-2">
        {topApps.slice(0, 6).map((app) => {
          const widthPercent = (app.durationMs / maxDuration) * 100;

          return (
            <div key={app.name} className="flex items-center gap-2">
              {/* App icon */}
              <TrayAppIcon appName={app.name} size={20} />

              {/* App name and progress bar */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate mb-0.5">
                  {app.name}
                </p>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-accent rounded-full transition-all"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>

              {/* Duration */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDuration(app.durationMs)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
