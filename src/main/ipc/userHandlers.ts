import { ipcMain } from "electron";
import {
  getOrCreateLocalUser,
  updateUser,
} from "../database/services/users";

export function registerUserHandlers(): void {
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
}
