const bindings = require("bindings");

// Load the native addon using standard bindings package
const addon = bindings("nativeWindowObserver");

// Export enums that match the native layer
const PermissionType = {
  Accessibility: 0,
  AppleEvents: 1,
  ScreenRecording: 2,
};

const PermissionStatus = {
  Denied: 0,
  Granted: 1,
  Pending: 2,
};

class NativeWindowObserver {
  /**
   * Subscribes to active window changes
   */
  startActiveWindowObserver(callback) {
    addon.startActiveWindowObserver((jsonString) => {
      try {
        if (jsonString) {
          const detailsJson = JSON.parse(jsonString);
          // Ensure that the id field from the native module is mapped to windowId
          const details = {
            ...detailsJson,
            windowId: detailsJson.id || 0, // Default to 0 if id is missing
          };
          delete details.id; // remove original id if it exists to avoid confusion
          callback(details);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error(
          "Error parsing window details JSON:",
          error,
          "Received string:",
          jsonString,
        );
        callback(null);
      }
    });
  }

  stopActiveWindowObserver() {
    addon.stopActiveWindowObserver();
  }

  /**
   * Controls whether explicit permission dialogs should be shown to users
   * Call this with true after onboarding is complete to enable permission requests
   * This does NOT prevent automatic system dialogs when APIs are first used
   */
  setPermissionDialogsEnabled(enabled) {
    addon.setPermissionDialogsEnabled(enabled);
  }

  /**
   * Gets the icon path for a specific app
   * @param {string} appName The name of the app
   * @returns {string|null} The path to the icon file, or null if not found
   */
  getAppIconPath(appName) {
    return addon.getAppIconPath(appName);
  }

  /**
   * Returns whether explicit permission requests are currently enabled
   * This does NOT indicate whether automatic system dialogs are prevented
   */
  getPermissionDialogsEnabled() {
    return addon.getPermissionDialogsEnabled();
  }

  /**
   * Gets the status of a specific permission
   * @param {number} permissionType The permission type to check
   * @returns {number} PermissionStatus enum value
   */
  getPermissionStatus(permissionType) {
    return addon.getPermissionStatus(permissionType);
  }

  /**
   * Checks if the app has permissions for title extraction
   */
  hasPermissionsForTitleExtraction() {
    return addon.hasPermissionsForTitleExtraction();
  }

  /**
   * Checks if the app has permissions for content extraction
   */
  hasPermissionsForContentExtraction() {
    return addon.hasPermissionsForContentExtraction();
  }

  /**
   * Captures screenshot and performs ocr for current window
   */
  captureScreenshotAndOCRForCurrentWindow() {
    return addon.captureScreenshotAndOCRForCurrentWindow();
  }

  /**
   * Manually requests a specific permission
   * @param {number} permissionType The permission type to request
   */
  requestPermission(permissionType) {
    addon.requestPermission(permissionType);
  }
}

const nativeWindowObserver = new NativeWindowObserver();

module.exports = {
  nativeWindowObserver,
  PermissionType,
  PermissionStatus,
};
