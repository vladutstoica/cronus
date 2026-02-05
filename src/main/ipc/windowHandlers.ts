import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, Notification, shell } from "electron";
import { ActivityToRecategorize, Category } from "@shared/types";
import icon from "../../../resources/icon.png?asset";
import { nativeWindowObserver, PermissionType } from "native-window-observer";
import { logMainToFile } from "../logging";
import {
  startActiveWindowObserver,
  stopActiveWindowObserver,
} from "../services/observerManager";
import { redactSensitiveContent } from "../redaction";
import { setAllowForcedQuit } from "../windows";
import { Windows } from "./shared";

export function registerWindowHandlers(
  windows: Windows,
  recreateFloatingWindow: () => void,
  recreateMainWindow: () => BrowserWindow,
): void {
  ipcMain.on("move-floating-window", (_event, { deltaX, deltaY }) => {
    if (windows.floatingWindow) {
      const currentPosition = windows.floatingWindow.getPosition();
      const [currentX, currentY] = currentPosition;
      windows.floatingWindow.setPosition(currentX + deltaX, currentY + deltaY);
    }
  });

  ipcMain.handle("get-app-icon-path", (_event, appName: string) => {
    return nativeWindowObserver.getAppIconPath(appName);
  });

  ipcMain.on("hide-floating-window", () => {
    if (windows.floatingWindow && windows.floatingWindow.isVisible()) {
      windows.floatingWindow.hide();
    }
  });

  ipcMain.on("show-floating-window", () => {
    try {
      if (windows.floatingWindow && !windows.floatingWindow.isDestroyed()) {
        if (!windows.floatingWindow.isVisible()) {
          windows.floatingWindow.show();
        }
      } else {
        console.log("Creating new floating window...");
        recreateFloatingWindow();

        // Give the floating window a moment to initialize before showing
        if (windows.floatingWindow && !windows.floatingWindow.isDestroyed()) {
          setTimeout(() => {
            if (
              windows.floatingWindow &&
              !windows.floatingWindow.isDestroyed()
            ) {
              windows.floatingWindow.show();
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error in show-floating-window handler:", error);
    }
  });

  ipcMain.handle("set-open-at-login", (_event, enable: boolean) => {
    if (process.platform === "darwin") {
      app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: true,
      });
    }
  });

  ipcMain.handle("enable-permission-requests", () => {
    logMainToFile(
      "Enabling explicit permission requests after onboarding completion",
    );
    nativeWindowObserver.setPermissionDialogsEnabled(true);
  });

  ipcMain.handle("start-window-tracking", () => {
    logMainToFile(
      "Starting active window observer after onboarding completion",
    );
    startActiveWindowObserver();
  });

  ipcMain.handle("pause-window-tracking", () => {
    logMainToFile("Pausing active window observer");
    stopActiveWindowObserver();
  });

  ipcMain.handle("resume-window-tracking", () => {
    logMainToFile("Resuming active window observer");
    startActiveWindowObserver();
  });

  // for pausing the timer when tracking is paused
  ipcMain.on(
    "update-floating-window-status",
    (
      _event,
      data: {
        latestStatus: "productive" | "unproductive" | "maybe" | null;
        dailyProductiveMs: number;
        dailyUnproductiveMs: number;
        categoryName?: string;
        categoryDetails?: Category;
        isTrackingPaused?: boolean;
      },
    ) => {
      if (
        windows.floatingWindow &&
        !windows.floatingWindow.isDestroyed() &&
        !windows.floatingWindow.webContents.isDestroyed()
      ) {
        windows.floatingWindow.webContents.send(
          "floating-window-status-updated",
          data,
        );
      } else {
        console.warn(
          "Main process: Received status update, but floatingWindow is null or destroyed.",
        );
      }
    },
  );

  // Permission-related IPC handlers
  ipcMain.handle("get-permission-request-status", () => {
    return nativeWindowObserver.getPermissionDialogsEnabled();
  });

  ipcMain.handle(
    "get-permission-status",
    (_event, permissionType: PermissionType) => {
      return nativeWindowObserver.getPermissionStatus(permissionType);
    },
  );

  ipcMain.handle("get-permissions-for-title-extraction", () => {
    return nativeWindowObserver.hasPermissionsForTitleExtraction();
  });

  ipcMain.handle("get-permissions-for-content-extraction", () => {
    return nativeWindowObserver.hasPermissionsForContentExtraction();
  });

  ipcMain.handle(
    "request-permission",
    (_event, permissionType: PermissionType) => {
      logMainToFile(`Manually requesting permission: ${permissionType}`);
      nativeWindowObserver.requestPermission(permissionType);
    },
  );

  ipcMain.handle("force-enable-permission-requests", () => {
    logMainToFile("Force enabling explicit permission requests via settings");
    nativeWindowObserver.setPermissionDialogsEnabled(true);
  });

  ipcMain.handle("get-floating-window-visibility", () => {
    return windows.floatingWindow?.isVisible() ?? false;
  });

  ipcMain.on("log-to-file", (_event, _message: string, _data?: object) => {
    // logRendererToFile(message, data)
  });

  ipcMain.handle("get-env-vars", () => {
    return {
      isDev: is.dev,
    };
  });

  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("get-build-date", () => {
    return import.meta.env.VITE_BUILD_DATE;
  });

  ipcMain.handle("capture-screenshot-and-ocr", async () => {
    try {
      const result =
        nativeWindowObserver.captureScreenshotAndOCRForCurrentWindow();
      logMainToFile("Screenshot + OCR captured", {
        success: result.success,
        textLength: result.ocrText?.length || 0,
      });
      return result;
    } catch (error) {
      logMainToFile("Error capturing screenshot + OCR", {
        error: String(error),
      });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("redact-sensitive-content", (_event, content: string) => {
    return redactSensitiveContent(content);
  });

  ipcMain.on(
    "request-recategorize-view",
    (_event, activity?: ActivityToRecategorize) => {
      if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
        windows.mainWindow.show();
        windows.mainWindow.focus();
        if (windows.mainWindow.isMinimized()) {
          windows.mainWindow.restore();
        }
        windows.mainWindow.webContents.send(
          "display-recategorize-page",
          activity,
        );
      } else {
        // Main window is closed - recreate it
        console.log("Main window closed, recreating for recategorization...");
        windows.mainWindow = recreateMainWindow();

        // Wait for window to load, then send recategorize request
        windows.mainWindow.webContents.once("did-finish-load", () => {
          if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
            windows.mainWindow.webContents.send(
              "display-recategorize-page",
              activity,
            );
          }
        });
      }
    },
  );

  ipcMain.on("open-main-app-window", () => {
    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
      windows.mainWindow.show();
      windows.mainWindow.focus();
    } else {
      logMainToFile("Main window not available, recreating it.");
      windows.mainWindow = recreateMainWindow();
    }
  });

  ipcMain.on("show-notification", (_event, { title, body }) => {
    logMainToFile("Received show-notification request", { title, body });
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: process.platform === "win32" ? icon : undefined,
        actions: [{ type: "button", text: "Edit" }],
      });

      notification.on("click", () => {
        logMainToFile("Notification clicked. Focusing main window.");
        if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
          if (windows.mainWindow.isMinimized()) windows.mainWindow.restore();
          windows.mainWindow.focus();
        } else {
          console.warn("Main window not available when notification clicked");
        }
      });

      notification.on("action", (_event, index) => {
        logMainToFile(`Notification action clicked, index: ${index}`);
        if (index === 0) {
          // Corresponds to the 'Edit' button
          if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
            if (windows.mainWindow.isMinimized()) windows.mainWindow.restore();
            windows.mainWindow.focus();
          } else {
            console.warn(
              "Main window not available when notification action clicked",
            );
          }
        }
      });

      notification.show();
    } else {
      logMainToFile("Notifications not supported on this system.");
    }
  });

  // This is a workaround for the main window's webContents being unavailable
  // when the renderer is ready.
  ipcMain.on("ping", () => console.log("pong"));

  windows.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://accounts.google.com/")) {
      if (is.dev) {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: 600,
            height: 700,
            autoHideMenuBar: true,
            webPreferences: {},
          },
        };
      } else {
        shell.openExternal(url);
        return { action: "deny" };
      }
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  ipcMain.handle("on-auth-code-received", (event, code: string) => {
    logMainToFile("Auth code received in main process", {
      code: code.substring(0, 10) + "...",
    });

    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
      windows.mainWindow.webContents.send("auth-code-received", code);
    }
  });

  // Handler for quit confirmation modal
  ipcMain.handle("confirm-quit", () => {
    logMainToFile("User confirmed quit, closing app");

    // Allow the app to quit normally when user confirms
    setAllowForcedQuit(true);

    if (windows.mainWindow && !windows.mainWindow.isDestroyed()) {
      windows.mainWindow.destroy();
    }

    if (windows.floatingWindow && !windows.floatingWindow.isDestroyed()) {
      windows.floatingWindow.destroy();
    }

    app.quit();
  });
}
