import OpenAI from "openai";
import { AIProvider } from "./aiProvider";
import { getSetting } from "../database/services/settings";

/**
 * LM Studio provider implementation using OpenAI-compatible API
 */
export class LMStudioProvider implements AIProvider {
  private client: OpenAI;
  private baseUrl: string;

  constructor(customBaseUrl?: string) {
    this.baseUrl =
      customBaseUrl ||
      getSetting("lmstudio_base_url") ||
      "http://localhost:1234/v1";

    this.client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: "lm-studio", // LM Studio doesn't require a real API key for local server
    });
  }

  /**
   * Check if LM Studio is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.warn("LM Studio not available:", error);
      return false;
    }
  }

  /**
   * List available models from LM Studio
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      console.error("Error listing LM Studio models:", error);
      return [];
    }
  }

  /**
   * Generate a chat completion using LM Studio
   */
  async generateChatCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      format?: "json" | undefined;
    },
  ): Promise<string | null> {
    try {
      const model =
        getSetting("lmstudio_model") || (await this.getDefaultModel());

      if (!model) {
        console.error("No LM Studio model configured");
        return null;
      }

      const completionParams: any = {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
      };

      // LM Studio doesn't support response_format in the same way as OpenAI
      // We'll rely on prompt engineering for JSON output instead
      // The error says: "'response_format.type' must be 'json_schema' or 'text'"
      // But for simplicity, we'll just omit it and rely on the prompt

      const completion =
        await this.client.chat.completions.create(completionParams);

      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      console.error("Error generating LM Studio completion:", error);
      return null;
    }
  }

  /**
   * Get the first available model as default
   */
  private async getDefaultModel(): Promise<string | null> {
    const models = await this.listModels();
    return models.length > 0 ? models[0] : null;
  }

  /**
   * LM Studio doesn't support pulling models via API (models must be downloaded manually)
   */
  pullModel?(modelName: string): Promise<boolean> {
    console.warn(
      "LM Studio does not support pulling models via API. Please download models manually.",
    );
    return Promise.resolve(false);
  }
}
