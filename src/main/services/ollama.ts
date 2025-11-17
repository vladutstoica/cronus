import { Ollama } from 'ollama';
import { getBooleanSetting, getSetting } from '../database/services/settings';
import { AIProvider } from './aiProvider';

let ollamaClient: Ollama | null = null;

/**
 * Initialize Ollama client with optional custom host
 */
export function initializeOllama(customHost?: string): OllamaProvider {
  const host = customHost || getSetting('ollama_base_url') || 'http://localhost:11434';

  ollamaClient = new Ollama({ host });

  return new OllamaProvider(ollamaClient);
}

/**
 * Get the Ollama client instance
 */
export function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    const provider = initializeOllama();
    return provider['client']; // Access private client
  }
  return ollamaClient;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements AIProvider {
  private client: Ollama;

  constructor(client?: Ollama) {
    if (client) {
      this.client = client;
    } else {
      const host = getSetting('ollama_base_url') || 'http://localhost:11434';
      this.client = new Ollama({ host });
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  /**
   * List available Ollama models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.list();
      return response.models.map((m) => m.name);
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  /**
   * Generate a chat completion using Ollama
   */
  async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      format?: 'json' | undefined;
    }
  ): Promise<string | null> {
    try {
      const model = getOllamaModel();

      const response = await this.client.chat({
        model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 500
        },
        format: options?.format
      });

      return response.message.content;
    } catch (error) {
      console.error('Error generating Ollama completion:', error);
      return null;
    }
  }

  /**
   * Pull (download) an Ollama model
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      await this.client.pull({ model: modelName, stream: false });
      return true;
    } catch (error) {
      console.error(`Error pulling Ollama model ${modelName}:`, error);
      return false;
    }
  }
}

/**
 * Check if Ollama is available and configured
 * @deprecated Use OllamaProvider.isAvailable() instead
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const provider = new OllamaProvider();
  return provider.isAvailable();
}

/**
 * Check if AI categorization is enabled
 */
export function isAIEnabled(): boolean {
  return getBooleanSetting('ai_enabled', true);
}

/**
 * Get the configured Ollama model
 */
export function getOllamaModel(): string {
  return getSetting('ollama_model') || 'llama3.2:1b';
}

/**
 * Generate a chat completion using Ollama
 * @deprecated Use OllamaProvider.generateChatCompletion() instead
 */
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    format?: 'json' | undefined;
  }
): Promise<string | null> {
  if (!isAIEnabled()) {
    console.log('AI is disabled in settings');
    return null;
  }

  const provider = new OllamaProvider();
  const available = await provider.isAvailable();

  if (!available) {
    console.log('Ollama is not available');
    return null;
  }

  return provider.generateChatCompletion(messages, options);
}

/**
 * List available Ollama models
 * @deprecated Use OllamaProvider.listModels() instead
 */
export async function listOllamaModels(): Promise<string[]> {
  const provider = new OllamaProvider();
  return provider.listModels();
}

/**
 * Pull (download) an Ollama model
 * @deprecated Use OllamaProvider.pullModel() instead
 */
export async function pullOllamaModel(modelName: string): Promise<boolean> {
  const provider = new OllamaProvider();
  return provider.pullModel(modelName);
}
