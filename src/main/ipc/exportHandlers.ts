/**
 * Export IPC Handlers
 *
 * Handles IPC communication for data export functionality.
 */

import { ipcMain, dialog, BrowserWindow } from "electron";
import {
  exportToCSV,
  exportToJSON,
  generateExportFilename,
} from "../services/exportService";
import {
  ExportOptions,
  ExportFormat,
  ExportResult,
  ExportProgress,
} from "../../shared/exportTypes";

/**
 * Register export-related IPC handlers
 */
export function registerExportHandlers(): void {
  /**
   * Start export with options
   * Shows save dialog and performs export
   */
  ipcMain.handle(
    "export:start",
    async (event, options: ExportOptions): Promise<ExportResult> => {
      try {
        // Get the window that sent the request
        const window = BrowserWindow.fromWebContents(event.sender);

        // Generate default filename
        const defaultFilename = generateExportFilename(
          options.format,
          options.dataType,
        );

        // Show save dialog
        const dialogOptions = {
          title: "Export Data",
          defaultPath: defaultFilename,
          filters:
            options.format === ExportFormat.CSV
              ? [
                  { name: "CSV Files", extensions: ["csv"] },
                  { name: "All Files", extensions: ["*"] },
                ]
              : [
                  { name: "JSON Files", extensions: ["json"] },
                  { name: "All Files", extensions: ["*"] },
                ],
        };

        const parentWindow = window || BrowserWindow.getFocusedWindow();
        const dialogResult = parentWindow
          ? await dialog.showSaveDialog(parentWindow, dialogOptions)
          : await dialog.showSaveDialog(dialogOptions);

        // User cancelled
        if (dialogResult.canceled || !dialogResult.filePath) {
          return {
            success: false,
            error: "Export cancelled by user",
          };
        }

        const filePath = dialogResult.filePath;

        // Progress callback to send updates to renderer
        const onProgress = (progress: ExportProgress): void => {
          event.sender.send("export:progress", progress);
        };

        // Perform export based on format
        let result: ExportResult;
        if (options.format === ExportFormat.CSV) {
          result = await exportToCSV(options, filePath, onProgress);
        } else {
          result = await exportToJSON(options, filePath, onProgress);
        }

        return result;
      } catch (error) {
        console.error("[ExportHandlers] Export failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );

  /**
   * Get estimated export size
   * Useful for showing user what to expect
   */
  ipcMain.handle(
    "export:estimate",
    async (
      _event,
      options: ExportOptions,
    ): Promise<{
      estimatedActivities: number;
      estimatedCategories: number;
    }> => {
      try {
        // This is a quick estimation - we could make it more accurate
        // by actually counting the records, but for now we'll return a rough estimate
        const { getOrCreateLocalUser } = await import(
          "../database/services/users"
        );
        const { getCategoriesByUserId } = await import(
          "../database/services/categories"
        );
        const { getEventsByUserAndTimeRange } = await import(
          "../database/services/activeWindowEvents"
        );

        const user = getOrCreateLocalUser();

        const categories = getCategoriesByUserId(user.id, true);

        const startDate = options.dateRange
          ? new Date(options.dateRange.startDate)
          : new Date(0);
        const endDate = options.dateRange
          ? new Date(options.dateRange.endDate)
          : new Date();

        const events = getEventsByUserAndTimeRange(user.id, startDate, endDate);

        return {
          estimatedActivities: events.length,
          estimatedCategories: categories.length,
        };
      } catch (error) {
        console.error("[ExportHandlers] Estimation failed:", error);
        return {
          estimatedActivities: 0,
          estimatedCategories: 0,
        };
      }
    },
  );
}
