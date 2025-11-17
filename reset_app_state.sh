#!/bin/bash
set -e

echo "🧹 Resetting Cronus app state (permissions and local data)..."

# Kill any running Cronus processes
echo "🛑 Stopping any running Cronus processes..."
pkill -f "Cronus" || true
pkill -f "cronus" || true

# Wait a moment for processes to fully terminate
sleep 1
echo "✅ Cronus processes stopped."


# Clear any cached app data (includes localStorage)
echo "🧹 Clearing cached app data..."
rm -rf "$HOME/Library/Application Support/cronus-electron-app" || true
rm -rf "$HOME/Library/Application Support/Cronus" || true
rm -rf "$HOME/Library/Caches/com.cronus.app" || true
rm -rf "$HOME/Library/Preferences/com.cronus.app.plist" || true
echo "✅ Cached data cleared."

# Reset permissions (TCC database)
# This will force macOS to re-prompt for these permissions on next launch.
echo "🔐 Resetting AppleEvents, Accessibility, and ScreenCapture permissions..."
tccutil reset AppleEvents com.cronus.app || true
tccutil reset Accessibility com.cronus.app || true
tccutil reset ScreenCapture com.cronus.app || true
echo "✅ Permissions reset."

echo "✨ App state reset complete! You can now relaunch the application."
