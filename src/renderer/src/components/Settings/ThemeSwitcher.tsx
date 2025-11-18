import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { Theme } from "../../contexts/ThemeContext";
import { useTheme } from "../../contexts/ThemeContext";
import { localApi } from "../../lib/localApi";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [previousTheme, setPreviousTheme] = useState<Theme>(theme);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load theme from backend
  useEffect(() => {
    if (user) {
      loadTheme();
    }
  }, [user]);

  const loadTheme = async () => {
    setIsLoadingSettings(true);
    try {
      const userData = await localApi.user.get();
      if (
        userData &&
        userData.electron_app_settings &&
        userData.electron_app_settings.theme
      ) {
        const backendTheme = userData.electron_app_settings.theme as
          | "light"
          | "dark"
          | "system";
        setTheme(backendTheme);
        setPreviousTheme(backendTheme);
      }
    } catch (error) {
      console.error("Failed to fetch theme settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // This effect synchronizes the local previousTheme state if the theme is changed by other means
  useEffect(() => {
    setPreviousTheme(theme);
  }, [theme]);

  const handleSetTheme = async (newTheme: "light" | "dark" | "system") => {
    setPreviousTheme(theme); // Store current theme as previous before attempting change
    setTheme(newTheme); // Optimistically update UI

    setIsUpdating(true);
    try {
      await localApi.user.update({
        electron_app_settings: {
          theme: newTheme,
        },
      });
      localStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Failed to update theme:", error);
      // Revert to the previous theme on error
      setTheme(previousTheme);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="flex space-x-2">
              <div className="h-10 w-20 bg-muted rounded-md"></div>
              <div className="h-10 w-20 bg-muted rounded-md"></div>
              <div className="h-10 w-20 bg-muted rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Button
            onClick={() => handleSetTheme("light")}
            variant={theme === "light" ? "default" : "outline"}
            disabled={isUpdating}
          >
            Light
          </Button>
          <Button
            onClick={() => handleSetTheme("dark")}
            variant={theme === "dark" ? "default" : "outline"}
            disabled={isUpdating}
          >
            Dark
          </Button>
          <Button
            onClick={() => handleSetTheme("system")}
            variant={theme === "system" ? "default" : "outline"}
            disabled={isUpdating}
          >
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
