import { Tray, nativeImage, app } from "electron";
import { join } from "path";

let tray: Tray | null = null;

/**
 * Create the menu bar tray icon
 *
 * macOS Template Image Best Practices:
 * - Use BLACK on transparent (macOS auto-inverts for dark mode)
 * - Name files with "Template" suffix for auto-detection
 * - Provide both @1x (16x16 or 22x22) and @2x (32x32 or 44x44) versions
 * - @2x file should be named iconTemplate@2x.png
 */
export function createTray(onTogglePopover: () => void): Tray {
  // For macOS, use template images (black on transparent)
  // The "Template" suffix in filename enables auto-detection
  // Provide both iconTemplate.png (22x22) and iconTemplate@2x.png (44x44)
  const resourcesDir = app.isPackaged
    ? process.resourcesPath
    : join(__dirname, "../../resources");

  const templateIconPath = join(resourcesDir, "iconTemplate.png");
  const fallbackIconPath = app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(__dirname, "../../build/icon.png");

  let icon: Electron.NativeImage;

  if (process.platform === "darwin") {
    // On macOS, try to load template image (will auto-detect @2x variant)
    icon = nativeImage.createFromPath(templateIconPath);

    if (icon.isEmpty()) {
      console.log(
        "[Tray] Template icon not found at:",
        templateIconPath,
        "- using fallback",
      );
      icon = nativeImage.createFromPath(fallbackIconPath);
      // Resize fallback to menu bar size
      icon = icon.resize({ width: 22, height: 22 });
    }

    // Mark as template image for automatic dark/light mode color adaptation
    icon.setTemplateImage(true);
  } else {
    // On Windows/Linux, use regular icon
    icon = nativeImage.createFromPath(fallbackIconPath);
    icon = icon.resize({ width: 22, height: 22 });
  }

  tray = new Tray(icon);
  tray.setToolTip("Cronus - Time Tracking");

  // Single click toggles the popover
  tray.on("click", (_event, _bounds) => {
    onTogglePopover();
  });

  return tray;
}

/**
 * Get the tray bounds for positioning the popover
 */
export function getTrayBounds(): Electron.Rectangle | null {
  return tray?.getBounds() ?? null;
}

/**
 * Destroy the tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * Check if tray exists
 */
export function hasTray(): boolean {
  return tray !== null;
}
