/**
 * Pre-built Category Templates
 * Industry-specific templates with pre-configured categories and rules
 */

import type { RuleCondition, ConditionLogic } from "../../../shared/categorizationTypes";
import { createCategory, getCategoriesByUserId } from "../../database/services/categories";
import {
  createRulesBatch,
  deleteTemplateRulesForUser,
  hasTemplateRules,
} from "../../database/services/categorizationRules";

/**
 * Category definition for templates
 */
export interface TemplateCategory {
  /** Category name */
  name: string;
  /** Category description */
  description: string;
  /** Productivity score: 1 = productive, 0 = neutral, -1 = distraction */
  productivityScore: 1 | 0 | -1;
  /** Hex color code */
  color: string;
}

/**
 * Rule definition for templates
 */
export interface TemplateRule {
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Target category name (must match a TemplateCategory name) */
  categoryName: string;
  /** Rule conditions */
  conditions: RuleCondition[];
  /** Condition logic (default: AND) */
  conditionLogic?: ConditionLogic;
  /** Rule priority (higher = checked first, default: 0) */
  priority?: number;
  /** Confidence score 0-1 (default: 0.9) */
  confidence?: number;
}

/**
 * Template definition
 */
export interface CategoryTemplate {
  /** Unique template ID */
  id: string;
  /** Display name */
  name: string;
  /** Description of the template */
  description: string;
  /** Target profession/use case */
  targetAudience: string;
  /** Categories included in this template */
  categories: TemplateCategory[];
  /** Rules included in this template */
  rules: TemplateRule[];
}

/**
 * Result of applying a template
 */
export interface ApplyTemplateResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Number of categories created */
  categoriesCreated: number;
  /** Number of rules created */
  rulesCreated: number;
  /** Any warnings during application */
  warnings: string[];
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// DISTRACTION RULES (Shared across templates)
// ============================================================================

const DISTRACTION_RULES: TemplateRule[] = [
  // Social Media
  { name: "Facebook", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "facebook.com" }], confidence: 0.95 },
  { name: "Instagram", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "instagram.com" }], confidence: 0.95 },
  { name: "Twitter/X", categoryName: "Distraction", conditions: [{ field: "domain", operator: "matches_regex", value: "(twitter\\.com|x\\.com)" }], confidence: 0.95 },
  { name: "TikTok", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "tiktok.com" }], confidence: 0.95 },
  { name: "Snapchat", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "snapchat.com" }], confidence: 0.95 },
  { name: "Reddit", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "reddit.com" }], confidence: 0.9 },
  { name: "Pinterest (browsing)", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "pinterest.com" }], confidence: 0.8 },
  { name: "LinkedIn Feed", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "linkedin.com" }, { field: "url_path", operator: "equals", value: "/feed" }], conditionLogic: "AND", confidence: 0.7 },
  { name: "Threads", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "threads.net" }], confidence: 0.95 },
  { name: "Bluesky", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "bsky.app" }], confidence: 0.9 },
  { name: "Mastodon", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "mastodon" }], confidence: 0.85 },

  // Streaming & Entertainment
  { name: "YouTube", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "youtube.com" }], confidence: 0.85 },
  { name: "Netflix", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "netflix.com" }], confidence: 0.95 },
  { name: "Disney+", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "disneyplus.com" }], confidence: 0.95 },
  { name: "Hulu", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "hulu.com" }], confidence: 0.95 },
  { name: "Amazon Prime Video", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "primevideo.com" }], confidence: 0.95 },
  { name: "HBO Max", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "max.com" }], confidence: 0.95 },
  { name: "Twitch", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "twitch.tv" }], confidence: 0.9 },
  { name: "Spotify Web", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "open.spotify.com" }], confidence: 0.7 },
  { name: "Apple Music Web", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "music.apple.com" }], confidence: 0.7 },
  { name: "SoundCloud", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "soundcloud.com" }], confidence: 0.7 },

  // Gaming
  { name: "Steam", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "contains", value: "Steam" }], confidence: 0.9 },
  { name: "Epic Games", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "contains", value: "Epic Games" }], confidence: 0.9 },
  { name: "Discord (Gaming)", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "equals", value: "Discord" }], confidence: 0.6 },
  { name: "Battle.net", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "contains", value: "Battle.net" }], confidence: 0.9 },
  { name: "Xbox App", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "contains", value: "Xbox" }], confidence: 0.9 },
  { name: "GOG Galaxy", categoryName: "Distraction", conditions: [{ field: "app_name", operator: "contains", value: "GOG Galaxy" }], confidence: 0.9 },

  // News & Media
  { name: "CNN", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "cnn.com" }], confidence: 0.8 },
  { name: "BBC News", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "bbc.com/news" }], confidence: 0.8 },
  { name: "Fox News", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "foxnews.com" }], confidence: 0.8 },
  { name: "MSNBC", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "msnbc.com" }], confidence: 0.8 },
  { name: "Buzzfeed", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "buzzfeed.com" }], confidence: 0.9 },
  { name: "TMZ", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "tmz.com" }], confidence: 0.95 },
  { name: "Daily Mail", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "dailymail.co.uk" }], confidence: 0.9 },

  // Shopping (non-work)
  { name: "Amazon Shopping", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "amazon.com" }, { field: "url_path", operator: "not_contains", value: "/aws" }], conditionLogic: "AND", confidence: 0.75 },
  { name: "eBay", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "ebay.com" }], confidence: 0.8 },
  { name: "Etsy", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "etsy.com" }], confidence: 0.85 },
  { name: "AliExpress", categoryName: "Distraction", conditions: [{ field: "domain", operator: "contains", value: "aliexpress.com" }], confidence: 0.85 },
];

// ============================================================================
// DEVELOPER TEMPLATE
// ============================================================================

const DEVELOPER_TEMPLATE: CategoryTemplate = {
  id: "developer",
  name: "Developer",
  description: "Optimized for software developers with categories for coding, code review, documentation, and DevOps.",
  targetAudience: "Software developers, engineers, and programmers",
  categories: [
    { name: "Coding", description: "Active development and programming", productivityScore: 1, color: "#3b82f6" },
    { name: "Code Review", description: "Reviewing pull requests and code", productivityScore: 1, color: "#8b5cf6" },
    { name: "Documentation", description: "Reading and writing documentation", productivityScore: 1, color: "#06b6d4" },
    { name: "DevOps", description: "CI/CD, infrastructure, and deployment", productivityScore: 1, color: "#f97316" },
    { name: "Meetings", description: "Video calls and meetings", productivityScore: 0, color: "#eab308" },
    { name: "Communication", description: "Email, chat, and messaging", productivityScore: 0, color: "#10b981" },
    { name: "Research", description: "Technical research and learning", productivityScore: 1, color: "#ec4899" },
    { name: "Distraction", description: "Non-work activities", productivityScore: -1, color: "#ef4444" },
  ],
  rules: [
    // IDEs and Code Editors
    { name: "VS Code", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Code" }], confidence: 0.95 },
    { name: "Visual Studio", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Visual Studio" }], confidence: 0.95 },
    { name: "IntelliJ IDEA", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "IntelliJ" }], confidence: 0.95 },
    { name: "WebStorm", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "WebStorm" }], confidence: 0.95 },
    { name: "PyCharm", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "PyCharm" }], confidence: 0.95 },
    { name: "GoLand", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "GoLand" }], confidence: 0.95 },
    { name: "RubyMine", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "RubyMine" }], confidence: 0.95 },
    { name: "CLion", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "CLion" }], confidence: 0.95 },
    { name: "PhpStorm", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "PhpStorm" }], confidence: 0.95 },
    { name: "Android Studio", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Android Studio" }], confidence: 0.95 },
    { name: "Xcode", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Xcode" }], confidence: 0.95 },
    { name: "Sublime Text", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Sublime Text" }], confidence: 0.9 },
    { name: "Atom", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Atom" }], confidence: 0.9 },
    { name: "Neovim", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "nvim" }], confidence: 0.9 },
    { name: "Vim", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "vim" }], confidence: 0.9 },
    { name: "Emacs", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Emacs" }], confidence: 0.9 },
    { name: "Cursor", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Cursor" }], confidence: 0.95 },
    { name: "Zed", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "Zed" }], confidence: 0.95 },

    // Terminal and CLI
    { name: "Terminal", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "Terminal" }], confidence: 0.85 },
    { name: "iTerm", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "iTerm" }], confidence: 0.85 },
    { name: "Warp", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "Warp" }], confidence: 0.85 },
    { name: "Hyper", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "Hyper" }], confidence: 0.85 },
    { name: "Alacritty", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "Alacritty" }], confidence: 0.85 },
    { name: "Kitty", categoryName: "Coding", conditions: [{ field: "app_name", operator: "equals", value: "kitty" }], confidence: 0.85 },
    { name: "Windows Terminal", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Windows Terminal" }], confidence: 0.85 },

    // Git and Version Control (Web)
    { name: "GitHub", categoryName: "Code Review", conditions: [{ field: "domain", operator: "equals", value: "github.com" }], confidence: 0.9 },
    { name: "GitHub PR", categoryName: "Code Review", conditions: [{ field: "domain", operator: "equals", value: "github.com" }, { field: "url_path", operator: "contains", value: "/pull/" }], conditionLogic: "AND", confidence: 0.95, priority: 10 },
    { name: "GitLab", categoryName: "Code Review", conditions: [{ field: "domain", operator: "contains", value: "gitlab.com" }], confidence: 0.9 },
    { name: "GitLab MR", categoryName: "Code Review", conditions: [{ field: "domain", operator: "contains", value: "gitlab.com" }, { field: "url_path", operator: "contains", value: "/merge_requests/" }], conditionLogic: "AND", confidence: 0.95, priority: 10 },
    { name: "Bitbucket", categoryName: "Code Review", conditions: [{ field: "domain", operator: "contains", value: "bitbucket.org" }], confidence: 0.9 },
    { name: "Bitbucket PR", categoryName: "Code Review", conditions: [{ field: "domain", operator: "contains", value: "bitbucket.org" }, { field: "url_path", operator: "contains", value: "/pull-requests/" }], conditionLogic: "AND", confidence: 0.95, priority: 10 },
    { name: "Azure DevOps Repos", categoryName: "Code Review", conditions: [{ field: "domain", operator: "contains", value: "dev.azure.com" }, { field: "url_path", operator: "contains", value: "/_git/" }], conditionLogic: "AND", confidence: 0.9 },

    // Git Desktop Apps
    { name: "GitHub Desktop", categoryName: "Code Review", conditions: [{ field: "app_name", operator: "contains", value: "GitHub Desktop" }], confidence: 0.9 },
    { name: "GitKraken", categoryName: "Code Review", conditions: [{ field: "app_name", operator: "contains", value: "GitKraken" }], confidence: 0.9 },
    { name: "Sourcetree", categoryName: "Code Review", conditions: [{ field: "app_name", operator: "contains", value: "Sourcetree" }], confidence: 0.9 },
    { name: "Tower", categoryName: "Code Review", conditions: [{ field: "app_name", operator: "equals", value: "Tower" }], confidence: 0.9 },
    { name: "Fork", categoryName: "Code Review", conditions: [{ field: "app_name", operator: "equals", value: "Fork" }], confidence: 0.9 },

    // Documentation
    { name: "Stack Overflow", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "stackoverflow.com" }], confidence: 0.85 },
    { name: "MDN Web Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "developer.mozilla.org" }], confidence: 0.95 },
    { name: "DevDocs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "devdocs.io" }], confidence: 0.95 },
    { name: "ReadTheDocs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "readthedocs.io" }], confidence: 0.9 },
    { name: "Docusaurus Sites", categoryName: "Documentation", conditions: [{ field: "title", operator: "contains", value: "Docusaurus" }], confidence: 0.8 },
    { name: "npm Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "docs.npmjs.com" }], confidence: 0.9 },
    { name: "Node.js Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "nodejs.org" }], confidence: 0.9 },
    { name: "React Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "react.dev" }], confidence: 0.9 },
    { name: "Vue Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "vuejs.org" }], confidence: 0.9 },
    { name: "Angular Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "angular.io" }], confidence: 0.9 },
    { name: "TypeScript Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "typescriptlang.org" }], confidence: 0.9 },
    { name: "Python Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "docs.python.org" }], confidence: 0.9 },
    { name: "Rust Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "doc.rust-lang.org" }], confidence: 0.9 },
    { name: "Go Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "go.dev" }], confidence: 0.9 },
    { name: "Kotlin Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "kotlinlang.org" }], confidence: 0.9 },
    { name: "Swift Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "swift.org" }], confidence: 0.9 },

    // Cloud & DevOps
    { name: "AWS Console", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "console.aws.amazon.com" }], confidence: 0.95 },
    { name: "AWS Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "docs.aws.amazon.com" }], confidence: 0.9 },
    { name: "Azure Portal", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "portal.azure.com" }], confidence: 0.95 },
    { name: "Azure Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "docs.microsoft.com" }], confidence: 0.85 },
    { name: "Google Cloud Console", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "console.cloud.google.com" }], confidence: 0.95 },
    { name: "GCP Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "cloud.google.com/docs" }], confidence: 0.9 },
    { name: "Vercel", categoryName: "DevOps", conditions: [{ field: "domain", operator: "equals", value: "vercel.com" }], confidence: 0.9 },
    { name: "Netlify", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "netlify.com" }], confidence: 0.9 },
    { name: "Heroku", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "heroku.com" }], confidence: 0.9 },
    { name: "DigitalOcean", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "digitalocean.com" }], confidence: 0.9 },
    { name: "Cloudflare", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "cloudflare.com" }], confidence: 0.9 },
    { name: "Docker Hub", categoryName: "DevOps", conditions: [{ field: "domain", operator: "equals", value: "hub.docker.com" }], confidence: 0.9 },
    { name: "Docker Desktop", categoryName: "DevOps", conditions: [{ field: "app_name", operator: "contains", value: "Docker" }], confidence: 0.9 },
    { name: "Kubernetes Dashboard", categoryName: "DevOps", conditions: [{ field: "title", operator: "contains", value: "Kubernetes" }], confidence: 0.85 },

    // CI/CD
    { name: "GitHub Actions", categoryName: "DevOps", conditions: [{ field: "domain", operator: "equals", value: "github.com" }, { field: "url_path", operator: "contains", value: "/actions" }], conditionLogic: "AND", confidence: 0.95 },
    { name: "CircleCI", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "circleci.com" }], confidence: 0.9 },
    { name: "Travis CI", categoryName: "DevOps", conditions: [{ field: "domain", operator: "contains", value: "travis-ci" }], confidence: 0.9 },
    { name: "Jenkins", categoryName: "DevOps", conditions: [{ field: "title", operator: "contains", value: "Jenkins" }], confidence: 0.85 },
    { name: "TeamCity", categoryName: "DevOps", conditions: [{ field: "title", operator: "contains", value: "TeamCity" }], confidence: 0.85 },

    // Package Managers & Registries
    { name: "npm Registry", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "npmjs.com" }], confidence: 0.85 },
    { name: "PyPI", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "pypi.org" }], confidence: 0.85 },
    { name: "crates.io", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "crates.io" }], confidence: 0.85 },
    { name: "Maven Central", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "mvnrepository.com" }], confidence: 0.85 },
    { name: "RubyGems", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "rubygems.org" }], confidence: 0.85 },

    // Communication
    { name: "Slack", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Slack" }], confidence: 0.85 },
    { name: "Slack Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "slack.com" }], confidence: 0.85 },
    { name: "Microsoft Teams", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Teams" }], confidence: 0.85 },
    { name: "Teams Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "teams.microsoft.com" }], confidence: 0.85 },
    { name: "Discord", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "discord.com" }], confidence: 0.7 },

    // Meetings
    { name: "Zoom", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "zoom" }], confidence: 0.95 },
    { name: "Zoom Web", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "zoom.us" }], confidence: 0.9 },
    { name: "Google Meet", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "meet.google.com" }], confidence: 0.95 },
    { name: "Webex", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "Webex" }], confidence: 0.95 },
    { name: "Around", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "equals", value: "Around" }], confidence: 0.95 },

    // Research & Learning
    { name: "Hacker News", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "news.ycombinator.com" }], confidence: 0.7 },
    { name: "Dev.to", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "dev.to" }], confidence: 0.8 },
    { name: "Medium Tech", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "medium.com" }], confidence: 0.7 },
    { name: "Hashnode", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "hashnode.dev" }], confidence: 0.8 },
    { name: "freeCodeCamp", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "freecodecamp.org" }], confidence: 0.85 },
    { name: "Codecademy", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "codecademy.com" }], confidence: 0.85 },
    { name: "LeetCode", categoryName: "Coding", conditions: [{ field: "domain", operator: "contains", value: "leetcode.com" }], confidence: 0.9 },
    { name: "HackerRank", categoryName: "Coding", conditions: [{ field: "domain", operator: "contains", value: "hackerrank.com" }], confidence: 0.9 },
    { name: "Codewars", categoryName: "Coding", conditions: [{ field: "domain", operator: "contains", value: "codewars.com" }], confidence: 0.9 },

    // Database Tools
    { name: "TablePlus", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "TablePlus" }], confidence: 0.9 },
    { name: "DBeaver", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "DBeaver" }], confidence: 0.9 },
    { name: "DataGrip", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "DataGrip" }], confidence: 0.9 },
    { name: "MongoDB Compass", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "MongoDB Compass" }], confidence: 0.9 },
    { name: "Redis Insight", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "RedisInsight" }], confidence: 0.9 },

    // API Tools
    { name: "Postman", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Postman" }], confidence: 0.9 },
    { name: "Insomnia", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "Insomnia" }], confidence: 0.9 },
    { name: "HTTPie", categoryName: "Coding", conditions: [{ field: "app_name", operator: "contains", value: "HTTPie" }], confidence: 0.9 },

    // AI Coding Assistants
    { name: "ChatGPT", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "chat.openai.com" }], confidence: 0.8 },
    { name: "Claude", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "claude.ai" }], confidence: 0.8 },
    { name: "GitHub Copilot", categoryName: "Coding", conditions: [{ field: "domain", operator: "contains", value: "copilot.github.com" }], confidence: 0.9 },
    { name: "Perplexity", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "perplexity.ai" }], confidence: 0.8 },

    ...DISTRACTION_RULES,
  ],
};

// ============================================================================
// DESIGNER TEMPLATE
// ============================================================================

const DESIGNER_TEMPLATE: CategoryTemplate = {
  id: "designer",
  name: "Designer",
  description: "Tailored for UI/UX designers, graphic designers, and creative professionals.",
  targetAudience: "UI/UX designers, graphic designers, and creative professionals",
  categories: [
    { name: "Design", description: "Active design work", productivityScore: 1, color: "#8b5cf6" },
    { name: "Prototyping", description: "Creating prototypes and wireframes", productivityScore: 1, color: "#3b82f6" },
    { name: "Research", description: "Design research and inspiration", productivityScore: 1, color: "#ec4899" },
    { name: "Collaboration", description: "Design reviews and feedback", productivityScore: 1, color: "#06b6d4" },
    { name: "Assets", description: "Managing design assets and resources", productivityScore: 1, color: "#f97316" },
    { name: "Communication", description: "Email, chat, and messaging", productivityScore: 0, color: "#10b981" },
    { name: "Distraction", description: "Non-work activities", productivityScore: -1, color: "#ef4444" },
  ],
  rules: [
    // Design Tools
    { name: "Figma App", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Figma" }], confidence: 0.95 },
    { name: "Figma Web", categoryName: "Design", conditions: [{ field: "domain", operator: "equals", value: "figma.com" }], confidence: 0.95 },
    { name: "Sketch", categoryName: "Design", conditions: [{ field: "app_name", operator: "equals", value: "Sketch" }], confidence: 0.95 },
    { name: "Adobe XD", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Adobe XD" }], confidence: 0.95 },
    { name: "Adobe Photoshop", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Photoshop" }], confidence: 0.95 },
    { name: "Adobe Illustrator", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Illustrator" }], confidence: 0.95 },
    { name: "Adobe InDesign", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "InDesign" }], confidence: 0.95 },
    { name: "Adobe After Effects", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "After Effects" }], confidence: 0.95 },
    { name: "Adobe Premiere Pro", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Premiere Pro" }], confidence: 0.95 },
    { name: "Adobe Lightroom", categoryName: "Assets", conditions: [{ field: "app_name", operator: "contains", value: "Lightroom" }], confidence: 0.9 },
    { name: "Affinity Designer", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Affinity Designer" }], confidence: 0.95 },
    { name: "Affinity Photo", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Affinity Photo" }], confidence: 0.95 },
    { name: "Canva App", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Canva" }], confidence: 0.9 },
    { name: "Canva Web", categoryName: "Design", conditions: [{ field: "domain", operator: "equals", value: "canva.com" }], confidence: 0.9 },
    { name: "GIMP", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "GIMP" }], confidence: 0.9 },
    { name: "Inkscape", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Inkscape" }], confidence: 0.9 },
    { name: "Pixelmator", categoryName: "Design", conditions: [{ field: "app_name", operator: "contains", value: "Pixelmator" }], confidence: 0.9 },

    // Prototyping
    { name: "Framer", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "Framer" }], confidence: 0.95 },
    { name: "Framer Web", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "equals", value: "framer.com" }], confidence: 0.95 },
    { name: "InVision", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "contains", value: "invisionapp.com" }], confidence: 0.95 },
    { name: "Marvel", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "contains", value: "marvelapp.com" }], confidence: 0.95 },
    { name: "Principle", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "Principle" }], confidence: 0.95 },
    { name: "ProtoPie", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "ProtoPie" }], confidence: 0.95 },
    { name: "Origami Studio", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "Origami" }], confidence: 0.95 },
    { name: "Balsamiq", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "Balsamiq" }], confidence: 0.9 },
    { name: "Axure", categoryName: "Prototyping", conditions: [{ field: "app_name", operator: "contains", value: "Axure" }], confidence: 0.9 },
    { name: "Miro", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "contains", value: "miro.com" }], confidence: 0.85 },
    { name: "FigJam", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "equals", value: "figma.com" }, { field: "url_path", operator: "contains", value: "/figjam" }], conditionLogic: "AND", confidence: 0.9 },
    { name: "Whimsical", categoryName: "Prototyping", conditions: [{ field: "domain", operator: "contains", value: "whimsical.com" }], confidence: 0.85 },

    // Research & Inspiration
    { name: "Dribbble", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "dribbble.com" }], confidence: 0.85 },
    { name: "Behance", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "behance.net" }], confidence: 0.85 },
    { name: "Pinterest Design", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "pinterest.com" }], confidence: 0.7 },
    { name: "Awwwards", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "awwwards.com" }], confidence: 0.9 },
    { name: "CSS Design Awards", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "cssdesignawards.com" }], confidence: 0.9 },
    { name: "Muzli", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "muz.li" }], confidence: 0.85 },
    { name: "Mobbin", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "mobbin.com" }], confidence: 0.9 },
    { name: "Pttrns", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "pttrns.com" }], confidence: 0.9 },
    { name: "UI8", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "ui8.net" }], confidence: 0.85 },
    { name: "Collect UI", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "collectui.com" }], confidence: 0.9 },
    { name: "Land-book", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "land-book.com" }], confidence: 0.9 },
    { name: "One Page Love", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "onepagelove.com" }], confidence: 0.9 },
    { name: "Site Inspire", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "siteinspire.com" }], confidence: 0.9 },
    { name: "Designspiration", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "designspiration.com" }], confidence: 0.85 },

    // Assets & Resources
    { name: "Unsplash", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "unsplash.com" }], confidence: 0.9 },
    { name: "Pexels", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "pexels.com" }], confidence: 0.9 },
    { name: "Adobe Stock", categoryName: "Assets", conditions: [{ field: "domain", operator: "contains", value: "stock.adobe.com" }], confidence: 0.9 },
    { name: "Shutterstock", categoryName: "Assets", conditions: [{ field: "domain", operator: "contains", value: "shutterstock.com" }], confidence: 0.9 },
    { name: "iStock", categoryName: "Assets", conditions: [{ field: "domain", operator: "contains", value: "istockphoto.com" }], confidence: 0.9 },
    { name: "Noun Project", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "thenounproject.com" }], confidence: 0.9 },
    { name: "Flaticon", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "flaticon.com" }], confidence: 0.9 },
    { name: "Icons8", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "icons8.com" }], confidence: 0.9 },
    { name: "Font Awesome", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "fontawesome.com" }], confidence: 0.9 },
    { name: "Google Fonts", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "fonts.google.com" }], confidence: 0.9 },
    { name: "Adobe Fonts", categoryName: "Assets", conditions: [{ field: "domain", operator: "contains", value: "fonts.adobe.com" }], confidence: 0.9 },
    { name: "Fontshare", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "fontshare.com" }], confidence: 0.9 },
    { name: "Coolors", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "coolors.co" }], confidence: 0.9 },
    { name: "Color Hunt", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "colorhunt.co" }], confidence: 0.9 },
    { name: "Happy Hues", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "happyhues.co" }], confidence: 0.9 },
    { name: "LottieFiles", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "lottiefiles.com" }], confidence: 0.9 },
    { name: "Rive", categoryName: "Assets", conditions: [{ field: "domain", operator: "equals", value: "rive.app" }], confidence: 0.9 },

    // Collaboration
    { name: "Figma Comments", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "equals", value: "figma.com" }, { field: "title", operator: "contains", value: "comment" }], conditionLogic: "AND", confidence: 0.9 },
    { name: "Zeplin", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "contains", value: "zeplin.io" }], confidence: 0.9 },
    { name: "Abstract", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "contains", value: "abstract.com" }], confidence: 0.9 },
    { name: "Avocode", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "contains", value: "avocode.com" }], confidence: 0.9 },
    { name: "Sympli", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "contains", value: "sympli.io" }], confidence: 0.9 },
    { name: "Loom", categoryName: "Collaboration", conditions: [{ field: "domain", operator: "contains", value: "loom.com" }], confidence: 0.85 },
    { name: "Loom App", categoryName: "Collaboration", conditions: [{ field: "app_name", operator: "contains", value: "Loom" }], confidence: 0.85 },

    // Communication
    { name: "Slack", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Slack" }], confidence: 0.85 },
    { name: "Slack Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "slack.com" }], confidence: 0.85 },
    { name: "Microsoft Teams", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Teams" }], confidence: 0.85 },
    { name: "Zoom", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "zoom" }], confidence: 0.9 },
    { name: "Google Meet", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "meet.google.com" }], confidence: 0.9 },

    ...DISTRACTION_RULES,
  ],
};

// ============================================================================
// MANAGER TEMPLATE
// ============================================================================

const MANAGER_TEMPLATE: CategoryTemplate = {
  id: "manager",
  name: "Manager",
  description: "Designed for project managers, team leads, and executives with focus on planning and coordination.",
  targetAudience: "Project managers, team leads, and executives",
  categories: [
    { name: "Meetings", description: "Video calls and meetings", productivityScore: 1, color: "#eab308" },
    { name: "Planning", description: "Project planning and task management", productivityScore: 1, color: "#3b82f6" },
    { name: "Communication", description: "Email, chat, and messaging", productivityScore: 1, color: "#10b981" },
    { name: "Reviews", description: "Performance reviews and feedback", productivityScore: 1, color: "#8b5cf6" },
    { name: "Documentation", description: "Reports and documentation", productivityScore: 1, color: "#06b6d4" },
    { name: "HR/Admin", description: "HR systems and administrative tasks", productivityScore: 0, color: "#f97316" },
    { name: "Distraction", description: "Non-work activities", productivityScore: -1, color: "#ef4444" },
  ],
  rules: [
    // Calendar & Scheduling
    { name: "Google Calendar", categoryName: "Meetings", conditions: [{ field: "domain", operator: "equals", value: "calendar.google.com" }], confidence: 0.95 },
    { name: "Calendar App", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "equals", value: "Calendar" }], confidence: 0.95 },
    { name: "Outlook Calendar", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "outlook" }, { field: "url_path", operator: "contains", value: "calendar" }], conditionLogic: "AND", confidence: 0.95 },
    { name: "Calendly", categoryName: "Meetings", conditions: [{ field: "domain", operator: "equals", value: "calendly.com" }], confidence: 0.9 },
    { name: "Cal.com", categoryName: "Meetings", conditions: [{ field: "domain", operator: "equals", value: "cal.com" }], confidence: 0.9 },
    { name: "Doodle", categoryName: "Meetings", conditions: [{ field: "domain", operator: "equals", value: "doodle.com" }], confidence: 0.9 },
    { name: "Fantastical", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "Fantastical" }], confidence: 0.95 },

    // Video Conferencing
    { name: "Zoom", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "zoom" }], confidence: 0.95 },
    { name: "Zoom Web", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "zoom.us" }], confidence: 0.9 },
    { name: "Google Meet", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "meet.google.com" }], confidence: 0.95 },
    { name: "Microsoft Teams Call", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "Teams" }, { field: "title", operator: "contains", value: "Meeting" }], conditionLogic: "AND", confidence: 0.95 },
    { name: "Webex", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "contains", value: "Webex" }], confidence: 0.95 },
    { name: "Around", categoryName: "Meetings", conditions: [{ field: "app_name", operator: "equals", value: "Around" }], confidence: 0.95 },
    { name: "Whereby", categoryName: "Meetings", conditions: [{ field: "domain", operator: "contains", value: "whereby.com" }], confidence: 0.9 },

    // Project Management
    { name: "Asana", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "asana.com" }], confidence: 0.95 },
    { name: "Asana App", categoryName: "Planning", conditions: [{ field: "app_name", operator: "contains", value: "Asana" }], confidence: 0.95 },
    { name: "Monday.com", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "monday.com" }], confidence: 0.95 },
    { name: "Trello", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "trello.com" }], confidence: 0.95 },
    { name: "Linear", categoryName: "Planning", conditions: [{ field: "domain", operator: "equals", value: "linear.app" }], confidence: 0.95 },
    { name: "Linear App", categoryName: "Planning", conditions: [{ field: "app_name", operator: "contains", value: "Linear" }], confidence: 0.95 },
    { name: "Jira", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "atlassian.net" }, { field: "url_path", operator: "contains", value: "jira" }], conditionLogic: "OR", confidence: 0.95 },
    { name: "Jira Software", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "jira" }], confidence: 0.9 },
    { name: "ClickUp", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "clickup.com" }], confidence: 0.95 },
    { name: "Basecamp", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "basecamp.com" }], confidence: 0.95 },
    { name: "Wrike", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "wrike.com" }], confidence: 0.95 },
    { name: "Teamwork", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "teamwork.com" }], confidence: 0.9 },
    { name: "Smartsheet", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "smartsheet.com" }], confidence: 0.9 },
    { name: "Airtable", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "airtable.com" }], confidence: 0.85 },
    { name: "Height", categoryName: "Planning", conditions: [{ field: "domain", operator: "equals", value: "height.app" }], confidence: 0.9 },
    { name: "Shortcut", categoryName: "Planning", conditions: [{ field: "domain", operator: "contains", value: "shortcut.com" }], confidence: 0.9 },

    // Communication
    { name: "Slack", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Slack" }], confidence: 0.9 },
    { name: "Slack Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "slack.com" }], confidence: 0.9 },
    { name: "Microsoft Teams", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Teams" }], confidence: 0.9 },
    { name: "Teams Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "teams.microsoft.com" }], confidence: 0.9 },
    { name: "Gmail", categoryName: "Communication", conditions: [{ field: "domain", operator: "equals", value: "mail.google.com" }], confidence: 0.9 },
    { name: "Outlook Mail", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "outlook" }], confidence: 0.85 },
    { name: "Apple Mail", categoryName: "Communication", conditions: [{ field: "app_name", operator: "equals", value: "Mail" }], confidence: 0.9 },
    { name: "Superhuman", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Superhuman" }], confidence: 0.95 },
    { name: "Superhuman Web", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "superhuman.com" }], confidence: 0.95 },
    { name: "Front", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "frontapp.com" }], confidence: 0.9 },

    // Documentation
    { name: "Notion", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "notion.so" }], confidence: 0.85 },
    { name: "Notion App", categoryName: "Documentation", conditions: [{ field: "app_name", operator: "contains", value: "Notion" }], confidence: 0.85 },
    { name: "Confluence", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "atlassian.net" }, { field: "url_path", operator: "contains", value: "wiki" }], conditionLogic: "AND", confidence: 0.9 },
    { name: "Google Docs", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "docs.google.com" }], confidence: 0.85 },
    { name: "Google Sheets", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "sheets.google.com" }], confidence: 0.85 },
    { name: "Google Slides", categoryName: "Documentation", conditions: [{ field: "domain", operator: "equals", value: "slides.google.com" }], confidence: 0.85 },
    { name: "Microsoft Word", categoryName: "Documentation", conditions: [{ field: "app_name", operator: "contains", value: "Word" }], confidence: 0.85 },
    { name: "Microsoft Excel", categoryName: "Documentation", conditions: [{ field: "app_name", operator: "contains", value: "Excel" }], confidence: 0.85 },
    { name: "Microsoft PowerPoint", categoryName: "Documentation", conditions: [{ field: "app_name", operator: "contains", value: "PowerPoint" }], confidence: 0.85 },
    { name: "Coda", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "coda.io" }], confidence: 0.85 },
    { name: "Slite", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "slite.com" }], confidence: 0.85 },
    { name: "Dropbox Paper", categoryName: "Documentation", conditions: [{ field: "domain", operator: "contains", value: "paper.dropbox.com" }], confidence: 0.85 },

    // Reviews & Feedback
    { name: "15Five", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "15five.com" }], confidence: 0.95 },
    { name: "Lattice", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "lattice.com" }], confidence: 0.95 },
    { name: "Culture Amp", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "cultureamp.com" }], confidence: 0.95 },
    { name: "Peakon", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "peakon.com" }], confidence: 0.95 },
    { name: "Small Improvements", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "small-improvements.com" }], confidence: 0.95 },
    { name: "Leapsome", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "leapsome.com" }], confidence: 0.95 },
    { name: "BambooHR Reviews", categoryName: "Reviews", conditions: [{ field: "domain", operator: "contains", value: "bamboohr.com" }, { field: "url_path", operator: "contains", value: "performance" }], conditionLogic: "AND", confidence: 0.9 },

    // HR & Admin
    { name: "BambooHR", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "bamboohr.com" }], confidence: 0.9 },
    { name: "Workday", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "workday.com" }], confidence: 0.9 },
    { name: "ADP", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "adp.com" }], confidence: 0.9 },
    { name: "Gusto", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "gusto.com" }], confidence: 0.9 },
    { name: "Rippling", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "rippling.com" }], confidence: 0.9 },
    { name: "Deel", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "deel.com" }], confidence: 0.9 },
    { name: "Remote", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "equals", value: "remote.com" }], confidence: 0.9 },
    { name: "Greenhouse", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "greenhouse.io" }], confidence: 0.9 },
    { name: "Lever", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "lever.co" }], confidence: 0.9 },
    { name: "Ashby", categoryName: "HR/Admin", conditions: [{ field: "domain", operator: "contains", value: "ashbyhq.com" }], confidence: 0.9 },

    ...DISTRACTION_RULES,
  ],
};

// ============================================================================
// WRITER TEMPLATE
// ============================================================================

const WRITER_TEMPLATE: CategoryTemplate = {
  id: "writer",
  name: "Writer",
  description: "Built for content writers, bloggers, journalists, and technical writers.",
  targetAudience: "Content writers, bloggers, journalists, and technical writers",
  categories: [
    { name: "Writing", description: "Active writing and content creation", productivityScore: 1, color: "#3b82f6" },
    { name: "Research", description: "Research and fact-checking", productivityScore: 1, color: "#8b5cf6" },
    { name: "Editing", description: "Editing and proofreading", productivityScore: 1, color: "#06b6d4" },
    { name: "Publishing", description: "CMS and publishing platforms", productivityScore: 1, color: "#10b981" },
    { name: "Analytics", description: "Content analytics and metrics", productivityScore: 1, color: "#f97316" },
    { name: "Communication", description: "Email, chat, and messaging", productivityScore: 0, color: "#eab308" },
    { name: "Distraction", description: "Non-work activities", productivityScore: -1, color: "#ef4444" },
  ],
  rules: [
    // Writing Tools
    { name: "Google Docs", categoryName: "Writing", conditions: [{ field: "domain", operator: "equals", value: "docs.google.com" }], confidence: 0.9 },
    { name: "Microsoft Word", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Word" }], confidence: 0.9 },
    { name: "Notion Writing", categoryName: "Writing", conditions: [{ field: "domain", operator: "contains", value: "notion.so" }], confidence: 0.85 },
    { name: "Notion App", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Notion" }], confidence: 0.85 },
    { name: "Bear", categoryName: "Writing", conditions: [{ field: "app_name", operator: "equals", value: "Bear" }], confidence: 0.9 },
    { name: "Ulysses", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Ulysses" }], confidence: 0.95 },
    { name: "iA Writer", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "iA Writer" }], confidence: 0.95 },
    { name: "Scrivener", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Scrivener" }], confidence: 0.95 },
    { name: "Draft", categoryName: "Writing", conditions: [{ field: "domain", operator: "equals", value: "draftin.com" }], confidence: 0.9 },
    { name: "Hemingway Editor", categoryName: "Writing", conditions: [{ field: "domain", operator: "contains", value: "hemingwayapp.com" }], confidence: 0.9 },
    { name: "Obsidian", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Obsidian" }], confidence: 0.85 },
    { name: "Typora", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Typora" }], confidence: 0.9 },
    { name: "Craft", categoryName: "Writing", conditions: [{ field: "app_name", operator: "equals", value: "Craft" }], confidence: 0.9 },
    { name: "Apple Notes", categoryName: "Writing", conditions: [{ field: "app_name", operator: "equals", value: "Notes" }], confidence: 0.8 },
    { name: "Evernote", categoryName: "Writing", conditions: [{ field: "app_name", operator: "contains", value: "Evernote" }], confidence: 0.8 },
    { name: "Dropbox Paper", categoryName: "Writing", conditions: [{ field: "domain", operator: "contains", value: "paper.dropbox.com" }], confidence: 0.85 },
    { name: "Coda", categoryName: "Writing", conditions: [{ field: "domain", operator: "contains", value: "coda.io" }], confidence: 0.8 },

    // Editing & Proofreading
    { name: "Grammarly", categoryName: "Editing", conditions: [{ field: "domain", operator: "contains", value: "grammarly.com" }], confidence: 0.95 },
    { name: "Grammarly App", categoryName: "Editing", conditions: [{ field: "app_name", operator: "contains", value: "Grammarly" }], confidence: 0.95 },
    { name: "ProWritingAid", categoryName: "Editing", conditions: [{ field: "domain", operator: "contains", value: "prowritingaid.com" }], confidence: 0.95 },
    { name: "LanguageTool", categoryName: "Editing", conditions: [{ field: "domain", operator: "contains", value: "languagetool.org" }], confidence: 0.9 },
    { name: "Wordtune", categoryName: "Editing", conditions: [{ field: "domain", operator: "contains", value: "wordtune.com" }], confidence: 0.9 },
    { name: "QuillBot", categoryName: "Editing", conditions: [{ field: "domain", operator: "contains", value: "quillbot.com" }], confidence: 0.9 },

    // Research
    { name: "Google Search", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "google.com" }, { field: "url_path", operator: "starts_with", value: "/search" }], conditionLogic: "AND", confidence: 0.8 },
    { name: "Google Scholar", categoryName: "Research", conditions: [{ field: "domain", operator: "equals", value: "scholar.google.com" }], confidence: 0.95 },
    { name: "Wikipedia", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "wikipedia.org" }], confidence: 0.85 },
    { name: "JSTOR", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "jstor.org" }], confidence: 0.95 },
    { name: "ResearchGate", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "researchgate.net" }], confidence: 0.9 },
    { name: "Academia.edu", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "academia.edu" }], confidence: 0.9 },
    { name: "PubMed", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "pubmed.ncbi" }], confidence: 0.95 },
    { name: "Statista", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "statista.com" }], confidence: 0.9 },
    { name: "Pew Research", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "pewresearch.org" }], confidence: 0.95 },
    { name: "Perplexity AI", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "perplexity.ai" }], confidence: 0.85 },
    { name: "ChatGPT", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "chat.openai.com" }], confidence: 0.8 },
    { name: "Claude", categoryName: "Research", conditions: [{ field: "domain", operator: "contains", value: "claude.ai" }], confidence: 0.8 },
    { name: "Zotero", categoryName: "Research", conditions: [{ field: "app_name", operator: "contains", value: "Zotero" }], confidence: 0.95 },
    { name: "Mendeley", categoryName: "Research", conditions: [{ field: "app_name", operator: "contains", value: "Mendeley" }], confidence: 0.95 },

    // Publishing & CMS
    { name: "WordPress", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "wordpress.com" }], confidence: 0.9 },
    { name: "WordPress Admin", categoryName: "Publishing", conditions: [{ field: "url_path", operator: "contains", value: "/wp-admin" }], confidence: 0.95 },
    { name: "Medium", categoryName: "Publishing", conditions: [{ field: "domain", operator: "equals", value: "medium.com" }], confidence: 0.85 },
    { name: "Medium Write", categoryName: "Writing", conditions: [{ field: "domain", operator: "equals", value: "medium.com" }, { field: "url_path", operator: "starts_with", value: "/new-story" }], conditionLogic: "AND", confidence: 0.95, priority: 10 },
    { name: "Substack", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "substack.com" }], confidence: 0.9 },
    { name: "Ghost", categoryName: "Publishing", conditions: [{ field: "url_path", operator: "contains", value: "/ghost/" }], confidence: 0.9 },
    { name: "Webflow", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "webflow.com" }], confidence: 0.85 },
    { name: "Squarespace", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "squarespace.com" }], confidence: 0.85 },
    { name: "Wix", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "wix.com" }], confidence: 0.85 },
    { name: "HubSpot CMS", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "hubspot.com" }, { field: "url_path", operator: "contains", value: "content" }], conditionLogic: "AND", confidence: 0.9 },
    { name: "Contentful", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "contentful.com" }], confidence: 0.9 },
    { name: "Sanity", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "sanity.io" }], confidence: 0.9 },
    { name: "Strapi", categoryName: "Publishing", conditions: [{ field: "title", operator: "contains", value: "Strapi" }], confidence: 0.85 },
    { name: "Beehiiv", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "beehiiv.com" }], confidence: 0.9 },
    { name: "ConvertKit", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "convertkit.com" }], confidence: 0.85 },
    { name: "Mailchimp", categoryName: "Publishing", conditions: [{ field: "domain", operator: "contains", value: "mailchimp.com" }], confidence: 0.85 },

    // Analytics
    { name: "Google Analytics", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "analytics.google.com" }], confidence: 0.95 },
    { name: "Google Search Console", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "search.google.com/search-console" }], confidence: 0.95 },
    { name: "Plausible", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "plausible.io" }], confidence: 0.9 },
    { name: "Fathom", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "usefathom.com" }], confidence: 0.9 },
    { name: "Mixpanel", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "mixpanel.com" }], confidence: 0.9 },
    { name: "Amplitude", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "amplitude.com" }], confidence: 0.9 },
    { name: "Hotjar", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "hotjar.com" }], confidence: 0.9 },
    { name: "Ahrefs", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "ahrefs.com" }], confidence: 0.9 },
    { name: "SEMrush", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "semrush.com" }], confidence: 0.9 },
    { name: "Moz", categoryName: "Analytics", conditions: [{ field: "domain", operator: "contains", value: "moz.com" }], confidence: 0.9 },

    // Communication
    { name: "Slack", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "Slack" }], confidence: 0.85 },
    { name: "Gmail", categoryName: "Communication", conditions: [{ field: "domain", operator: "equals", value: "mail.google.com" }], confidence: 0.85 },
    { name: "Apple Mail", categoryName: "Communication", conditions: [{ field: "app_name", operator: "equals", value: "Mail" }], confidence: 0.85 },
    { name: "Zoom", categoryName: "Communication", conditions: [{ field: "app_name", operator: "contains", value: "zoom" }], confidence: 0.9 },
    { name: "Google Meet", categoryName: "Communication", conditions: [{ field: "domain", operator: "contains", value: "meet.google.com" }], confidence: 0.9 },

    ...DISTRACTION_RULES,
  ],
};

// ============================================================================
// SIMPLE TEMPLATE
// ============================================================================

const SIMPLE_TEMPLATE: CategoryTemplate = {
  id: "simple",
  name: "Simple",
  description: "Basic 2-category system for users who want minimal categorization.",
  targetAudience: "Users who prefer minimal tracking overhead",
  categories: [
    { name: "Work", description: "All productive work activities", productivityScore: 1, color: "#3b82f6" },
    { name: "Distraction", description: "Non-work activities", productivityScore: -1, color: "#ef4444" },
  ],
  rules: [
    // Common work apps
    { name: "VS Code", categoryName: "Work", conditions: [{ field: "app_name", operator: "contains", value: "Code" }], confidence: 0.9 },
    { name: "Terminal", categoryName: "Work", conditions: [{ field: "app_name", operator: "equals", value: "Terminal" }], confidence: 0.85 },
    { name: "iTerm", categoryName: "Work", conditions: [{ field: "app_name", operator: "contains", value: "iTerm" }], confidence: 0.85 },
    { name: "Slack", categoryName: "Work", conditions: [{ field: "app_name", operator: "contains", value: "Slack" }], confidence: 0.8 },
    { name: "Microsoft Teams", categoryName: "Work", conditions: [{ field: "app_name", operator: "contains", value: "Teams" }], confidence: 0.8 },
    { name: "Zoom", categoryName: "Work", conditions: [{ field: "app_name", operator: "contains", value: "zoom" }], confidence: 0.85 },
    { name: "Google Meet", categoryName: "Work", conditions: [{ field: "domain", operator: "contains", value: "meet.google.com" }], confidence: 0.9 },
    { name: "Gmail", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "mail.google.com" }], confidence: 0.8 },
    { name: "Google Docs", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "docs.google.com" }], confidence: 0.85 },
    { name: "Google Sheets", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "sheets.google.com" }], confidence: 0.85 },
    { name: "Notion", categoryName: "Work", conditions: [{ field: "domain", operator: "contains", value: "notion.so" }], confidence: 0.8 },
    { name: "Figma", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "figma.com" }], confidence: 0.9 },
    { name: "GitHub", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "github.com" }], confidence: 0.9 },
    { name: "Jira", categoryName: "Work", conditions: [{ field: "domain", operator: "contains", value: "atlassian.net" }], confidence: 0.9 },
    { name: "Linear", categoryName: "Work", conditions: [{ field: "domain", operator: "equals", value: "linear.app" }], confidence: 0.9 },
    { name: "Asana", categoryName: "Work", conditions: [{ field: "domain", operator: "contains", value: "asana.com" }], confidence: 0.9 },
    { name: "Trello", categoryName: "Work", conditions: [{ field: "domain", operator: "contains", value: "trello.com" }], confidence: 0.9 },

    ...DISTRACTION_RULES,
  ],
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

const TEMPLATES: CategoryTemplate[] = [
  DEVELOPER_TEMPLATE,
  DESIGNER_TEMPLATE,
  MANAGER_TEMPLATE,
  WRITER_TEMPLATE,
  SIMPLE_TEMPLATE,
];

/**
 * Get all available templates
 */
export function getAvailableTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  categoryCount: number;
  ruleCount: number;
}> {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    targetAudience: t.targetAudience,
    categoryCount: t.categories.length,
    ruleCount: t.rules.length,
  }));
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(templateId: string): CategoryTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Apply a template to a user
 * Creates categories and rules from the template
 */
export function applyTemplate(
  userId: string,
  templateId: string,
  options: {
    /** Replace existing template rules (default: true) */
    replaceExisting?: boolean;
    /** Keep existing categories even if they have the same name (default: false) */
    keepExistingCategories?: boolean;
  } = {}
): ApplyTemplateResult {
  const { replaceExisting = true, keepExistingCategories = false } = options;

  const template = getTemplateById(templateId);
  if (!template) {
    return {
      success: false,
      categoriesCreated: 0,
      rulesCreated: 0,
      warnings: [],
      error: `Template "${templateId}" not found`,
    };
  }

  const warnings: string[] = [];

  try {
    // Remove existing template rules if replacing
    if (replaceExisting && hasTemplateRules(userId)) {
      const deleted = deleteTemplateRulesForUser(userId);
      warnings.push(`Removed ${deleted} existing template rules`);
    }

    // Get existing categories to check for duplicates
    const existingCategories = getCategoriesByUserId(userId, true);
    const existingCategoryNames = new Map(
      existingCategories.map((c) => [c.name.toLowerCase(), c.id])
    );

    // Create category name to ID mapping
    const categoryIdMap = new Map<string, string>();
    let categoriesCreated = 0;

    // Create categories from template
    for (const templateCategory of template.categories) {
      const existingId = existingCategoryNames.get(templateCategory.name.toLowerCase());

      if (existingId && keepExistingCategories) {
        // Use existing category
        categoryIdMap.set(templateCategory.name, existingId);
        warnings.push(`Using existing category "${templateCategory.name}"`);
      } else if (existingId && !keepExistingCategories) {
        // Use existing category but don't warn
        categoryIdMap.set(templateCategory.name, existingId);
      } else {
        // Create new category
        const newCategory = createCategory({
          user_id: userId,
          name: templateCategory.name,
          description: templateCategory.description,
          color: templateCategory.color,
          is_productive: templateCategory.productivityScore === 1,
          is_default: false,
          is_archived: false,
        });
        categoryIdMap.set(templateCategory.name, newCategory.id);
        categoriesCreated++;
      }
    }

    // Create rules from template
    const ruleInputs = template.rules
      .filter((rule) => {
        const categoryId = categoryIdMap.get(rule.categoryName);
        if (!categoryId) {
          warnings.push(`Skipping rule "${rule.name}": category "${rule.categoryName}" not found`);
          return false;
        }
        return true;
      })
      .map((rule) => ({
        userId,
        name: rule.name,
        description: rule.description,
        categoryId: categoryIdMap.get(rule.categoryName)!,
        conditions: rule.conditions,
        conditionLogic: rule.conditionLogic ?? ("AND" as const),
        priority: rule.priority ?? 0,
        confidence: rule.confidence ?? 0.9,
        isEnabled: true,
        isSystem: true,
        source: "template" as const,
      }));

    const createdRules = createRulesBatch(ruleInputs);

    return {
      success: true,
      categoriesCreated,
      rulesCreated: createdRules.length,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      categoriesCreated: 0,
      rulesCreated: 0,
      warnings,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Check if a user has applied any template
 */
export function hasAppliedTemplate(userId: string): boolean {
  return hasTemplateRules(userId);
}
