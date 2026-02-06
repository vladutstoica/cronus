import { is } from "@electron-toolkit/utils";
import { ipcMain, shell } from "electron";
import fs from "fs/promises";
import { join } from "path";
import { isPathAllowed } from "../pathValidation";

export function registerFileHandlers(): void {
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
    if (!isPathAllowed(filePath)) {
      console.warn(
        `[IPC] Blocked read-file access to path outside allowed directories: ${filePath}`,
      );
      throw new Error(
        "Access denied: file path is outside allowed directories",
      );
    }
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });

  ipcMain.handle("delete-file", async (_event, filePath: string) => {
    if (!isPathAllowed(filePath)) {
      console.warn(
        `[IPC] Blocked delete-file access to path outside allowed directories: ${filePath}`,
      );
      throw new Error(
        "Access denied: file path is outside allowed directories",
      );
    }
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file via IPC:", error);
    }
  });

  ipcMain.on("open-external-url", (_event, url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        console.warn(
          `[IPC] Blocked open-external-url with unsafe protocol: ${parsed.protocol}`,
        );
        return;
      }
      shell.openExternal(url);
    } catch {
      console.warn(`[IPC] Blocked open-external-url with invalid URL: ${url}`);
    }
  });
}
