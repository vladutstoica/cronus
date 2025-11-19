import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { localApi } from "../../lib/localApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

type AIProvider = "ollama" | "lmstudio";

interface ConnectionStatus {
  tested: boolean;
  connected: boolean;
  message: string;
}

export function AISettings() {
  // General AI settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [screenshotsEnabled, setScreenshotsEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("ollama");

  // Ollama settings
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2:1b");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<ConnectionStatus>({
    tested: false,
    connected: false,
    message: "",
  });

  // LM Studio settings
  const [lmstudioBaseUrl, setLmstudioBaseUrl] = useState(
    "http://localhost:1234/v1",
  );
  const [lmstudioModel, setLmstudioModel] = useState("");
  const [lmstudioModels, setLmstudioModels] = useState<string[]>([]);
  const [lmstudioStatus, setLmstudioStatus] = useState<ConnectionStatus>({
    tested: false,
    connected: false,
    message: "",
  });

  // Loading states
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await localApi.settings.getAll();
      setAiEnabled(settings.ai_enabled === "true");
      setScreenshotsEnabled(settings.screenshots_enabled === "true");
      const provider = (settings.ai_provider as AIProvider) || "ollama";
      setSelectedProvider(provider);
      setOllamaBaseUrl(settings.ollama_base_url || "http://localhost:11434");
      setOllamaModel(settings.ollama_model || "llama3.2:1b");
      setLmstudioBaseUrl(
        settings.lmstudio_base_url || "http://localhost:1234/v1",
      );
      setLmstudioModel(settings.lmstudio_model || "");

      // Auto-test connection and load models if provider is configured
      if (settings.ai_enabled === "true") {
        // Test connection for the active provider
        const baseUrl =
          provider === "ollama"
            ? settings.ollama_base_url || "http://localhost:11434"
            : settings.lmstudio_base_url || "http://localhost:1234/v1";

        const result = await localApi.ai.testConnection(provider, baseUrl);

        const status = {
          tested: true,
          connected: result.success,
          message: result.success ? "Connected" : result.message,
        };

        if (provider === "ollama") {
          setOllamaStatus(status);
          if (result.success && result.models) {
            setOllamaModels(result.models);
          }
        } else {
          setLmstudioStatus(status);
          if (result.success && result.models) {
            setLmstudioModels(result.models);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleAIToggle = async (checked: boolean) => {
    setAiEnabled(checked);
    await localApi.settings.set("ai_enabled", checked);
  };

  const handleScreenshotsToggle = async (checked: boolean) => {
    setScreenshotsEnabled(checked);
    await localApi.settings.set("screenshots_enabled", checked);
  };

  const handleProviderChange = async (provider: AIProvider) => {
    setSelectedProvider(provider);
    await localApi.settings.set("ai_provider", provider);

    // Clear availability cache when provider changes
    await localApi.ai.clearAvailabilityCache();
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setIsTestingConnection(true);
    const baseUrl = provider === "ollama" ? ollamaBaseUrl : lmstudioBaseUrl;

    try {
      const result = await localApi.ai.testConnection(provider, baseUrl);

      const status: ConnectionStatus = {
        tested: true,
        connected: result.success,
        message: result.message,
      };

      if (provider === "ollama") {
        setOllamaStatus(status);
        if (result.success && result.models) {
          setOllamaModels(result.models);
          // Auto-select first model if none selected
          if (!ollamaModel && result.models.length > 0) {
            setOllamaModel(result.models[0]);
            await localApi.settings.set("ollama_model", result.models[0]);
          }
        }
      } else {
        setLmstudioStatus(status);
        if (result.success && result.models) {
          setLmstudioModels(result.models);
          // Auto-select first model if none selected
          if (!lmstudioModel && result.models.length > 0) {
            setLmstudioModel(result.models[0]);
            await localApi.settings.set("lmstudio_model", result.models[0]);
          }
        }
      }
    } catch (error) {
      const status: ConnectionStatus = {
        tested: true,
        connected: false,
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };

      if (provider === "ollama") {
        setOllamaStatus(status);
      } else {
        setLmstudioStatus(status);
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRefreshModels = async (provider: AIProvider) => {
    setIsLoadingModels(true);
    try {
      const models = await localApi.ai.listProviderModels(provider);
      if (provider === "ollama") {
        setOllamaModels(models);
      } else {
        setLmstudioModels(models);
      }
    } catch (error) {
      console.error("Failed to refresh models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleOllamaBaseUrlChange = async (url: string) => {
    setOllamaBaseUrl(url);
    await localApi.settings.set("ollama_base_url", url);
    // Reset connection status when URL changes
    setOllamaStatus({ tested: false, connected: false, message: "" });
  };

  const handleLmstudioBaseUrlChange = async (url: string) => {
    setLmstudioBaseUrl(url);
    await localApi.settings.set("lmstudio_base_url", url);
    // Reset connection status when URL changes
    setLmstudioStatus({ tested: false, connected: false, message: "" });
  };

  const handleOllamaModelChange = async (model: string) => {
    setOllamaModel(model);
    await localApi.settings.set("ollama_model", model);
  };

  const handleLmstudioModelChange = async (model: string) => {
    setLmstudioModel(model);
    await localApi.settings.set("lmstudio_model", model);
  };

  const handleDownloadModel = async (modelName: string) => {
    setIsDownloading(true);
    try {
      await localApi.ollama.pullModel(modelName);
      await handleRefreshModels("ollama");
    } catch (error) {
      console.error("Failed to download model:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const popularModels = [
    {
      name: "llama3.2:1b",
      description: "Fastest & lightweight (~1.3GB)",
      recommended: true,
    },
    {
      name: "llama3.2:3b",
      description: "Fast & balanced (~2GB)",
      recommended: false,
    },
    {
      name: "llama3.1",
      description: "More accurate (~4.7GB)",
      recommended: false,
    },
    {
      name: "mistral",
      description: "Alternative model (~4GB)",
      recommended: false,
    },
  ];

  const currentStatus =
    selectedProvider === "ollama" ? ollamaStatus : lmstudioStatus;

  return (
    <div className="bg-muted/30 rounded-lg p-6 border border-border space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Third-party AI Providers</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Use local AI models with Ollama or LM Studio for intelligent
          categorization. No API keys needed!
        </p>
        <div className="flex gap-3 text-xs">
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Learn about Ollama →
          </a>
          <a
            href="https://lmstudio.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Learn about LM Studio →
          </a>
        </div>
      </div>

      {/* AI Enabled Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="ai-enabled">Enable AI Categorization</Label>
          <p className="text-sm text-muted-foreground">
            Use AI to intelligently categorize your activities
          </p>
        </div>
        <Switch
          id="ai-enabled"
          checked={aiEnabled}
          onCheckedChange={handleAIToggle}
        />
      </div>

      {/* Provider Selection */}
      {aiEnabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="provider-select">AI Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger id="provider-select">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama</SelectItem>
                <SelectItem value="lmstudio">LM Studio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ollama Configuration */}
          {selectedProvider === "ollama" && (
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-sm font-medium">Ollama Configuration</h3>

              {/* Base URL */}
              <div className="space-y-2">
                <Label htmlFor="ollama-url">Base URL</Label>
                <Input
                  id="ollama-url"
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(e) => handleOllamaBaseUrlChange(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("ollama")}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                {currentStatus.tested && (
                  <div className="flex items-center gap-2">
                    {currentStatus.connected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">
                          {currentStatus.message}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          {currentStatus.message}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              {currentStatus.connected && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ollama-model">Model</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefreshModels("ollama")}
                      disabled={isLoadingModels}
                      className="h-6 px-2"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isLoadingModels ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                  <Select
                    value={ollamaModel}
                    onValueChange={handleOllamaModelChange}
                  >
                    <SelectTrigger id="ollama-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.length > 0 ? (
                        ollamaModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No models found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Download Models Section */}
              {currentStatus.connected && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      Download Models
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Install popular models for AI categorization
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {popularModels.map((model) => {
                      const isInstalled = ollamaModels.some((m) =>
                        m.includes(model.name),
                      );
                      return (
                        <div
                          key={model.name}
                          className="flex items-center justify-between p-3 rounded-md border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {model.name}
                              </span>
                              {model.recommended && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Recommended
                                </span>
                              )}
                              {isInstalled && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {model.description}
                            </p>
                          </div>
                          {!isInstalled && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadModel(model.name)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LM Studio Configuration */}
          {selectedProvider === "lmstudio" && (
            <div className="space-y-4 p-4 border rounded-lg bg-background">
              <h3 className="text-sm font-medium">LM Studio Configuration</h3>

              {/* Base URL */}
              <div className="space-y-2">
                <Label htmlFor="lmstudio-url">Base URL</Label>
                <Input
                  id="lmstudio-url"
                  type="text"
                  value={lmstudioBaseUrl}
                  onChange={(e) => handleLmstudioBaseUrlChange(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                />
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("lmstudio")}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                {currentStatus.tested && (
                  <div className="flex items-center gap-2">
                    {currentStatus.connected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">
                          {currentStatus.message}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          {currentStatus.message}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              {currentStatus.connected && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lmstudio-model">Model</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefreshModels("lmstudio")}
                      disabled={isLoadingModels}
                      className="h-6 px-2"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isLoadingModels ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                  <Select
                    value={lmstudioModel}
                    onValueChange={handleLmstudioModelChange}
                  >
                    <SelectTrigger id="lmstudio-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {lmstudioModels.length > 0 ? (
                        lmstudioModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No models loaded
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Load a model in LM Studio first, then refresh the list
                    above.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Screenshots Toggle */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="space-y-0.5">
          <Label htmlFor="screenshots-enabled">Enable Screenshots</Label>
          <p className="text-sm text-muted-foreground">
            Capture screenshots of your activities (stored locally)
          </p>
        </div>
        <Switch
          id="screenshots-enabled"
          checked={screenshotsEnabled}
          onCheckedChange={handleScreenshotsToggle}
        />
      </div>

      {/* Info Section */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
        <p className="text-xs text-foreground">
          <strong>Privacy First:</strong> All AI processing happens on your
          machine. No data is sent to external servers. Both Ollama and LM
          Studio are free and open-source.
        </p>
      </div>
    </div>
  );
}
