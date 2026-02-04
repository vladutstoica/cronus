import { BrowserWindow } from "electron";

export interface Windows {
  mainWindow: BrowserWindow | null;
  floatingWindow: BrowserWindow | null;
  trayPopoverWindow: BrowserWindow | null;
}
