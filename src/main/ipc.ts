import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, ipcMain, Notification, shell } from "electron";
import fs from "fs/promises";
import { join } from "path";
import { Category } from "@shared/types";
import icon from "../../resources/icon.png?asset";
import { nativeWindowObserver, PermissionType } from "native-window-observer";
import { logMainToFile } from "./logging";
import { redactSensitiveContent } from "./redaction";
import { setAllowForcedQuit } from "./windows";
import {
  getOrCreateLocalUser,
  getUserById,
  updateUser,
} from "./database/services/users";
import {
  getCategoriesByUserId,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteRecentlyCreatedCategories,
} from "./database/services/categories";
import {
  getEventsByUserId,
  getEventsByUserAndTimeRange,
  getEventById,
  getUserStatistics,
  updateActiveWindowEvent,
} from "./database/services/activeWindowEvents";
import {
  getAllSettings,
  getSetting,
  setSetting,
  updateSettings,
} from "./database/services/settings";
import {
  getTodosByDate,
  getTodosByDateRange,
  getIncompleteTodosBeforeDate,
  createTodo,
  getTodoById,
  updateTodo,
  deleteTodo,
  rolloverTodos,
  getTodoStats,
  clearFocusTodos,
} from "./database/services/todos";
import {
  processWindowEvent,
  updateEventDuration,
  endWindowEvent,
  recategorizeEvent,
  recategorizeEventsByIdentifierService,
} from "./services/windowTracking";
import { listOllamaModels, pullOllamaModel } from "./services/ollama";
import { generateCategorySuggestions } from "./services/categorization";

export interface ActivityToRecategorize {
  identifier: string;
  nameToDisplay: string;
  itemType: "app" | "website";
  currentCategoryId: string;
  currentCategoryName: string;
  currentCategoryColor: string;
  categoryReasoning?: string;
  originalUrl?: string;
}

interface Windows {
  mainWindow: BrowserWindow | null;
  floatingWindow: BrowserWindow | null;
}

export function registerIpcHandlers(
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
    // Call the global function we set up in main/index.ts
    if ((global as any).startActiveWindowObserver) {
      (global as any).startActiveWindowObserver();
    } else {
      logMainToFile("ERROR: startActiveWindowObserver function not available");
    }
  });

  ipcMain.handle("pause-window-tracking", () => {
    logMainToFile("Pausing active window observer");
    // Call the global function to stop tracking
    if ((global as any).stopActiveWindowObserver) {
      (global as any).stopActiveWindowObserver();
    } else {
      logMainToFile("ERROR: stopActiveWindowObserver function not available");
    }
  });

  ipcMain.handle("resume-window-tracking", () => {
    logMainToFile("Resuming active window observer");
    // Call the global function to start tracking again
    if ((global as any).startActiveWindowObserver) {
      (global as any).startActiveWindowObserver();
    } else {
      logMainToFile("ERROR: startActiveWindowObserver function not available");
    }
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

  ipcMain.on("open-external-url", (_event, url: string) => {
    shell.openExternal(url);
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

  ipcMain.handle("get-audio-data-url", async () => {
    try {
      let audioFilePath: string;
      if (is.dev) {
        // In development, the 'public' directory is at the root of the electron-app workspace
        audioFilePath = join(
          __dirname,
          "..",
          "..",
          "public",
          "sounds",
          "distraction.mp3",
        );
      } else {
        // In production, files in 'public' are copied to the resources directory's root
        audioFilePath = join(
          process.resourcesPath,
          "sounds",
          "distraction.mp3",
        );
      }

      console.log(
        `[get-audio-data-url] Attempting to read audio file from: ${audioFilePath}`,
      );
      const buffer = await fs.readFile(audioFilePath);
      const base64 = buffer.toString("base64");
      return `data:audio/mp3;base64,${base64}`;
    } catch (error) {
      console.error("[get-audio-data-url] Error reading audio file", {
        error: String(error),
        stack: (error as Error).stack,
      });
      console.error("Error reading audio file for data URL:", error);
      return null;
    }
  });

  ipcMain.handle("read-file", async (_event, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });

  ipcMain.handle("delete-file", async (_event, filePath: string) => {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file via IPC:", error);
    }
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

  // ipcMain.handle(
  //   'set-sentry-user',
  //   (
  //     _event,
  //     userData: { id: string; email: string; username: string; subscription: boolean } | null
  //   ) => {
  //     Sentry.setUser(userData)
  //     logMainToFile('Sentry user context updated', { userId: userData?.id, email: userData?.email })
  //   }
  // )

  // ============================================================
  // LOCAL DATABASE IPC HANDLERS
  // ============================================================

  // User handlers
  ipcMain.handle("local:get-user", () => {
    const user = getOrCreateLocalUser();

    // Parse JSON fields for frontend with error handling
    let electronSettings = {};
    let userGoals: any = [];

    try {
      electronSettings = user.electron_app_settings
        ? JSON.parse(user.electron_app_settings)
        : {};
    } catch (e) {
      console.error(
        "Failed to parse electron_app_settings, using empty object:",
        e,
      );
      electronSettings = {};
    }

    try {
      if (user.user_projects_and_goals) {
        const parsed = JSON.parse(user.user_projects_and_goals);
        // Handle both array and string formats
        userGoals = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      // If JSON parse fails, treat as plain string and wrap in array
      console.log("Goals stored as plain text, converting to array format");
      userGoals = user.user_projects_and_goals
        ? [user.user_projects_and_goals]
        : [];
    }

    return {
      ...user,
      electron_app_settings: electronSettings,
      user_projects_and_goals: userGoals,
    };
  });

  ipcMain.handle("local:update-user", (_event, updates: any) => {
    const user = getOrCreateLocalUser();
    const updatedUser = updateUser(user.id, updates);
    if (!updatedUser) return null;

    // Parse JSON fields for frontend (with error handling)
    let electronSettings = {};
    let userGoals: any = [];

    try {
      electronSettings = updatedUser.electron_app_settings
        ? JSON.parse(updatedUser.electron_app_settings)
        : {};
    } catch (e) {
      console.error("Failed to parse electron_app_settings:", e);
    }

    try {
      if (updatedUser.user_projects_and_goals) {
        const parsed = JSON.parse(updatedUser.user_projects_and_goals);
        // Handle both array and string formats
        userGoals = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      // If JSON parse fails, treat as plain string
      console.log("Goals stored as plain text, converting to array");
      userGoals = updatedUser.user_projects_and_goals
        ? [updatedUser.user_projects_and_goals]
        : [];
    }

    return {
      ...updatedUser,
      electron_app_settings: electronSettings,
      user_projects_and_goals: userGoals,
    };
  });

  // Helper function to convert category snake_case to camelCase for frontend
  const convertCategoryToCamelCase = (category: any) => ({
    _id: category.id,
    userId: category.user_id,
    name: category.name,
    description: category.description,
    color: category.color,
    isProductive: category.is_productive,
    isDefault: category.is_default,
    isArchived: category.is_archived,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  });

  // Category handlers
  ipcMain.handle("local:get-categories", () => {
    const user = getOrCreateLocalUser();
    const categories = getCategoriesByUserId(user.id, false);
    return categories.map(convertCategoryToCamelCase);
  });

  ipcMain.handle("local:get-category-by-id", (_event, id: string) => {
    const category = getCategoryById(id);
    if (!category) return category;
    return convertCategoryToCamelCase(category);
  });

  ipcMain.handle("local:create-category", (_event, category: any) => {
    const user = getOrCreateLocalUser();
    const created = createCategory({
      ...category,
      is_productive: category.isProductive,
      is_default: category.isDefault,
      is_archived: category.isArchived,
      user_id: user.id,
    });
    return convertCategoryToCamelCase(created);
  });

  ipcMain.handle(
    "local:update-category",
    (_event, id: string, updates: any) => {
      const updated = updateCategory(id, {
        ...updates,
        is_productive: updates.isProductive,
        is_default: updates.isDefault,
        is_archived: updates.isArchived,
      });
      if (!updated) return updated;
      return convertCategoryToCamelCase(updated);
    },
  );

  ipcMain.handle("local:delete-category", (_event, id: string) => {
    deleteCategory(id);
    return { success: true };
  });

  ipcMain.handle("local:delete-recent-categories", () => {
    const user = getOrCreateLocalUser();
    return deleteRecentlyCreatedCategories(user.id);
  });

  ipcMain.handle(
    "local:generate-ai-categories",
    async (_event, goals: string) => {
      const categories = await generateCategorySuggestions(goals);
      return { categories };
    },
  );

  // Event handlers
  // Helper function to convert snake_case to camelCase for frontend
  const convertEventToCamelCase = (event: any) => ({
    _id: event.id,
    userId: event.user_id,
    windowId: event.window_id,
    ownerName: event.owner_name,
    type: event.type,
    browser: event.browser,
    title: event.title,
    url: event.url,
    content: event.content,
    categoryId: event.category_id,
    categoryReasoning: event.category_reasoning,
    llmSummary: event.llm_summary,
    timestamp: new Date(event.timestamp).getTime(), // Convert to number
    screenshotPath: event.screenshot_path,
    durationMs: event.duration_ms,
    lastCategorizationAt: event.last_categorization_at,
    generatedTitle: event.generated_title,
    oldCategoryId: event.old_category_id,
    oldCategoryReasoning: event.old_category_reasoning,
    oldLlmSummary: event.old_llm_summary,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  });

  ipcMain.handle(
    "local:get-events",
    (_event, limit?: number, offset?: number) => {
      const user = getOrCreateLocalUser();
      const events = getEventsByUserId(user.id, limit, offset);
      return events.map(convertEventToCamelCase);
    },
  );

  ipcMain.handle(
    "local:get-events-by-date-range",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      const events = getEventsByUserAndTimeRange(
        user.id,
        new Date(startDate),
        new Date(endDate),
      );

      console.log(
        `[IPC] Loaded ${events.length} events for range ${startDate} to ${endDate}`,
      );

      const convertedEvents = events.map(convertEventToCamelCase);

      if (convertedEvents.length > 0) {
        console.log("[IPC] Sample event:", {
          owner: convertedEvents[0].ownerName,
          timestamp: convertedEvents[0].timestamp,
          categoryId: convertedEvents[0].categoryId,
        });
      }

      return convertedEvents;
    },
  );

  ipcMain.handle("local:get-event-by-id", (_event, id: string) => {
    const event = getEventById(id);
    if (!event) return event;
    return convertEventToCamelCase(event);
  });

  ipcMain.handle("local:update-event", (_event, id: string, updates: any) => {
    return updateActiveWindowEvent(id, updates);
  });

  ipcMain.handle(
    "local:get-user-statistics",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      return getUserStatistics(user.id, new Date(startDate), new Date(endDate));
    },
  );

  ipcMain.handle(
    "local:recategorize-event",
    (_event, eventId: string, categoryId: string) => {
      return recategorizeEvent(eventId, categoryId);
    },
  );

  ipcMain.handle(
    "local:recategorize-events-by-identifier",
    (
      _event,
      identifier: string,
      itemType: "app" | "website",
      startDateMs: number,
      endDateMs: number,
      newCategoryId: string,
    ) => {
      return recategorizeEventsByIdentifierService(
        identifier,
        itemType,
        startDateMs,
        endDateMs,
        newCategoryId,
      );
    },
  );

  // Window tracking handlers
  ipcMain.handle("local:process-window-event", (_event, eventDetails: any) => {
    return processWindowEvent({
      ...eventDetails,
      timestamp: new Date(eventDetails.timestamp),
    });
  });

  ipcMain.handle(
    "local:update-event-duration",
    (_event, windowId: string, durationMs: number) => {
      return updateEventDuration(windowId, durationMs);
    },
  );

  ipcMain.handle("local:end-window-event", (_event, windowId: string) => {
    return endWindowEvent(windowId);
  });

  // Settings handlers
  ipcMain.handle("local:get-all-settings", () => {
    return getAllSettings();
  });

  ipcMain.handle("local:get-setting", (_event, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle("local:set-setting", (_event, key: string, value: any) => {
    return setSetting(key, value);
  });

  ipcMain.handle(
    "local:update-settings",
    (_event, settings: Record<string, any>) => {
      return updateSettings(settings);
    },
  );

  // Ollama handlers (deprecated, use provider handlers)
  ipcMain.handle("local:list-ollama-models", () => {
    return listOllamaModels();
  });

  ipcMain.handle("local:pull-ollama-model", (_event, modelName: string) => {
    return pullOllamaModel(modelName);
  });

  // AI Provider handlers
  ipcMain.handle(
    "local:test-ai-provider-connection",
    async (_event, type: "ollama" | "lmstudio", baseUrl?: string) => {
      const { testProviderConnection } = await import("./services/aiProvider");
      return testProviderConnection(type, baseUrl);
    },
  );

  ipcMain.handle("local:list-ai-models", async () => {
    const { getActiveProvider } = await import("./services/aiProvider");
    const provider = getActiveProvider();
    return provider.listModels();
  });

  ipcMain.handle(
    "local:list-provider-models",
    async (_event, type: "ollama" | "lmstudio") => {
      const { getProviderByType } = await import("./services/aiProvider");
      const provider = getProviderByType(type);
      return provider.listModels();
    },
  );

  ipcMain.handle("local:clear-ai-availability-cache", async () => {
    const { clearAvailabilityCache } = await import("./services/aiProvider");
    clearAvailabilityCache();
  });

  // ============================================================
  // TODO IPC HANDLERS
  // ============================================================

  // Helper function to convert todo snake_case to camelCase for frontend
  const convertTodoToCamelCase = (todo: any) => ({
    id: todo.id,
    userId: todo.user_id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    status: todo.status,
    isFocus: todo.is_focus === 1,
    tags: todo.tags ? JSON.parse(todo.tags) : [],
    scheduledDate: todo.scheduled_date,
    originalDate: todo.original_date,
    completedAt: todo.completed_at,
    createdAt: todo.created_at,
    updatedAt: todo.updated_at,
  });

  ipcMain.handle("local:get-todos-by-date", (_event, date: string) => {
    const user = getOrCreateLocalUser();
    const todos = getTodosByDate(user.id, date);
    return todos.map(convertTodoToCamelCase);
  });

  ipcMain.handle(
    "local:get-todos-by-date-range",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      const todos = getTodosByDateRange(user.id, startDate, endDate);
      return todos.map(convertTodoToCamelCase);
    }
  );

  ipcMain.handle("local:get-incomplete-todos-before-date", (_event, beforeDate: string) => {
    const user = getOrCreateLocalUser();
    const todos = getIncompleteTodosBeforeDate(user.id, beforeDate);
    return todos.map(convertTodoToCamelCase);
  });

  ipcMain.handle("local:create-todo", (_event, input: any) => {
    const user = getOrCreateLocalUser();
    const todo = createTodo({
      ...input,
      user_id: user.id,
    });
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:get-todo-by-id", (_event, id: string) => {
    const todo = getTodoById(id);
    if (!todo) return null;
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:update-todo", (_event, id: string, updates: any) => {
    const todo = updateTodo(id, updates);
    if (!todo) return null;
    return convertTodoToCamelCase(todo);
  });

  ipcMain.handle("local:delete-todo", (_event, id: string) => {
    return deleteTodo(id);
  });

  ipcMain.handle("local:rollover-todos", (_event, toDate: string) => {
    const user = getOrCreateLocalUser();
    return rolloverTodos(user.id, toDate);
  });

  ipcMain.handle(
    "local:get-todo-stats",
    (_event, startDate: string, endDate: string) => {
      const user = getOrCreateLocalUser();
      return getTodoStats(user.id, startDate, endDate);
    }
  );

  ipcMain.handle("local:clear-focus-todos", (_event, date: string) => {
    const user = getOrCreateLocalUser();
    clearFocusTodos(user.id, date);
    return { success: true };
  });
}
