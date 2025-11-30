import { is, optimizer } from "@electron-toolkit/utils";
import dotenv from "dotenv";
import { app, BrowserWindow, session } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { ActiveWindowDetails } from "@shared/types";
import { nativeWindowObserver } from "native-window-observer";
import {
  initializeAutoUpdater,
  registerAutoUpdaterHandlers,
} from "./auto-updater";
import { initDatabase, closeDatabase } from "./database";
import { getOrCreateLocalUser } from "./database/services/users";
import {
  createDefaultCategories,
  getCategoriesByUserId,
} from "./database/services/categories";
import { getBooleanSetting } from "./database/services/settings";
import { registerIpcHandlers } from "./ipc";
import { initializeLoggers } from "./logging";
import {
  getUrlToHandleOnReady,
  handleAppUrl,
  setupProtocolHandlers,
  setupSingleInstanceLock,
} from "./protocol";
import {
  createFloatingWindow,
  createMainWindow,
  createTrayPopoverWindow,
  setIsAppQuitting,
} from "./windows";
import { createTray, destroyTray, getTrayBounds } from "./tray";

// Handle Squirrel.Windows events
if (squirrelStartup) {
  app.quit();
}

// Explicitly load .env files to ensure production run-time app uses the correct .env file
// NODE_ENV set in build isn't present in the run-time app
dotenv.config({ path: is.dev ? ".env.development" : ".env.production" });

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let trayPopoverWindow: BrowserWindow | null = null;

let isTrackingPaused = false;

function App() {
  async function initializeApp() {
    await initializeLoggers();

    // Initialize local database
    console.log("Initializing local database...");
    initDatabase();

    // Create or get local user
    const user = getOrCreateLocalUser();
    console.log("Local user:", user.id);

    // Create default categories if none exist
    const existingCategories = getCategoriesByUserId(user.id);
    if (existingCategories.length === 0) {
      console.log("Creating default categories...");
      createDefaultCategories(user.id);
    }

    if (!setupSingleInstanceLock(() => mainWindow)) {
      return;
    }

    // Set a different AppUserModelId for development to allow dev and prod to run side-by-side.
    if (is.dev) {
      app.setAppUserModelId("com.cronus.app.dev");
    } else {
      app.setAppUserModelId("com.cronus.app");
    }

    if (process.platform === "darwin") {
      await app.dock?.show();
    }

    setupCsp();
    setupProtocolHandlers(() => mainWindow);

    mainWindow = createMainWindow(getUrlToHandleOnReady, (url) =>
      handleAppUrl(url, mainWindow),
    );
    initializeAutoUpdater(mainWindow);
    floatingWindow = createFloatingWindow(() => mainWindow);
    trayPopoverWindow = createTrayPopoverWindow();

    // Toggle tray popover function
    const toggleTrayPopover = () => {
      if (!trayPopoverWindow) {
        trayPopoverWindow = createTrayPopoverWindow();
      }

      if (trayPopoverWindow.isVisible()) {
        trayPopoverWindow.hide();
      } else {
        // Position the popover below the tray icon
        const trayBounds = getTrayBounds();
        if (trayBounds) {
          const popoverBounds = trayPopoverWindow.getBounds();
          const x = Math.round(
            trayBounds.x + trayBounds.width / 2 - popoverBounds.width / 2,
          );
          const y = Math.round(trayBounds.y + trayBounds.height + 4);
          trayPopoverWindow.setPosition(x, y, false);
        }
        trayPopoverWindow.show();
        trayPopoverWindow.focus();
      }
    };

    // Create tray icon
    createTray(toggleTrayPopover);

    mainWindow.on("closed", () => {
      mainWindow = null;
      windows.mainWindow = null;
    });

    if (floatingWindow) {
      floatingWindow.on("closed", () => {
        floatingWindow = null;
        windows.floatingWindow = null;
      });
    }

    if (trayPopoverWindow) {
      trayPopoverWindow.on("closed", () => {
        trayPopoverWindow = null;
        windows.trayPopoverWindow = null;
      });
    }

    // Create windows object that IPC handlers will reference
    const windows: {
      mainWindow: BrowserWindow | null;
      floatingWindow: BrowserWindow | null;
      trayPopoverWindow: BrowserWindow | null;
    } = {
      mainWindow,
      floatingWindow,
      trayPopoverWindow,
    };

    const recreateMainWindow = (): BrowserWindow => {
      mainWindow = createMainWindow(getUrlToHandleOnReady, (url) =>
        handleAppUrl(url, mainWindow),
      );
      // Update the windows object reference for IPC handlers
      windows.mainWindow = mainWindow;
      return mainWindow;
    };

    const recreateFloatingWindow = (): void => {
      if (!floatingWindow) {
        floatingWindow = createFloatingWindow(() => mainWindow);
        // Update the windows object reference for IPC handlers
        windows.floatingWindow = floatingWindow;

        // Set up closed event handler for the new floating window
        if (floatingWindow) {
          floatingWindow.on("closed", () => {
            floatingWindow = null;
            windows.floatingWindow = null;
          });
        }
      }
    };

    registerIpcHandlers(windows, recreateFloatingWindow, recreateMainWindow);
    registerAutoUpdaterHandlers();

    // Don't start observing active window changes immediately
    // This will be started after onboarding is complete via IPC call
    // Store the callback for later use
    const windowChangeCallback = (windowInfo: ActiveWindowDetails | null) => {
      if (
        windowInfo &&
        mainWindow &&
        !mainWindow.isDestroyed() &&
        !mainWindow.webContents.isDestroyed() &&
        !isTrackingPaused
      ) {
        // Check if screen text recognition (OCR) is enabled
        const ocrEnabled = getBooleanSetting("screenshots_enabled", false);

        // Clear content if OCR is disabled
        const eventInfo = ocrEnabled
          ? windowInfo
          : { ...windowInfo, content: null, contentSource: null };

        console.log(
          `[Main] Active window: ${windowInfo.ownerName}, OCR enabled: ${ocrEnabled}, content: ${eventInfo.content?.length || 0} chars`,
        );
        mainWindow.webContents.send("active-window-changed", eventInfo);
      }
    };

    // Make the callback available to IPC handlers
    (global as any).stopActiveWindowObserver = () => {
      isTrackingPaused = true;
      nativeWindowObserver.stopActiveWindowObserver();
    };
    (global as any).startActiveWindowObserver = () => {
      isTrackingPaused = false;
      // Log permission status for debugging
      const { PermissionType } = require("native-window-observer");
      const screenRecordingStatus = nativeWindowObserver.getPermissionStatus(
        PermissionType.ScreenRecording,
      );
      console.log(
        `[Main] Screen Recording permission status: ${screenRecordingStatus} (0=Denied, 1=Granted, 2=Pending)`,
      );
      nativeWindowObserver.startActiveWindowObserver(windowChangeCallback);
    };

    // Handle app activation (e.g., clicking the dock icon on macOS)
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow(getUrlToHandleOnReady, (url) =>
          handleAppUrl(url, mainWindow),
        );
        windows.mainWindow = mainWindow;
      } else {
        // If there are windows (like the floating window), show the main window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
        } else {
          // Main window doesn't exist, recreate it
          mainWindow = createMainWindow(getUrlToHandleOnReady, (url) =>
            handleAppUrl(url, mainWindow),
          );
          windows.mainWindow = mainWindow;
        }
      }
    });
  }

  function setupCsp() {
    const devServerURL = "http://localhost:5173";
    const serverUrl =
      import.meta.env.MAIN_VITE_SERVER_URL || "http://localhost:3001";
    const csp = `default-src 'self'; script-src 'self' 'unsafe-eval' https://*.loom.com https://*.prod-east.frontend.public.atl-paas.net ${is.dev ? "'unsafe-inline' " + devServerURL : ""}; style-src 'self' 'unsafe-inline' https://fonts.gstatic.com https://*.loom.com https://*.prod-east.frontend.public.atl-paas.net; font-src 'self' https://fonts.gstatic.com https://*.loom.com https://*.prod-east.frontend.public.atl-paas.net; media-src 'self' data: blob: https://cdn.loom.com https://*.loom.com; img-src * data:; frame-src https://*.loom.com; connect-src 'self' https://cdn.jsdelivr.net http://localhost:3001 http://127.0.0.1:3001 https://*.loom.com https://api-private.atlassian.com https://as.atlassian.com https://*.prod-east.frontend.public.atl-paas.net https://cronusnewupdates.s3.amazonaws.com ${is.dev ? devServerURL : ""}; worker-src 'self' blob:`;

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [csp],
          "Cross-Origin-Opener-Policy": ["unsafe-none"],
        },
      });
    });
  }

  app.whenReady().then(initializeApp);

  // Handle app quit attempts (Cmd+Q, Dock → Quit, Menu → Quit)
  app.on("before-quit", (event) => {
    setIsAppQuitting(true);

    // Only show quit modal for Cmd+Q when app is focused
    if (mainWindow && mainWindow.isFocused()) {
      event.preventDefault();
      setIsAppQuitting(false); // Reset since we're preventing
      mainWindow.webContents.send("show-quit-confirmation");
    }
    // For dock/menu quit or unfocused app, allow normal quit
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      closeDatabase();
      app.quit();
    }
  });

  app.on("will-quit", () => {
    destroyTray();
    closeDatabase();
  });

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
}

App();
