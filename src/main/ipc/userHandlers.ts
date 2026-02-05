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
    let userGoals: string[] | string = [];

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

  ipcMain.handle(
    "local:update-user",
    (
      _event,
      updates: Partial<{
        name: string;
        email: string;
        has_completed_onboarding: boolean;
        electron_app_settings: Record<string, unknown> | string;
        user_projects_and_goals: string | string[];
      }>,
    ) => {
      const user = getOrCreateLocalUser();
      // Serialize electron_app_settings if it's an object before passing to updateUser
      const dbUpdates = { ...updates };
      if (
        dbUpdates.electron_app_settings &&
        typeof dbUpdates.electron_app_settings === "object"
      ) {
        dbUpdates.electron_app_settings = JSON.stringify(
          dbUpdates.electron_app_settings,
        );
      }
      const updatedUser = updateUser(
        user.id,
        dbUpdates as Partial<
          Omit<
            import("../database/services/users").User,
            "id" | "created_at" | "updated_at"
          >
        >,
      );
      if (!updatedUser) return null;

      // Parse JSON fields for frontend (with error handling)
      let electronSettings = {};
      let userGoals: string[] | string = [];

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
    },
  );
}
