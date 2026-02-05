import { BrowserWindow } from "electron";
import { Windows } from "./shared";
import { registerUserHandlers } from "./userHandlers";
import { registerCategoryHandlers } from "./categoryHandlers";
import { registerEventHandlers } from "./eventHandlers";
import { registerTodoHandlers } from "./todoHandlers";
import { registerWorkSessionHandlers } from "./workSessionHandlers";
import { registerTrayHandlers } from "./trayHandlers";
import { registerAiHandlers } from "./aiHandlers";
import { registerFileHandlers } from "./fileHandlers";
import { registerWindowHandlers } from "./windowHandlers";
import { registerSettingsHandlers } from "./settingsHandlers";
import { registerExportHandlers } from "./exportHandlers";

export function registerIpcHandlers(
  windows: Windows,
  recreateFloatingWindow: () => void,
  recreateMainWindow: () => BrowserWindow,
): void {
  // Register all domain-specific handlers
  registerUserHandlers();
  registerCategoryHandlers();
  registerEventHandlers();
  registerTodoHandlers();
  registerWorkSessionHandlers();
  registerTrayHandlers(windows, recreateMainWindow);
  registerAiHandlers();
  registerFileHandlers();
  registerWindowHandlers(windows, recreateFloatingWindow, recreateMainWindow);
  registerSettingsHandlers();
  registerExportHandlers();
}
