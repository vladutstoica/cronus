/**
 * Mock for the 'electron' module used in main process tests.
 * Provides stubs for commonly used Electron APIs.
 */
import { vi } from "vitest";

export const app = {
  getPath: vi.fn().mockReturnValue("/tmp/test-user-data"),
  getName: vi.fn().mockReturnValue("cronus-test"),
  getVersion: vi.fn().mockReturnValue("0.0.0-test"),
  on: vi.fn(),
  quit: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
};

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
  },
}));

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
};

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
  removeListener: vi.fn(),
};

export const nativeTheme = {
  shouldUseDarkColors: false,
  themeSource: "system",
  on: vi.fn(),
};

export const dialog = {
  showMessageBox: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
};

export const shell = {
  openExternal: vi.fn(),
  openPath: vi.fn(),
};

export default {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  nativeTheme,
  dialog,
  shell,
};
