import { Category } from "../database/services/categories";
import { CategoryChoice, ActivityDetails } from "./categorization";

/**
 * Simple rule-based categorization patterns
 */
const CATEGORIZATION_RULES = {
  work: {
    keywords: [
      "work",
      "office",
      "job",
      "business",
      "project",
      "meeting",
      "documentation",
      "docs",
    ],
    apps: [
      "vscode",
      "intellij",
      "xcode",
      "visual studio",
      "sublime",
      "atom",
      "slack",
      "teams",
      "zoom",
      "webex",
    ],
    domains: [
      "github.com",
      "gitlab.com",
      "bitbucket.org",
      "stackoverflow.com",
      "docs.google.com",
    ],
  },
  communication: {
    keywords: ["email", "message", "chat", "call", "meeting"],
    apps: [
      "mail",
      "outlook",
      "thunderbird",
      "messages",
      "telegram",
      "discord",
      "slack",
      "teams",
      "zoom",
    ],
    domains: [
      "gmail.com",
      "outlook.com",
      "mail.google.com",
      "slack.com",
      "discord.com",
    ],
  },
  entertainment: {
    keywords: [
      "game",
      "play",
      "watch",
      "movie",
      "video",
      "entertainment",
      "music",
      "stream",
    ],
    apps: [
      "spotify",
      "apple music",
      "netflix",
      "steam",
      "epic games",
      "vlc",
      "music",
    ],
    domains: [
      "youtube.com",
      "netflix.com",
      "spotify.com",
      "twitch.tv",
      "reddit.com",
    ],
  },
  social: {
    keywords: ["social", "friend", "post", "tweet", "story"],
    apps: ["twitter", "facebook", "instagram"],
    domains: [
      "twitter.com",
      "facebook.com",
      "instagram.com",
      "tiktok.com",
      "linkedin.com",
    ],
  },
  shopping: {
    keywords: ["shop", "buy", "purchase", "cart", "order"],
    apps: [],
    domains: ["amazon.com", "ebay.com", "etsy.com", "shopify.com"],
  },
};

/**
 * Extract domain from URL
 */
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if text contains any of the keywords
 */
function containsKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Match activity against a rule category
 */
function matchesRuleCategory(
  activityDetails: ActivityDetails,
  rule: { keywords: string[]; apps: string[]; domains: string[] },
): number {
  let score = 0;
  const { ownerName, title, url, content } = activityDetails;

  // Check app name
  if (ownerName && containsKeywords(ownerName, rule.apps)) {
    score += 3;
  }

  // Check domain
  const domain = extractDomain(url);
  if (domain && rule.domains.some((d) => domain.includes(d))) {
    score += 3;
  }

  // Check title and content for keywords
  const textToCheck = [title, content].filter(Boolean).join(" ");
  if (textToCheck && containsKeywords(textToCheck, rule.keywords)) {
    score += 1;
  }

  return score;
}

/**
 * Determine rule-based category type
 */
function determineRuleBasedCategoryType(
  activityDetails: ActivityDetails,
): string {
  let bestMatch = "uncategorized";
  let bestScore = 0;

  for (const [categoryType, rule] of Object.entries(CATEGORIZATION_RULES)) {
    const score = matchesRuleCategory(activityDetails, rule);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = categoryType;
    }
  }

  // If score is too low, consider it uncategorized
  if (bestScore < 2) {
    return "uncategorized";
  }

  return bestMatch;
}

/**
 * Find best matching user category based on rule-based type
 */
function findMatchingCategory(
  ruleType: string,
  userCategories: Pick<Category, "name" | "description">[],
): string | null {
  // Try exact match first
  const exactMatch = userCategories.find(
    (cat) => cat.name.toLowerCase() === ruleType.toLowerCase(),
  );
  if (exactMatch) return exactMatch.name;

  // Try fuzzy match
  const fuzzyMatch = userCategories.find(
    (cat) =>
      cat.name.toLowerCase().includes(ruleType) ||
      cat.description?.toLowerCase().includes(ruleType),
  );
  if (fuzzyMatch) return fuzzyMatch.name;

  // Default categories based on type
  const defaults: Record<string, string[]> = {
    work: ["Work", "Productive", "Business"],
    communication: ["Communication", "Email", "Chat", "Work"],
    entertainment: ["Entertainment", "Leisure", "Distraction"],
    social: ["Social Media", "Entertainment", "Distraction"],
    shopping: ["Personal", "Shopping", "Other"],
  };

  const possibleNames = defaults[ruleType] || ["Uncategorized"];
  for (const name of possibleNames) {
    const match = userCategories.find(
      (cat) => cat.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) return match.name;
  }

  // Return first category as last resort
  return userCategories[0]?.name || null;
}

/**
 * Generate a simple summary based on activity details
 */
function generateSimpleSummary(activityDetails: ActivityDetails): string {
  const { ownerName, title, url } = activityDetails;

  if (title && title.length > 0 && title !== "New Tab") {
    return title.slice(0, 50);
  }

  if (url) {
    const domain = extractDomain(url);
    if (domain) {
      return `Browsing ${domain}`;
    }
  }

  if (ownerName) {
    return `Using ${ownerName}`;
  }

  return "Unknown activity";
}

/**
 * Rule-based category choice (fallback when AI is disabled)
 */
export function getRuleBasedCategoryChoice(
  userCategories: Pick<Category, "name" | "description">[],
  activityDetails: ActivityDetails,
): CategoryChoice | null {
  if (userCategories.length === 0) {
    return null;
  }

  try {
    // Determine category type using rules
    const ruleType = determineRuleBasedCategoryType(activityDetails);

    // Find matching user category
    const chosenCategoryName = findMatchingCategory(ruleType, userCategories);

    if (!chosenCategoryName) {
      return null;
    }

    // Generate simple summary
    const summary = generateSimpleSummary(activityDetails);

    // Generate reasoning
    const reasoning = `Matched based on ${activityDetails.ownerName ? "app name" : activityDetails.url ? "URL" : "content"} patterns`;

    return {
      chosenCategoryName,
      summary,
      reasoning,
    };
  } catch (error) {
    console.error("Error in rule-based categorization:", error);
    return null;
  }
}

/**
 * Check if title is informative (simple heuristic)
 */
export function isSimpleTitleInformative(title: string): boolean {
  if (!title || title.length < 3) return false;

  const uninformativeTitles = [
    "new tab",
    "untitled",
    "blank",
    "loading",
    "welcome",
    "",
  ];

  return !uninformativeTitles.some((t) => title.toLowerCase().includes(t));
}

/**
 * Generate simple activity title
 */
export function generateSimpleActivityTitle(
  activityDetails: ActivityDetails,
): string {
  return generateSimpleSummary(activityDetails);
}
