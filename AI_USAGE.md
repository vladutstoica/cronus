# Cronus AI Usage Guide

## Overview

Cronus has been converted to use **local AI (Ollama)** instead of OpenAI. **NO API KEY IS NEEDED!**

## AI Features

### What AI is Used For

1. **Activity Categorization** (Primary Feature)
   - Analyzes your active window, app name, URL, and page content
   - Automatically assigns activities to your custom categories
   - Considers your personal goals and projects when categorizing
   - File: `electron-app/src/main/services/categorization.ts`

2. **Activity Summaries**
   - Generates concise summaries of what you were doing
   - Used for activity blocks longer than 10 minutes
   - File: `src/main/services/categorization.ts:getAISummaryForBlock()`

3. **Title Analysis**
   - Checks if window titles are informative enough
   - Helps decide when to generate custom titles
   - File: `src/main/services/categorization.ts:isTitleInformative()`

4. **Activity Title Generation**
   - Creates descriptive 5-8 word titles for activities
   - Used when original window titles are not informative
   - File: `src/main/services/categorization.ts:generateActivityTitle()`

5. **Emoji Suggestions**
   - Suggests relevant emojis for your custom categories
   - Makes the UI more visually appealing
   - File: `src/main/services/categorization.ts:getEmojiForCategory()`

6. **Category Generation**
   - Generates 3-5 personalized categories based on your goals
   - Helps you get started with relevant categories
   - File: `src/main/services/categorization.ts:generateCategorySuggestions()`

## How to Set Up

### Prerequisites

You need to install **Ollama** on your system.

#### macOS

```bash
brew install ollama
```

Or download from: https://ollama.com/download

#### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows

Download from: https://ollama.com/download

### Start Ollama Service

```bash
ollama serve
```

### Download a Model

Recommended models (choose one):

**llama3.2** (Default, ~2GB)

```bash
ollama pull llama3.2
```

**llama3.1** (Larger, more accurate, ~4.7GB)

```bash
ollama pull llama3.1
```

**mistral** (Alternative, ~4GB)

```bash
ollama pull mistral
```

## Configuration

### Enable/Disable AI

AI categorization is **enabled by default** but can be toggled:

```javascript
// In renderer, use IPC:
window.electron.ipcRenderer.invoke("local:set-setting", "ai_enabled", false);
```

When AI is disabled, Cronus falls back to **rule-based categorization** (pattern matching).

### Change AI Model

```javascript
// Switch to a different Ollama model
window.electron.ipcRenderer.invoke(
  "local:set-setting",
  "ollama_model",
  "llama3.1",
);
```

### Screenshots

Screenshots are **disabled by default** to save disk space:

```javascript
// Enable screenshots
window.electron.ipcRenderer.invoke(
  "local:set-setting",
  "screenshots_enabled",
  true,
);
```

## Fallback Mode

If Ollama is not available or AI is disabled, Cronus uses **rule-based categorization**:

### Rule-Based Features

- Pattern matching based on app names, URLs, and keywords
- Fast and lightweight (no model needed)
- Less accurate than AI but works offline without any setup
- File: `src/main/services/ruleBasedCategorization.ts`

### Rule Categories

- **Work**: IDEs, documentation, GitHub, Stack Overflow
- **Communication**: Email, Slack, Teams, Zoom
- **Entertainment**: YouTube, Netflix, Spotify, Gaming
- **Social Media**: Twitter, Facebook, Instagram, TikTok
- **Shopping**: Amazon, eBay, e-commerce sites

## Architecture

### Local-First Design

```
┌─────────────────────────────────────┐
│   Cronus Desktop App (Electron)    │
├─────────────────────────────────────┤
│  ┌────────────┐    ┌─────────────┐ │
│  │  Renderer  │◄──►│ Main Process│ │
│  │    (UI)    │IPC │  (Backend)  │ │
│  └────────────┘    └──────┬──────┘ │
│                            │        │
│         ┌──────────────────┼─────┐  │
│         │                  │     │  │
│    ┌────▼──────┐   ┌──────▼───┐ │  │
│    │  SQLite   │   │  Ollama  │ │  │
│    │ Database  │   │   (AI)   │ │  │
│    └───────────┘   └──────────┘ │  │
│         │                │       │  │
│    Local Storage    Local AI    │  │
│    (cronus.db)   (localhost:11434)│ │
└─────────────────────────────────────┘
```

### Data Flow

1. Native module detects active window change
2. Main process receives window details
3. Stores event in SQLite database
4. Asynchronously categorizes using Ollama (or rules)
5. Updates event with category and reasoning
6. Renderer displays categorized activity

## API Keys: NOT NEEDED ✓

### Before (Cloud-based)

- ❌ Required OpenAI API key ($$$)
- ❌ Required Google OAuth credentials
- ❌ Required Stripe payment keys
- ❌ Required MongoDB connection string
- ❌ Required AWS S3 credentials

### After (Local-only)

- ✅ **No API keys needed!**
- ✅ All data stored locally in SQLite
- ✅ AI runs locally via Ollama (free, open source)
- ✅ Screenshots stored in local file system
- ✅ No cloud dependencies
- ✅ Works 100% offline

## Performance

### AI Categorization

- **First run**: 2-3 seconds (model loading)
- **Subsequent runs**: ~500ms per activity
- **Runs asynchronously**: Doesn't block UI

### Rule-Based Categorization

- **Speed**: <10ms per activity
- **Always available**: No model needed

## Privacy

### Data Storage

- All data stored in: `~/Library/Application Support/Cronus/` (macOS)
- Database file: `cronus.db`
- Screenshots: `screenshots/` subdirectory

### What's Tracked

- Window titles
- Application names
- URLs (for browsers)
- Page content (if permissions granted)
- Screenshots (if enabled)
- **All stored locally, nothing sent to cloud!**

### Ollama Privacy

- Runs entirely on your machine
- No data sent to external servers
- Models downloaded once and cached locally
- See: https://ollama.com/privacy

## Troubleshooting

### AI Not Working

1. Check if Ollama is running:

   ```bash
   curl http://localhost:11434/api/version
   ```

2. Check available models:

   ```bash
   ollama list
   ```

3. Pull a model if none available:

   ```bash
   ollama pull llama3.2
   ```

4. Check Cronus logs for errors (Help → Show Logs)

### Categorization Inaccurate

1. Update your goals in settings (helps AI understand context)
2. Create more specific category descriptions
3. Try a larger model like `llama3.1`
4. Manually recategorize activities to train your preferences

### Ollama Too Slow

1. Switch to a smaller model: `ollama pull llama3.2`
2. Disable AI and use rule-based categorization
3. Close other heavy applications
4. Consider upgrading RAM (models need 4-8GB)

## Advanced Configuration

### Custom Ollama Host

If running Ollama on a different machine:

```typescript
// Edit: src/main/services/ollama.ts
const ollamaClient = new Ollama({
  host: "http://your-machine:11434",
});
```

### Custom Rules

Edit `src/main/services/ruleBasedCategorization.ts` to add custom patterns:

```typescript
const CATEGORIZATION_RULES = {
  yourCategory: {
    keywords: ["your", "keywords"],
    apps: ["AppName"],
    domains: ["example.com"],
  },
};
```

## Future Improvements

Potential enhancements:

- [ ] Support for more Ollama models
- [ ] Learning from manual recategorizations
- [ ] Batch categorization for better performance
- [ ] Custom AI prompts per category
- [ ] Export/import categorization rules

## Summary

**Cronus now runs 100% locally with no API keys needed!**

- ✅ Free forever (no subscription)
- ✅ Private (data never leaves your machine)
- ✅ Fast (local processing)
- ✅ Flexible (AI or rule-based)
- ✅ Open source AI (Ollama)
