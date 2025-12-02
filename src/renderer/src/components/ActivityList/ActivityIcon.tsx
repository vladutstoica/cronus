import { cn } from "../../lib/utils";
import { getFaviconURL } from "../../utils/favicon";
import AppIcon from "../AppIcon";
import { useState } from "react";

interface ActivityIconProps {
  url?: string | null;
  appName?: string | null;
  size: number;
  className?: string;
  itemType?: "website" | "app" | "other";
  color?: string;
  showFallback?: boolean;
  fallbackText?: string;
}

const systemEventNames = [
  "💤 System Inactive",
  "⏰ System Active",
  "🔒 Screen Locked",
  "🔓 Screen Unlocked",
];

export function ActivityIcon({
  url,
  appName,
  size,
  className,
  itemType,
  color,
  showFallback,
  fallbackText,
}: ActivityIconProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const isSystemEvent = appName && systemEventNames.includes(appName);

  if (isSystemEvent) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("flex-shrink-0", className)}
      />
    );
  }

  // Determine the effective item type based on URL availability
  let effectiveItemType = itemType;
  if (!effectiveItemType) {
    if (url && url.trim() !== "") {
      effectiveItemType = "website";
    } else if (appName) {
      effectiveItemType = "app";
    } else {
      effectiveItemType = "other";
    }
  }

  // For websites without URL, fall back to browser's app icon
  if (effectiveItemType === "website" && (!url || url.trim() === "")) {
    effectiveItemType = "app";
  }

  // Website with valid URL - show favicon
  if (effectiveItemType === "website" && url && url.trim() !== "") {
    if (showFallback) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground rounded text-xs flex-shrink-0",
            className,
          )}
        >
          {fallbackText}
        </div>
      );
    }

    // Favicon failed to load - fall back to browser app icon if available
    if (faviconFailed) {
      if (appName) {
        return (
          <AppIcon
            appName={appName}
            size={size}
            className={cn("flex-shrink-0", className)}
          />
        );
      }
      // No app name available, show generic globe
      return (
        <div
          className={cn(
            "flex items-center justify-center bg-blue-500 text-white rounded-full flex-shrink-0",
            className,
          )}
          style={{ width: size, height: size }}
        >
          <span style={{ fontSize: size * 0.5 }}>🌐</span>
        </div>
      );
    }

    // Try to get favicon URL
    const faviconUrl = getFaviconURL(url);
    if (!faviconUrl) {
      // Invalid URL - fall back to app icon
      effectiveItemType = "app";
    } else {
      return (
        <img
          src={faviconUrl}
          className={cn("rounded flex-shrink-0", className)}
          style={{ width: size, height: size }}
          onError={() => {
            setFaviconFailed(true);
          }}
          alt={appName || "favicon"}
        />
      );
    }
  }

  // Manual entries - show colored circle with letter
  if (effectiveItemType === "other" && color) {
    const displayName = fallbackText || appName || "M";
    const firstLetter = displayName.charAt(0).toUpperCase();

    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full flex-shrink-0",
          className,
        )}
        style={{
          backgroundColor: color,
          width: size,
          height: size,
        }}
      >
        <span
          style={{ fontSize: size * 0.4, color: "white", fontWeight: "bold" }}
        >
          {firstLetter}
        </span>
      </div>
    );
  }

  // App icon (including browser activities without URL)
  if (effectiveItemType === "app" && appName && itemType !== "other") {
    return (
      <AppIcon
        appName={appName}
        size={size}
        className={cn("flex-shrink-0", className)}
      />
    );
  }

  // Fallback - empty placeholder
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("flex-shrink-0", className)}
    />
  );
}
