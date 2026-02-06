/**
 * Test setup for main process workspace.
 * Mocks electron, better-sqlite3, and native-window-observer.
 */
import { vi } from "vitest";

// Mock electron module globally
vi.mock("electron", () => import("./electron"));

// Mock native-window-observer (native addon not available in test)
vi.mock("native-window-observer", () => ({
  default: {
    getActiveWindow: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  getActiveWindow: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));
