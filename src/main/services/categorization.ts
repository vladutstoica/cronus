import { getActiveProvider, isActiveProviderAvailable } from './aiProvider';
import { isAIEnabled } from './ollama';
import { Category } from '../database/services/categories';
import crypto from 'crypto';

export interface ActivityDetails {
  ownerName?: string;
  title?: string;
  url?: string;
  content?: string;
  type?: string;
  browser?: string;
}

export interface CategoryChoice {
  chosenCategoryName: string;
  summary: string;
  reasoning: string;
}

// OPTIMIZATION: Request deduplication cache
// Prevents categorizing the same activity multiple times
interface CachedCategorization {
  result: CategoryChoice;
  timestamp: number;
}

const categorizationCache = new Map<string, CachedCategorization>();
const CATEGORIZATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a hash for an activity to detect duplicates
 */
function generateActivityHash(activityDetails: ActivityDetails): string {
  const key = `${activityDetails.ownerName || ''}_${activityDetails.url || ''}_${activityDetails.title || ''}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

/**
 * Check if we recently categorized this exact activity
 */
function getCachedCategorization(activityDetails: ActivityDetails): CategoryChoice | null {
  const hash = generateActivityHash(activityDetails);
  const cached = categorizationCache.get(hash);

  if (!cached) {
    return null;
  }

  // Check if cache is still valid
  const now = Date.now();
  if (now - cached.timestamp > CATEGORIZATION_CACHE_DURATION) {
    categorizationCache.delete(hash);
    return null;
  }

  return cached.result;
}

/**
 * Cache a categorization result
 */
function cacheCategorization(activityDetails: ActivityDetails, result: CategoryChoice): void {
  const hash = generateActivityHash(activityDetails);
  categorizationCache.set(hash, {
    result,
    timestamp: Date.now()
  });
}

/**
 * Build prompt for category choice
 */
function buildCategoryChoicePrompt(
  userProjectsAndGoals: string,
  userCategories: Pick<Category, 'name' | 'description'>[],
  activityDetails: ActivityDetails
) {
  const { ownerName, title, url, content, type, browser } = activityDetails;

  const categoryListForPrompt = userCategories
    .map((cat) => `- "${cat.name}"${cat.description ? ': ' + cat.description : ''}`)
    .join('\n  ');

  const MAX_URL_LENGTH = 150;
  const MAX_CONTENT_LENGTH = 7000;
  const truncatedUrl =
    url && url.length > MAX_URL_LENGTH ? `${url.slice(0, MAX_URL_LENGTH)}...` : url;
  const truncatedContent =
    content && content.length > MAX_CONTENT_LENGTH
      ? `${content.slice(0, MAX_CONTENT_LENGTH)}...`
      : content;

  const activityDetailsString = [
    ownerName && `Application: ${ownerName}`,
    title && `Window Title: ${title}`,
    truncatedUrl && `URL: ${truncatedUrl}`,
    truncatedContent && `Page Content: ${truncatedContent}`,
    type && `Type: ${type}`,
    browser && `Browser: ${browser}`
  ]
    .filter(Boolean)
    .join('\n    ');

  return [
    {
      role: 'user' as const,
      content: `You categorize user activities into categories. Here is the current activity:

ACTIVITY:
${activityDetailsString}

USER CATEGORIES:
${categoryListForPrompt}

USER GOALS:
${userProjectsAndGoals || 'Not set'}

CATEGORIZATION RULES:

1. Professional tools (IDE, code editor, Office apps, Slack, Teams) → Work

2. For browsers (Arc, Chrome, Safari, Firefox, Edge):
   - Check the URL domain to determine category
   - Work domains: github.com, gitlab.com, stackoverflow.com, atlassian.net, jira, linear.app, docs.
   - Entertainment domains: facebook.com, instagram.com, reddit.com, twitter.com, tiktok.com, youtube.com, amazon.com, ebay.com, kickstarter.com, netflix.com
   - If URL matches work domain → Work
   - If URL matches entertainment domain → Entertainment

3. Examples:
   - Arc + github.com/repo → Work
   - Arc + facebook.com → Entertainment
   - VS Code → Work
   - Chrome + stackoverflow.com → Work
   - Chrome + kickstarter.com → Entertainment

Respond ONLY with JSON, no markdown, no explanations:
{
  "chosenCategoryName": "category name",
  "summary": "brief activity summary (max 10 words)",
  "reasoning": "why this category (max 20 words)"
}`
    }
  ];
}

/**
 * Get AI category choice using active provider
 */
export async function getAICategoryChoice(
  userProjectsAndGoals: string,
  userCategories: Pick<Category, 'name' | 'description'>[],
  activityDetails: ActivityDetails
): Promise<CategoryChoice | null> {
  // OPTIMIZATION: Check cache first - reuse AI's previous decision for identical activities
  const cachedResult = getCachedCategorization(activityDetails);
  if (cachedResult) {
    console.log(`💾 CACHED: ${activityDetails.ownerName || activityDetails.url} → ${cachedResult.chosenCategoryName} (reusing AI decision from cache)`);
    return cachedResult;
  }

  if (!isAIEnabled()) {
    return null;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return null;
  }

  const provider = getActiveProvider();

  const messages = buildCategoryChoicePrompt(
    userProjectsAndGoals,
    userCategories,
    activityDetails
  );

  // 🔍 LOG: What we're sending to AI
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 AI CATEGORIZATION REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 User Goals:', userProjectsAndGoals || '(none set)');
  console.log('📁 Available Categories:', userCategories.map(c => c.name).join(', '));
  console.log('🎯 Current Activity:');
  console.log('  - App/Browser:', activityDetails.ownerName);
  console.log('  - Title:', activityDetails.title || '(none)');
  console.log('  - URL:', activityDetails.url || '(none)');
  console.log('  - Content preview:', activityDetails.content
    ? activityDetails.content.substring(0, 200) + '...'
    : '(none)');
  console.log('\n📨 Full Prompt Sent to AI:');
  console.log(JSON.stringify(messages, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await provider.generateChatCompletion(messages, {
      temperature: 0.2,
      format: 'json'
    });

    // 🔍 LOG: What AI responded
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 AI CATEGORIZATION RESPONSE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Raw response:', response);

    if (!response) {
      console.log('❌ No response from AI');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return null;
    }

    // Clean up markdown code blocks and extra explanations
    let cleanedResponse = response.trim();

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n?/i, '')  // Remove opening ```json or ```
        .replace(/\n?```\s*$/m, '')            // Remove closing ```
        .trim();
    }

    // Remove any text after the closing brace (explanations, notes, etc.)
    const jsonMatch = cleanedResponse.match(/^(\{[\s\S]*?\})/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[1];
    }

    const parsed = JSON.parse(cleanedResponse) as CategoryChoice;
    console.log('✅ Chosen Category:', parsed.chosenCategoryName);
    console.log('📝 Summary:', parsed.summary);
    console.log('💭 Reasoning:', parsed.reasoning);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Cache the AI result for future requests
    cacheCategorization(activityDetails, parsed);

    return parsed;
  } catch (error) {
    console.error('❌ Error getting AI category choice:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }
}

/**
 * Generate a summary for an activity block
 */
export async function getAISummaryForBlock(
  activityDetails: ActivityDetails
): Promise<string | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return null;
  }

  const provider = getActiveProvider();

  const prompt = [
    {
      role: 'system' as const,
      content: `You are an AI assistant that summarizes user activity blocks for productivity tracking.
Provide a concise, one-line summary of what the user was likely doing in this time block, based on the app, window title, content, and any available context.`
    },
    {
      role: 'user' as const,
      content: `
APP: ${activityDetails.ownerName}
TITLE: ${activityDetails.title || ''}
URL: ${activityDetails.url || ''}
CONTENT: ${activityDetails.content ? activityDetails.content.slice(0, 1000) : ''}
TYPE: ${activityDetails.type}
BROWSER: ${activityDetails.browser || ''}`
    }
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 50
    });

    return response?.trim() || null;
  } catch (error) {
    console.error('Error getting AI summary for block:', error);
    return null;
  }
}

/**
 * Check if a title is informative
 */
export async function isTitleInformative(title: string): Promise<boolean> {
  if (!isAIEnabled()) {
    return false;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return false;
  }

  const provider = getActiveProvider();

  const prompt = [
    {
      role: 'system' as const,
      content: `You are an AI assistant that determines if a window title is informative enough to understand what the user is doing. Respond with only "yes" or "no".`
    },
    {
      role: 'user' as const,
      content: `Is this window title informative: "${title}"?`
    }
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0,
      maxTokens: 3
    });

    return response?.toLowerCase().trim() === 'yes';
  } catch (error) {
    console.error('Error checking if title is informative:', error);
    return false;
  }
}

/**
 * Generate an activity title
 */
export async function generateActivityTitle(
  activityDetails: ActivityDetails
): Promise<string | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return null;
  }

  const provider = getActiveProvider();

  const prompt = [
    {
      role: 'system' as const,
      content: `Generate a concise, descriptive title (5-8 words) for this activity based on the available information.`
    },
    {
      role: 'user' as const,
      content: `
APP: ${activityDetails.ownerName}
TITLE: ${activityDetails.title || ''}
URL: ${activityDetails.url || ''}
CONTENT: ${activityDetails.content ? activityDetails.content.slice(0, 1000) : ''}`
    }
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 50
    });

    return response?.trim() || null;
  } catch (error) {
    console.error('Error generating activity title:', error);
    return null;
  }
}

/**
 * Get emoji for a category
 */
export async function getEmojiForCategory(
  categoryName: string,
  categoryDescription?: string
): Promise<string | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return null;
  }

  const provider = getActiveProvider();

  const prompt = [
    {
      role: 'system' as const,
      content: `Suggest a single emoji that represents this category. Respond with only the emoji character, nothing else.`
    },
    {
      role: 'user' as const,
      content: `Category: "${categoryName}"${categoryDescription ? `\nDescription: ${categoryDescription}` : ''}`
    }
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0,
      maxTokens: 10
    });

    return response?.trim() || null;
  } catch (error) {
    console.error('Error getting emoji for category:', error);
    return null;
  }
}

/**
 * Generate category suggestions based on user goals
 */
export async function generateCategorySuggestions(
  userProjectsAndGoals: string,
  count = 5
): Promise<Array<{
  name: string;
  description: string;
  color: string;
  emoji: string;
  isProductive: boolean;
}> | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const available = await isActiveProviderAvailable();

  if (!available) {
    return null;
  }

  const provider = getActiveProvider();

  const prompt = [
    {
      role: 'system' as const,
      content: `You are an AI assistant that generates personalized productivity categories based on a user's projects and goals.
Generate ${count} relevant categories that would help track time for these goals.

Respond in JSON format as an array of categories:
[
  {
    "name": "Category Name",
    "description": "Brief description",
    "color": "#hex color code",
    "emoji": "single emoji",
    "isProductive": true or false
  }
]`
    },
    {
      role: 'user' as const,
      content: `
USER'S PROJECTS AND GOALS:
${userProjectsAndGoals || 'General productivity tracking'}

Generate ${count} relevant categories to help track time for these goals.`
    }
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0,
      format: 'json'
    });

    if (!response) {
      return null;
    }

    const parsed = JSON.parse(response);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error generating category suggestions:', error);
    return null;
  }
}
