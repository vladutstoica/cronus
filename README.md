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
├── src/
│   ├── main/              # Main process (Node.js)
│   │   ├── database/      # SQLite database layer
│   │   ├── services/      # Business logic
│   │   │   ├── categorization.ts      # AI categorization
│   │   │   ├── ollama.ts             # Ollama client
│   │   │   ├── ruleBasedCategorization.ts  # Fallback rules
│   │   │   └── windowTracking.ts     # Event processing
│   │   ├── index.ts       # App entry point
│   │   └── ipc.ts         # IPC handlers
│   ├── renderer/          # Renderer process (React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── lib/
│   │   │   │   └── localApi.ts  # Local API client
│   │   │   └── main.tsx
│   │   └── ...
│   ├── preload/           # Preload scripts
│   ├── shared/            # Shared TypeScript types
│   └── native-modules/    # Native window tracking
├── package.json
└── README.md              # This file
```

### Build Commands

```bash
# Development (run from source)
bun run dev

# Type checking
bun run typecheck

# Build for production (creates distributable app)
bun run build                 # Compiles code to out/ directory
bun run build:local           # electron-builder --mac --dir
bun run build:win             # electron-builder --win
bun run build:linux           # electron-builder --linux
```

## 📦 Building & Deployment

### Quick Local Build (For Personal Use)

Build an unsigned macOS app for personal use:

```bash
# For Apple Silicon (M1/M2/M3)
bun run quick-build

# The DMG will open automatically, or find it at:
# dist/Cronus-2.0.0-arm64.dmg
```

**What this produces:**
- Unsigned `.dmg` installer in `dist/`
- Unsigned `.app` bundle in `dist/mac-arm64/Cronus.app`
- Fast build (~2-3 minutes)
- **Can only be used locally** (not for distribution)

### Installing the Built App

1. **From DMG** (recommended):
   ```bash
   # DMG opens automatically after build, or:
   open dist/Cronus-*.dmg
   ```
   - Drag Cronus.app to Applications folder
   - Launch from Applications

2. **Direct from build folder**:
   ```bash
   open dist/mac-arm64/Cronus.app
   ```

### First Launch Setup

After installing, Cronus needs macOS permissions:

1. **Launch Cronus** from Applications
2. **Grant Accessibility permission** when prompted:
   - System Settings → Privacy & Security → Accessibility
   - Click the lock to make changes
   - Enable **Cronus**
3. **Restart Cronus** for permissions to take effect

**Optional permissions:**
- **Screen Recording** - Enable if you want screenshot features
  - System Settings → Privacy & Security → Screen Recording
  - Enable Cronus

### Architecture Support

```bash
# Apple Silicon (M1/M2/M3) - Default
bun run quick-build

# Intel Macs (x64)
NODE_ENV=production bun run build && \
npx electron-builder --mac --x64 \
  -c.mac.forceCodeSigning=false \
  -c.mac.notarize=false \
  -c.dmg.sign=false

# Universal Binary (both architectures)
NODE_ENV=production bun run build && \
npx electron-builder --mac --universal \
  -c.mac.forceCodeSigning=false \
  -c.mac.notarize=false
```

### Production Build (For Distribution)

To distribute Cronus to others (requires **Apple Developer account**, $99/year):

```bash
# 1. Set up code signing certificate in Keychain
# 2. Create .env.production with:
#    APPLE_ID=your@email.com
#    APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
#    APPLE_TEAM_ID=XXXXXXXXXX

# 3. Build and sign for ARM64
bun run build:for-publish:arm64

# 4. Build and sign for Intel
bun run build:for-publish:x64

# Output: dist/Cronus-2.0.0-{arch}.dmg (signed & notarized)
```

**What this produces:**
- Code-signed DMG
- Notarized by Apple
- Users can install without security warnings
- Required for public distribution

### Versioning

The app version is defined in `package.json`:

```json
{
  "name": "Cronus",
  "version": "2.0.0"
}
```

**To update the version:**

1. **Update package.json**:
   ```bash
   # Manually edit package.json or use npm:
   npm version patch  # 2.0.0 → 2.0.1
   npm version minor  # 2.0.0 → 2.1.0
   npm version major  # 2.0.0 → 3.0.0
   ```

2. **Rebuild**:
   ```bash
   bun run quick-build
   ```

3. **New DMG will include updated version**:
   ```
   dist/Cronus-2.0.1-arm64.dmg
   ```

**Versioning best practices:**
- **Patch** (2.0.x) - Bug fixes, small changes
- **Minor** (2.x.0) - New features, backward compatible
- **Major** (x.0.0) - Breaking changes

### Distribution Options

**1. Local Distribution** (friends, team, testing):
```bash
# Build unsigned DMG
bun run quick-build

# Share the DMG file
# Recipients must right-click → Open (bypass Gatekeeper)
```

**2. Public Distribution** (requires Apple Developer account):
```bash
# Build signed & notarized DMG
bun run build:for-publish:arm64

# Upload to your website or GitHub Releases
# Users can install normally (no security warnings)
```

**3. GitHub Releases** (recommended):
```bash
# 1. Tag the version
git tag v2.0.0
git push --tags

# 2. Build
bun run build:for-publish:arm64

# 3. Create GitHub Release
# - Go to https://github.com/yourusername/cronus/releases/new
# - Select tag: v2.0.0
# - Upload: dist/Cronus-2.0.0-arm64.dmg
# - Add release notes
# - Publish
```

### Auto-Updates (Optional)

Cronus has electron-updater configured for auto-updates.

**Setup auto-updates:**

1. **Configure S3 bucket** (or GitHub Releases):
   - See `package.json` → `"publish"` section
   - Currently configured for S3: `cronusnewupdates` bucket

2. **Enable auto-updates in code**:
   - Updates are checked on app launch
   - See `src/main/index.ts` for update logic

3. **Publish updates**:
   ```bash
   # Publishes to S3 bucket
   bun run publish:with-links:arm64
   ```

### Build Output Structure

After running `bun run quick-build`:

```
cronus/
├── dist/
│   ├── Cronus-2.0.0-arm64.dmg          # DMG installer
│   ├── mac-arm64/
│   │   └── Cronus.app                   # App bundle
│   ├── builder-effective-config.yaml    # Build config
│   └── latest-mac.yml                   # Auto-update metadata
└── out/
    ├── main/                            # Compiled main process
    ├── preload/                         # Compiled preload scripts
    └── renderer/                        # Compiled React app
```

### Cleaning Build Artifacts

```bash
# Clean all build outputs
rm -rf dist/ out/

# Clean app data (removes database, settings)
bun run clean:cronus-installation

# Full clean + rebuild
bun run clean-and-quick-build
```

### Adding Features

1. **New IPC Handler** (main process)
   ```typescript
   // src/main/ipc.ts
   ipcMain.handle('local:your-feature', async (_event, ...args) => {
     // Your logic here
     return result
   })
   ```

2. **New API Method** (renderer)
   ```typescript
   // src/renderer/src/lib/localApi.ts
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
