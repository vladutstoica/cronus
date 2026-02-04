import { ipcMain } from "electron";
import { listOllamaModels, pullOllamaModel } from "../services/ollama";
import { generateCategorySuggestions } from "../services/categorization";

export function registerAiHandlers(): void {
  ipcMain.handle(
    "local:generate-ai-categories",
    async (_event, goals: string) => {
      const categories = await generateCategorySuggestions(goals);
      return { categories };
    },
  );

  // Ollama handlers (deprecated, use provider handlers)
  ipcMain.handle("local:list-ollama-models", () => {
    return listOllamaModels();
  });

  ipcMain.handle("local:pull-ollama-model", (_event, modelName: string) => {
    return pullOllamaModel(modelName);
  });

  // AI Provider handlers
  ipcMain.handle(
    "local:test-ai-provider-connection",
    async (_event, type: "ollama" | "lmstudio", baseUrl?: string) => {
      const { testProviderConnection } = await import("../services/aiProvider");
      return testProviderConnection(type, baseUrl);
    },
  );

  ipcMain.handle("local:list-ai-models", async () => {
    const { getActiveProvider } = await import("../services/aiProvider");
    const provider = getActiveProvider();
    return provider.listModels();
  });

  ipcMain.handle(
    "local:list-provider-models",
    async (_event, type: "ollama" | "lmstudio") => {
      const { getProviderByType } = await import("../services/aiProvider");
      const provider = getProviderByType(type);
      return provider.listModels();
    },
  );

  ipcMain.handle("local:clear-ai-availability-cache", async () => {
    const { clearAvailabilityCache } = await import("../services/aiProvider");
    clearAvailabilityCache();
  });
}
