#!/bin/bash
set -e

echo "🧹 Cleaning up any existing Cronus processes and files..."

# Kill any running Cronus processes
echo "🛑 Stopping any running Cronus processes..."
pkill -f "Cronus" || true
pkill -f "cronus" || true
pkill -f "cronus" || true

# Wait a moment for processes to fully terminate
sleep 2
echo "✅ Cronus processes stopped."


# 1. Delete the installed application from the /Applications folder
echo "🗑️ Removing existing Cronus.app..."
rm -rf "/Applications/Cronus.app" || true
rm -rf "$HOME/Applications/Cronus.app" || true
rm -rf "./dist/mac-arm64/Cronus.app" || true
rm -rf "./dist/mac/Cronus.app" || true
rm -rf "./dist/Cronus.app" || true
rm -rf "./dist" || true
echo "✅ Cronus.app removed."


# Clear any cached app data
echo "🧹 Clearing cached app data..."
rm -rf "$HOME/Library/Application Support/cronus-electron-app" || true
rm -rf "$HOME/Library/Application Support/Cronus" || true
rm -rf "$HOME/Library/Caches/com.cronus.app" || true
rm -rf "$HOME/Library/Preferences/com.cronus.app.plist" || true
echo "✅ Cached data cleared."

# 2. Reset permissions (TCC database)
# This will force macOS to re-prompt for these permissions on next launch.
# The '|| true' ensures the script doesn't fail if permissions were never granted.
echo "🔐 Resetting AppleEvents and Accessibility permissions for com.cronus.app..."
tccutil reset AppleEvents com.cronus.app || true
tccutil reset Accessibility com.cronus.app || true
tccutil reset ScreenCapture com.cronus.app || true
echo "✅ Permissions reset."

echo "✨ Cleanup complete!" 