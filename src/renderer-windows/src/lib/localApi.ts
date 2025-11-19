/**
 * Local API Client - Replaces tRPC with IPC calls
 * All data operations now happen locally via Electron IPC
 */

export const localApi = {
  // User operations
  user: {
    get: async () => {
      return window.electron.ipcRenderer.invoke("local:get-user");
    },
    update: async (updates: any) => {
      return window.electron.ipcRenderer.invoke("local:update-user", updates);
    },
  },

  // Category operations
  categories: {
    getAll: async () => {
      return window.electron.ipcRenderer.invoke("local:get-categories");
    },
    getById: async (id: string) => {
      return window.electron.ipcRenderer.invoke("local:get-category-by-id", id);
    },
    create: async (category: any) => {
      return window.electron.ipcRenderer.invoke(
        "local:create-category",
        category,
      );
    },
    update: async (id: string, updates: any) => {
      return window.electron.ipcRenderer.invoke(
        "local:update-category",
        id,
        updates,
      );
    },
    delete: async (id: string) => {
      return window.electron.ipcRenderer.invoke("local:delete-category", id);
    },
    deleteRecent: async () => {
      return window.electron.ipcRenderer.invoke(
        "local:delete-recent-categories",
      );
    },
    generateAiCategories: async (goals: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:generate-ai-categories",
        goals,
      );
    },
  },

  // Event operations
  events: {
    getAll: async (limit?: number, offset?: number) => {
      return window.electron.ipcRenderer.invoke(
        "local:get-events",
        limit,
        offset,
      );
    },
    getByDateRange: async (startDate: string, endDate: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:get-events-by-date-range",
        startDate,
        endDate,
      );
    },
    getById: async (id: string) => {
      return window.electron.ipcRenderer.invoke("local:get-event-by-id", id);
    },
    update: async (id: string, updates: any) => {
      return window.electron.ipcRenderer.invoke(
        "local:update-event",
        id,
        updates,
      );
    },
    getStatistics: async (startDate: string, endDate: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:get-user-statistics",
        startDate,
        endDate,
      );
    },
    recategorize: async (eventId: string, categoryId: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:recategorize-event",
        eventId,
        categoryId,
      );
    },
    recategorizeByIdentifier: async (
      identifier: string,
      itemType: "app" | "website",
      startDateMs: number,
      endDateMs: number,
      newCategoryId: string,
    ): Promise<number> => {
      return window.electron.ipcRenderer.invoke(
        "local:recategorize-events-by-identifier",
        identifier,
        itemType,
        startDateMs,
        endDateMs,
        newCategoryId,
      );
    },
  },

  // Window tracking operations
  tracking: {
    processEvent: async (eventDetails: any) => {
      return window.electron.ipcRenderer.invoke(
        "local:process-window-event",
        eventDetails,
      );
    },
    updateDuration: async (windowId: string, durationMs: number) => {
      return window.electron.ipcRenderer.invoke(
        "local:update-event-duration",
        windowId,
        durationMs,
      );
    },
    endEvent: async (windowId: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:end-window-event",
        windowId,
      );
    },
  },

  // Settings operations
  settings: {
    getAll: async () => {
      return window.electron.ipcRenderer.invoke("local:get-all-settings");
    },
    get: async (key: string) => {
      return window.electron.ipcRenderer.invoke("local:get-setting", key);
    },
    set: async (key: string, value: any) => {
      return window.electron.ipcRenderer.invoke(
        "local:set-setting",
        key,
        value,
      );
    },
    updateMany: async (settings: Record<string, any>) => {
      return window.electron.ipcRenderer.invoke(
        "local:update-settings",
        settings,
      );
    },
  },

  // Ollama/AI operations (deprecated, use ai.* instead)
  ollama: {
    listModels: async () => {
      return window.electron.ipcRenderer.invoke("local:list-ollama-models");
    },
    pullModel: async (modelName: string) => {
      return window.electron.ipcRenderer.invoke(
        "local:pull-ollama-model",
        modelName,
      );
    },
  },

  // AI Provider operations
  ai: {
    testConnection: async (
      provider: "ollama" | "lmstudio",
      baseUrl?: string,
    ): Promise<{ success: boolean; message: string; models?: string[] }> => {
      return window.electron.ipcRenderer.invoke(
        "local:test-ai-provider-connection",
        provider,
        baseUrl,
      );
    },
    listModels: async (): Promise<string[]> => {
      return window.electron.ipcRenderer.invoke("local:list-ai-models");
    },
    listProviderModels: async (
      provider: "ollama" | "lmstudio",
    ): Promise<string[]> => {
      return window.electron.ipcRenderer.invoke(
        "local:list-provider-models",
        provider,
      );
    },
    clearAvailabilityCache: async (): Promise<void> => {
      return window.electron.ipcRenderer.invoke(
        "local:clear-ai-availability-cache",
      );
    },
  },
};

// Helper hooks for React Query (if needed)
export const useLocalUser = () => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    localApi.user
      .get()
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data: user, isLoading: loading, error };
};

export const useLocalCategories = () => {
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    localApi.categories
      .getAll()
      .then(setCategories)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await localApi.categories.getAll();
      setCategories(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data: categories, isLoading: loading, error, refetch };
};

// Add React import for hooks
import React from "react";
