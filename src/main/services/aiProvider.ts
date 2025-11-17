import { getSetting } from '../database/services/settings';
import { initializeOllama, OllamaProvider } from './ollama';
import { LMStudioProvider } from './lmstudio';

export type AIProviderType = 'ollama' | 'lmstudio';

/**
 * Common interface for AI providers
 */
export interface AIProvider {
  /**
   * Check if the provider is available and running
   */
  isAvailable(): Promise<boolean>;

  /**
   * List available models from the provider
   */
  listModels(): Promise<string[]>;

  /**
   * Generate a chat completion
   */
  generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      format?: 'json' | undefined;
    }
  ): Promise<string | null>;

  /**
   * Download/pull a model (optional, not all providers support this)
   */
  pullModel?(modelName: string): Promise<boolean>;
}

// Cache for provider availability to avoid repeated connection attempts
let availabilityCache: { [key: string]: { available: boolean; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Check if provider is available with caching
 */
async function checkProviderAvailability(
  provider: AIProvider,
  providerType: AIProviderType
): Promise<boolean> {
  const now = Date.now();
  const cached = availabilityCache[providerType];

  // Return cached result if still valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.available;
  }

  // Check availability and cache result
  try {
    const available = await provider.isAvailable();
    availabilityCache[providerType] = { available, timestamp: now };
    return available;
  } catch (error) {
    // Cache failure to avoid repeated failed connection attempts
    availabilityCache[providerType] = { available: false, timestamp: now };
    return false;
  }
}

/**
 * Clear availability cache (useful when settings change)
 */
export function clearAvailabilityCache() {
  availabilityCache = {};
}

/**
 * Get the active AI provider based on settings
 */
export function getActiveProvider(): AIProvider {
  const providerType = (getSetting('ai_provider') || 'ollama') as AIProviderType;

  switch (providerType) {
    case 'lmstudio':
      return new LMStudioProvider();
    case 'ollama':
    default:
      return new OllamaProvider();
  }
}

/**
 * Get the active provider type from settings
 */
export function getActiveProviderType(): AIProviderType {
  return (getSetting('ai_provider') || 'ollama') as AIProviderType;
}

/**
 * Check if the active provider is available (with caching)
 */
export async function isActiveProviderAvailable(): Promise<boolean> {
  const providerType = getActiveProviderType();
  const provider = getActiveProvider();
  return checkProviderAvailability(provider, providerType);
}

/**
 * Get a specific provider by type (for testing connections)
 */
export function getProviderByType(type: AIProviderType): AIProvider {
  switch (type) {
    case 'lmstudio':
      return new LMStudioProvider();
    case 'ollama':
      return new OllamaProvider();
  }
}

/**
 * Test connection to a specific provider with custom URL
 */
export async function testProviderConnection(
  type: AIProviderType,
  baseUrl?: string
): Promise<{ success: boolean; message: string; models?: string[] }> {
  try {
    let provider: AIProvider;

    if (type === 'ollama') {
      provider = initializeOllama(baseUrl);
    } else {
      provider = new LMStudioProvider(baseUrl);
    }

    const available = await provider.isAvailable();

    if (!available) {
      return {
        success: false,
        message: `Cannot connect to ${type === 'ollama' ? 'Ollama' : 'LM Studio'}. Make sure it's running.`
      };
    }

    const models = await provider.listModels();

    return {
      success: true,
      message: `Connected successfully! Found ${models.length} model${models.length !== 1 ? 's' : ''}.`,
      models
    };
  } catch (error) {
    console.error(`Error testing ${type} connection:`, error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
