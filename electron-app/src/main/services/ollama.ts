import { Ollama } from 'ollama';
import { getBooleanSetting, getSetting } from '../database/services/settings';

let ollamaClient: Ollama | null = null;

/**
 * Initialize Ollama client
 */
export function initializeOllama(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({
      host: 'http://localhost:11434' // Default Ollama host
    });
  }
  return ollamaClient;
}

/**
 * Get the Ollama client instance
 */
export function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    return initializeOllama();
  }
  return ollamaClient;
}

/**
 * Check if Ollama is available and configured
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const client = getOllamaClient();
    await client.list(); // Try to list models to check if Ollama is running
    return true;
  } catch (error) {
    console.warn('Ollama not available:', error);
    return false;
  }
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
  return getSetting('ollama_model') || 'llama3.2';
}

/**
 * Generate a chat completion using Ollama
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

  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Ollama is not available');
    return null;
  }

  try {
    const client = getOllamaClient();
    const model = getOllamaModel();

    const response = await client.chat({
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
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const client = getOllamaClient();
    const response = await client.list();
    return response.models.map(m => m.name);
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

/**
 * Pull (download) an Ollama model
 */
export async function pullOllamaModel(modelName: string): Promise<boolean> {
  try {
    const client = getOllamaClient();
    await client.pull({ model: modelName, stream: false });
    return true;
  } catch (error) {
    console.error(`Error pulling Ollama model ${modelName}:`, error);
    return false;
  }
}
