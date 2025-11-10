# Cronus - Local-First Time Tracking

> **100% Local. 100% Private. 0% API Keys Needed.**

Cronus is a privacy-first, local-only desktop time tracking application that automatically categorizes your activities using AI that runs entirely on your machine.

## ✨ Features

- 🏠 **Fully Local** - All data stored on your machine in SQLite
- 🤖 **Local AI** - Powered by Ollama (no OpenAI API key needed!)
- 🔒 **100% Private** - No cloud dependencies, no data collection
- 📊 **Smart Categorization** - AI or rule-based activity categorization
- ⚡ **Fast & Lightweight** - No network latency, instant responses
- 💰 **Free Forever** - No subscriptions, no payments

## 🚀 Quick Start

### Prerequisites

1. **Ollama** (for AI features)
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows
   # Download from: https://ollama.com/download
   ```

2. **Node.js 18+** and **Bun**
   ```bash
   brew install bun  # macOS
   ```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cronus.git
   cd cronus
   ```

2. **Install dependencies**
   ```bash
   cd electron-app
   bun install
   ```

3. **Start Ollama and pull a model**
   ```bash
   # Start Ollama service (in a separate terminal)
   ollama serve

   # Pull a model (choose one)
   ollama pull llama3.2    # Recommended, ~2GB
   ollama pull llama3.1    # More accurate, ~4.7GB
   ollama pull mistral     # Alternative, ~4GB
   ```

4. **Run the app**
   ```bash
   bun run dev
   ```

## 🏗️ Architecture

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

### Data Storage

All data is stored locally in:
- **macOS**: `~/Library/Application Support/Cronus/`
- **Linux**: `~/.local/share/Cronus/`
- **Windows**: `%APPDATA%\Cronus\`

Files:
- `cronus.db` - SQLite database (users, categories, events)
- `screenshots/` - Optional local screenshots (disabled by default)

### No Cloud Dependencies

❌ **Removed:**
- MongoDB (replaced with SQLite)
- OpenAI API (replaced with Ollama)
- Google OAuth (no auth needed)
- Stripe payments (free forever)
- AWS S3 (local file storage)
- PostHog analytics (privacy-first)

✅ **Result:**
- **No API keys needed**
- **No internet required** (after initial model download)
- **No subscriptions**
- **No tracking**

## 🤖 AI Features

All AI features use **Ollama** (local, open-source LLM) - **NO API KEY REQUIRED!**

### 1. Activity Categorization
Automatically assigns activities to your custom categories based on:
- Application name
- Window title
- URL (for browsers)
- Page content (if permissions granted)
- Your personal goals and projects

### 2. Activity Summaries
Generates concise summaries of what you were doing for longer activity blocks.

### 3. Smart Titles
Creates descriptive titles when window titles are not informative (e.g., "New Tab").

### 4. Category Suggestions
Generates personalized categories based on your goals and projects.

### 5. Emoji Suggestions
Suggests relevant emojis for your categories.

### 6. Rule-Based Fallback
If Ollama is unavailable or disabled, Cronus uses fast rule-based categorization:
- Pattern matching on app names, URLs, keywords
- Predefined rules for: work, communication, entertainment, social media
- <10ms categorization time

## ⚙️ Configuration

### Settings

All settings stored locally in SQLite:

```javascript
// AI Configuration
ai_enabled: true/false           // Enable/disable AI categorization
ollama_model: 'llama3.2'        // Which Ollama model to use
categorization_enabled: true     // Enable/disable categorization

// Privacy
screenshots_enabled: false       // Enable/disable screenshots (off by default)
```

### Change Settings

Via IPC (in renderer):
```javascript
// Disable AI
await window.electron.ipcRenderer.invoke('local:set-setting', 'ai_enabled', false)

// Enable screenshots
await window.electron.ipcRenderer.invoke('local:set-setting', 'screenshots_enabled', true)

// Change AI model
await window.electron.ipcRenderer.invoke('local:set-setting', 'ollama_model', 'llama3.1')
```

### Available Ollama Models

```bash
# List installed models
ollama list

# Pull a new model
ollama pull <model-name>

# Popular models:
ollama pull llama3.2     # Fast, lightweight (2GB)
ollama pull llama3.1     # More accurate (4.7GB)
ollama pull mistral      # Alternative (4GB)
ollama pull codellama    # Code-focused (7GB)
```

## 📊 How It Works

### Window Tracking Flow

1. **Native module detects active window change**
   - Captures app name, window title, URL (for browsers)
   - Optionally captures page content (with permissions)

2. **Main process receives window details**
   - Stores event in SQLite database with timestamp
   - Tracks duration of each activity

3. **Asynchronous categorization**
   - If AI enabled: Sends to Ollama for smart categorization
   - If AI disabled: Uses rule-based pattern matching
   - Updates event with category and reasoning

4. **UI updates**
   - Renderer displays categorized activity
   - Shows productivity statistics
   - Allows manual recategorization

### Database Schema

```sql
-- Users (local user profile)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  user_projects_and_goals TEXT,  -- JSON
  electron_app_settings TEXT      -- JSON
);

-- Categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  description TEXT,
  color TEXT,
  emoji TEXT,
  is_productive INTEGER,
  is_default INTEGER
);

-- Active Window Events
CREATE TABLE active_window_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  window_id TEXT,
  owner_name TEXT,          -- App name
  title TEXT,               -- Window title
  url TEXT,                 -- URL (browsers)
  content TEXT,             -- Page content
  category_id TEXT,         -- Assigned category
  category_reasoning TEXT,  -- AI explanation
  timestamp DATETIME,
  duration_ms INTEGER,
  screenshot_path TEXT      -- Local file path
);

-- App Settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## 🔒 Privacy & Security

### Data Privacy
- **100% local storage** - Nothing sent to cloud
- **No telemetry** - No analytics or tracking
- **No accounts** - No email, no passwords
- **Your data, your machine** - Full control

### AI Privacy
- Ollama runs **entirely on your machine**
- No data sent to OpenAI or any external service
- Models downloaded once, cached locally
- See: https://ollama.com/privacy

### Permissions

Cronus requests minimal macOS permissions:
- **Accessibility** (required) - Read window titles and content
- **Screen Recording** (optional) - Capture screenshots

These permissions are **only used locally** - no data leaves your machine.

## 🛠️ Development

### Project Structure

```
cronus/
├── electron-app/          # Main Electron application
│   ├── src/
│   │   ├── main/          # Main process (Node.js)
│   │   │   ├── database/  # SQLite database layer
│   │   │   ├── services/  # Business logic
│   │   │   │   ├── categorization.ts      # AI categorization
│   │   │   │   ├── ollama.ts             # Ollama client
│   │   │   │   ├── ruleBasedCategorization.ts  # Fallback rules
│   │   │   │   └── windowTracking.ts     # Event processing
│   │   │   ├── index.ts   # App entry point
│   │   │   └── ipc.ts     # IPC handlers
│   │   ├── renderer/      # Renderer process (React)
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   ├── contexts/
│   │   │   │   ├── lib/
│   │   │   │   │   └── localApi.ts  # Local API client
│   │   │   │   └── main.tsx
│   │   │   └── ...
│   │   ├── preload/       # Preload scripts
│   │   └── native-modules/ # Native window tracking
│   └── package.json
├── shared/                # Shared TypeScript types
└── README.md              # This file
```

### Build Commands

```bash
# Development
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Build for specific platform
bun run build:mac
bun run build:win
bun run build:linux
```

### Adding Features

1. **New IPC Handler** (main process)
   ```typescript
   // electron-app/src/main/ipc.ts
   ipcMain.handle('local:your-feature', async (_event, ...args) => {
     // Your logic here
     return result
   })
   ```

2. **New API Method** (renderer)
   ```typescript
   // electron-app/src/renderer/src/lib/localApi.ts
   export const localApi = {
     yourFeature: {
       doSomething: async (data: any) => {
         return window.electron.ipcRenderer.invoke('local:your-feature', data)
       }
     }
   }
   ```

## 🐛 Troubleshooting

### Ollama Not Working

**Symptoms:** AI categorization not working, using fallback rules

**Solutions:**
1. Check if Ollama is running:
   ```bash
   curl http://localhost:11434/api/version
   ```

2. Start Ollama:
   ```bash
   ollama serve
   ```

3. Check available models:
   ```bash
   ollama list
   ```

4. Pull a model if none available:
   ```bash
   ollama pull llama3.2
   ```

### Database Issues

**Symptoms:** App crashes, data not saving

**Solutions:**
1. Check database file exists:
   ```bash
   ls ~/Library/Application\ Support/Cronus/cronus.db  # macOS
   ```

2. Reset database (⚠️ deletes all data):
   ```bash
   rm ~/Library/Application\ Support/Cronus/cronus.db
   ```

3. Check app logs:
   - macOS: `~/Library/Logs/Cronus/`
   - Check Console.app for errors

### Permissions Issues (macOS)

**Symptoms:** Window titles not captured, content empty

**Solutions:**
1. Grant Accessibility permission:
   - System Settings → Privacy & Security → Accessibility
   - Add Cronus

2. Grant Screen Recording permission (if using screenshots):
   - System Settings → Privacy & Security → Screen Recording
   - Add Cronus

3. Restart the app after granting permissions

## 📚 Additional Documentation

- [AI Usage Guide](./AI_USAGE.md) - Detailed AI features and configuration
- [Conversion Status](./CONVERSION_STATUS.md) - Migration from cloud to local

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

- **Ollama** - Local LLM runtime (https://ollama.com)
- **better-sqlite3** - Fast SQLite bindings
- **Electron** - Cross-platform desktop framework

## 📞 Support

- **Issues**: https://github.com/yourusername/cronus/issues
- **Documentation**: https://github.com/yourusername/cronus/wiki

---

**Made with ❤️ for privacy-conscious individuals**

*No tracking. No subscriptions. No cloud. Just your data, on your machine.*
