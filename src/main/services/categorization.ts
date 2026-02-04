import { getActiveProvider, isActiveProviderAvailable } from "./aiProvider";
import { isAIEnabled } from "./ollama";
import { Category } from "../database/services/categories";
import crypto from "crypto";

const isDev = process.env.NODE_ENV !== "production";

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
  identifier: string; // Store the identifier (ownerName or url) for efficient clearing
  itemType: "app" | "website";
}

const categorizationCache = new Map<string, CachedCategorization>();
const CATEGORIZATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let sweepIntervalRef: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a hash for an activity to detect duplicates
 */
function generateActivityHash(activityDetails: ActivityDetails): string {
  // Include content signature - first 500 chars normalized for content-aware caching
  const contentSignature = activityDetails.content
    ? activityDetails.content
        .slice(0, 500)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
    : "";
  const key = `${activityDetails.ownerName || ""}_${activityDetails.url || ""}_${activityDetails.title || ""}_${contentSignature}`;
  return crypto.createHash("md5").update(key).digest("hex");
}

/**
 * Extract identifier from activity details
 */
function getActivityIdentifier(
  activityDetails: ActivityDetails,
): { identifier: string; itemType: "app" | "website" } | null {
  if (activityDetails.url) {
    return { identifier: activityDetails.url, itemType: "website" };
  } else if (activityDetails.ownerName) {
    return { identifier: activityDetails.ownerName, itemType: "app" };
  }
  return null;
}

/**
 * Check if we recently categorized this exact activity
 */
function getCachedCategorization(
  activityDetails: ActivityDetails,
): CategoryChoice | null {
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
function cacheCategorization(
  activityDetails: ActivityDetails,
  result: CategoryChoice,
): void {
  const hash = generateActivityHash(activityDetails);
  const identifierInfo = getActivityIdentifier(activityDetails);

  if (identifierInfo) {
    categorizationCache.set(hash, {
      result,
      timestamp: Date.now(),
      identifier: identifierInfo.identifier,
      itemType: identifierInfo.itemType,
    });

    // Evict oldest entries if cache exceeds max size
    if (categorizationCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(categorizationCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = categorizationCache.size - MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        categorizationCache.delete(entries[i][0]);
      }
    }
  }
}

/**
 * Clear cache entries for a specific activity identifier
 * Used when activities are manually recategorized
 */
export function clearCategorizationCacheForIdentifier(
  identifier: string,
  itemType: "app" | "website",
): number {
  let clearedCount = 0;

  // Iterate through cache and remove entries matching the identifier
  for (const [hash, cached] of categorizationCache.entries()) {
    if (cached.identifier === identifier && cached.itemType === itemType) {
      categorizationCache.delete(hash);
      clearedCount++;
    }
  }

  console.log(
    `Cleared ${clearedCount} categorization cache entries for ${itemType} "${identifier}"`,
  );
  return clearedCount;
}

/**
 * Sweep expired entries from the categorization cache.
 * Returns the number of entries removed.
 */
export function sweepExpiredCacheEntries(): number {
  const now = Date.now();
  let removedCount = 0;

  for (const [hash, cached] of categorizationCache.entries()) {
    if (now - cached.timestamp > CATEGORIZATION_CACHE_DURATION) {
      categorizationCache.delete(hash);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(
      `Swept ${removedCount} expired categorization cache entries (${categorizationCache.size} remaining)`,
    );
  }

  return removedCount;
}

/**
 * Start periodic cache cleanup on an interval.
 * Calls sweepExpiredCacheEntries every SWEEP_INTERVAL_MS.
 */
export function startCacheCleanup(): void {
  if (sweepIntervalRef !== null) {
    return;
  }
  sweepIntervalRef = setInterval(sweepExpiredCacheEntries, SWEEP_INTERVAL_MS);
}

/**
 * Stop the periodic cache cleanup interval.
 */
export function stopCacheCleanup(): void {
  if (sweepIntervalRef !== null) {
    clearInterval(sweepIntervalRef);
    sweepIntervalRef = null;
  }
}

/**
 * Build prompt for category choice
 */
function buildCategoryChoicePrompt(
  userProjectsAndGoals: string,
  userCategories: Pick<Category, "name" | "description">[],
  activityDetails: ActivityDetails,
) {
  const { ownerName, title, url, content, type, browser } = activityDetails;

  const categoryListForPrompt = userCategories
    .map(
      (cat) =>
        `- "${cat.name}"${cat.description ? ": " + cat.description : ""}`,
    )
    .join("\n  ");

  const MAX_URL_LENGTH = 150;
  const MAX_CONTENT_LENGTH = 7000;
  const truncatedUrl =
    url && url.length > MAX_URL_LENGTH
      ? `${url.slice(0, MAX_URL_LENGTH)}...`
      : url;
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
    browser && `Browser: ${browser}`,
  ]
    .filter(Boolean)
    .join("\n    ");

  return [
    {
      role: "user" as const,
      content: `You categorize user activities into categories. Here is the current activity:

ACTIVITY:
${activityDetailsString}

USER CATEGORIES:
${categoryListForPrompt}

USER GOALS:
${userProjectsAndGoals || "Not set"}

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
}`,
    },
  ];
}

/**
 * Get AI category choice using active provider
 */
export async function getAICategoryChoice(
  userProjectsAndGoals: string,
  userCategories: Pick<Category, "name" | "description">[],
  activityDetails: ActivityDetails,
): Promise<CategoryChoice | null> {
  // OPTIMIZATION: Check cache first - reuse AI's previous decision for identical activities
  const cachedResult = getCachedCategorization(activityDetails);
  if (cachedResult) {
    if (isDev) {
      console.log(
        `CACHED: ${activityDetails.ownerName || activityDetails.url} → ${cachedResult.chosenCategoryName}`,
      );
    }
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
    activityDetails,
  );

  if (isDev) {
    console.log("\nAI CATEGORIZATION REQUEST");
    console.log("User Goals:", userProjectsAndGoals || "(none set)");
    console.log(
      "Available Categories:",
      userCategories.map((c) => c.name).join(", "),
    );
    console.log("Current Activity:");
    console.log("  - App/Browser:", activityDetails.ownerName);
    console.log("  - Title:", activityDetails.title || "(none)");
    console.log("  - URL:", activityDetails.url || "(none)");
    console.log(
      "  - Content preview:",
      activityDetails.content
        ? activityDetails.content.substring(0, 200) + "..."
        : "(none)",
    );
    console.log("\nFull Prompt:");
    console.log(JSON.stringify(messages, null, 2));
  }

  try {
    const response = await provider.generateChatCompletion(messages, {
      temperature: 0.2,
      format: "json",
    });

    if (isDev) {
      console.log("\nAI CATEGORIZATION RESPONSE");
      console.log("Raw response:", response);
    }

    if (!response) {
      if (isDev) {
        console.log("No response from AI");
      }
      return null;
    }

    // Clean up markdown code blocks and extra explanations
    let cleanedResponse = response.trim();

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n?/i, "") // Remove opening ```json or ```
        .replace(/\n?```\s*$/m, "") // Remove closing ```
        .trim();
    }

    // Remove any text after the closing brace (explanations, notes, etc.)
    const jsonMatch = cleanedResponse.match(/^(\{[\s\S]*?\})/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[1];
    }

    const parsed = JSON.parse(cleanedResponse) as CategoryChoice;

    if (isDev) {
      console.log("Chosen Category:", parsed.chosenCategoryName);
      console.log("Summary:", parsed.summary);
      console.log("Reasoning:", parsed.reasoning);
    }

    // Cache the AI result for future requests
    cacheCategorization(activityDetails, parsed);

    return parsed;
  } catch (error) {
    console.error("Error getting AI category choice:", error);
    return null;
  }
}

/**
 * Generate a summary for an activity block
 */
export async function getAISummaryForBlock(
  activityDetails: ActivityDetails,
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
      role: "system" as const,
      content: `You are an AI assistant that summarizes user activity blocks for productivity tracking.
Provide a concise, one-line summary of what the user was likely doing in this time block, based on the app, window title, content, and any available context.`,
    },
    {
      role: "user" as const,
      content: `
APP: ${activityDetails.ownerName}
TITLE: ${activityDetails.title || ""}
URL: ${activityDetails.url || ""}
CONTENT: ${activityDetails.content ? activityDetails.content.slice(0, 1000) : ""}
TYPE: ${activityDetails.type}
BROWSER: ${activityDetails.browser || ""}`,
    },
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 50,
    });

    return response?.trim() || null;
  } catch (error) {
    console.error("Error getting AI summary for block:", error);
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
      role: "system" as const,
      content: `You are an AI assistant that determines if a window title is informative enough to understand what the user is doing. Respond with only "yes" or "no".`,
    },
    {
      role: "user" as const,
      content: `Is this window title informative: "${title}"?`,
    },
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0,
      maxTokens: 3,
    });

    return response?.toLowerCase().trim() === "yes";
  } catch (error) {
    console.error("Error checking if title is informative:", error);
    return false;
  }
}

/**
 * Generate an activity title
 */
export async function generateActivityTitle(
  activityDetails: ActivityDetails,
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
      role: "system" as const,
      content: `Generate a concise, descriptive title (5-8 words) for this activity based on the available information.`,
    },
    {
      role: "user" as const,
      content: `
APP: ${activityDetails.ownerName}
TITLE: ${activityDetails.title || ""}
URL: ${activityDetails.url || ""}
CONTENT: ${activityDetails.content ? activityDetails.content.slice(0, 1000) : ""}`,
    },
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 50,
    });

    return response?.trim() || null;
  } catch (error) {
    console.error("Error generating activity title:", error);
    return null;
  }
}

/**
 * Generate category suggestions based on user goals
 */
export async function generateCategorySuggestions(
  userProjectsAndGoals: string,
  count = 5,
): Promise<Array<{
  name: string;
  description: string;
  color: string;
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
      role: "system" as const,
      content: `You are an AI assistant that generates personalized productivity categories based on a user's projects and goals.
Generate ${count} relevant categories that would help track time for these goals.

Respond in JSON format as an array of categories:
[
  {
    "name": "Category Name",
    "description": "Brief description",
    "color": "#hex color code",
    "isProductive": true or false
  }
]`,
    },
    {
      role: "user" as const,
      content: `
USER'S PROJECTS AND GOALS:
${userProjectsAndGoals || "General productivity tracking"}

Generate ${count} relevant categories to help track time for these goals.`,
    },
  ];

  try {
    const response = await provider.generateChatCompletion(prompt, {
      temperature: 0,
      format: "json",
    });

    if (!response) {
      return null;
    }

    const parsed = JSON.parse(response);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error("Error generating category suggestions:", error);
    return null;
  }
}
