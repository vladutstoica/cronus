import { ipcMain } from "electron";
import {
  getAllSettings,
  getSetting,
  setSetting,
  updateSettings,
} from "../database/services/settings";

export function registerSettingsHandlers(): void {
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
}
