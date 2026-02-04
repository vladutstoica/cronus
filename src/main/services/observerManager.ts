import { nativeWindowObserver } from "native-window-observer";
import { ActiveWindowDetails } from "@shared/types";

type WindowChangeCallback = (windowInfo: ActiveWindowDetails | null) => void;

let isTrackingPaused = false;
let windowChangeCallback: WindowChangeCallback | null = null;

/**
 * Set the callback that will be invoked on each active window change.
 * Must be called before startActiveWindowObserver.
 */
export function setWindowChangeCallback(callback: WindowChangeCallback): void {
  windowChangeCallback = callback;
}

/**
 * Start (or resume) the native active window observer.
 */
export function startActiveWindowObserver(): void {
  isTrackingPaused = false;

  if (!windowChangeCallback) {
    console.error(
      "[ObserverManager] Cannot start: no windowChangeCallback set",
    );
    return;
  }

  // Log permission status for debugging
  const { PermissionType } = require("native-window-observer");
  const screenRecordingStatus = nativeWindowObserver.getPermissionStatus(
    PermissionType.ScreenRecording,
  );
  console.log(
    `[Main] Screen Recording permission status: ${screenRecordingStatus} (0=Denied, 1=Granted, 2=Pending)`,
  );

  nativeWindowObserver.startActiveWindowObserver(windowChangeCallback);
}

/**
 * Stop (pause) the native active window observer.
 */
export function stopActiveWindowObserver(): void {
  isTrackingPaused = true;
  nativeWindowObserver.stopActiveWindowObserver();
}

/**
 * Check if tracking is currently paused.
 */
export function getIsTrackingPaused(): boolean {
  return isTrackingPaused;
}
