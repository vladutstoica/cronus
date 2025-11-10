import { generateChatCompletion } from './ollama';
import { Category } from '../database/services/categories';

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
      role: 'system' as const,
      content: `You are an AI assistant that categorizes activities based on CONTENT and PURPOSE, not just the platform or application being used.

CRITICAL RULES FOR CATEGORIZATION:

1. PROFESSIONAL TOOLS = WORK:
   - IDEs (IntelliJ IDEA, VS Code, PyCharm, Xcode, Android Studio) → Always Work
   - Code editors (Sublime Text, Vim, Emacs) → Always Work
   - Developer tools (GitHub Desktop, Terminal, Postman, Docker) → Always Work
   - Design tools (Figma, Photoshop, Sketch) → Always Work if user is designer/developer
   - Database tools (MySQL Workbench, pgAdmin, MongoDB Compass) → Always Work
   - Microsoft Office (Word, Excel, PowerPoint, Outlook, Teams) → Always Work
   - Professional communication (Slack, Teams, Zoom for meetings) → Always Work

2. SOCIAL MEDIA/ENTERTAINMENT = STRICT:
   - Social media (Facebook, Reddit, Twitter, Instagram, TikTok) → Entertainment UNLESS:
     * URL/content shows clear work purpose (e.g., company page management)
     * User explicitly states "social media management" in goals
   - YouTube → Entertainment UNLESS clearly educational/tutorial AND related to goals
   - Shopping sites → Entertainment UNLESS buying work equipment mentioned in goals
   - News sites → Entertainment (passive consumption)

3. AMBIGUOUS CASES:
   - When in doubt between Work categories → choose the most relevant
   - When in doubt between Work and Entertainment → look at URL and content first
   - No URL/content for professional tools → assume Work
   - No URL/content for browsers/social media → assume Entertainment

4. DECISION PROCESS:
   - First check: Is this a professional development/productivity tool? → Work
   - Then check: Is URL/content clearly work-related? → Work
   - Finally: Does it directly support stated goals? → Work
   - Otherwise → Entertainment

Based on the user's goals, their current activity, and their list of personal categories, choose the category name that best fits the activity.
${
  truncatedContent
    ? 'Note that the page content is fetched via the accessibility API and might include noise (e.g., sidebars).'
    : ''
}

You must respond in JSON format with this exact structure:
{
  "chosenCategoryName": "the category name",
  "summary": "short summary of what the user is doing (max 10 words)",
  "reasoning": "why this category was chosen (max 20 words)"
}`
    },
    {
      role: 'user' as const,
      content: `
USER'S PROJECTS AND GOALS:
${userProjectsAndGoals || 'Not set'}

USER'S CATEGORIES:
${categoryListForPrompt}

CURRENT ACTIVITY:
${activityDetailsString}

EXAMPLES OF CORRECT CATEGORIZATION:
- App: "IntelliJ IDEA" (no URL/content). Goal: "Software Developer". → CORRECT: "Work" (professional IDE)
- App: "VS Code" (no URL/content). Goal: "Software Developer". → CORRECT: "Work" (professional editor)
- App: "Microsoft Teams" (no URL/content). Goal: "Software Developer". → CORRECT: "Work" or "Communication" (work tool)
- App: "Arc", URL: "facebook.com/jewelry". Goal: "Software Developer". → CORRECT: "Entertainment" (personal shopping)
- App: "Arc", URL: "reddit.com/r/funny". Goal: "Software Developer". → CORRECT: "Entertainment" (memes)
- App: "Arc", URL: "stackoverflow.com/questions/react-bug". Goal: "Software Developer". → CORRECT: "Work" (solving work problem)
- App: "Chrome", URL: "youtube.com/watch?v=react-tutorial". Goal: "Learning React". → CORRECT: "Work" (directly related)
- App: "Chrome", URL: "youtube.com/watch?v=cat-video". Goal: "Learning React". → CORRECT: "Entertainment" (unrelated)
- App: "Figma" (no URL/content). Goal: "UI Designer". → CORRECT: "Work" (professional tool)
- App: "Slack" (no URL/content). Goal: "Any professional". → CORRECT: "Work" or "Communication" (work chat)

TASK:
1. Check if Application is a known professional tool (IDE, code editor, Office suite, etc.)
   - If YES and user is a professional → Categorize as Work
2. If it's a browser, check URL and content:
   - Social media/shopping/entertainment sites → Entertainment (unless explicit work evidence)
   - Technical sites (StackOverflow, GitHub, documentation) → Work
   - Educational content directly related to goals → Work
3. When in doubt between Work categories → choose most specific
4. When in doubt between Work and Entertainment for browsers → prefer Entertainment UNLESS clear evidence

Respond in JSON format with the category name and your reasoning.
`
    }
  ];
}

/**
 * Get AI category choice using Ollama
 */
export async function getAICategoryChoice(
  userProjectsAndGoals: string,
  userCategories: Pick<Category, 'name' | 'description'>[],
  activityDetails: ActivityDetails
): Promise<CategoryChoice | null> {
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
    const response = await generateChatCompletion(messages, {
      temperature: 0,
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

    const parsed = JSON.parse(response) as CategoryChoice;
    console.log('✅ Chosen Category:', parsed.chosenCategoryName);
    console.log('📝 Summary:', parsed.summary);
    console.log('💭 Reasoning:', parsed.reasoning);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
    const response = await generateChatCompletion(prompt, {
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
    const response = await generateChatCompletion(prompt, {
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
    const response = await generateChatCompletion(prompt, {
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
    const response = await generateChatCompletion(prompt, {
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
    const response = await generateChatCompletion(prompt, {
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
