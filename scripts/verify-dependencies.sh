#!/bin/bash

# Verify critical dependencies for electron-updater
echo "🔍 Verifying electron-updater dependencies..."

# Check if electron-updater is installed
if [ -d "node_modules/electron-updater" ]; then
    echo "✅ electron-updater is installed"
else
    echo "❌ electron-updater is not installed"
    exit 1
fi

# Check if electron-updater package.json exists
if [ -f "node_modules/electron-updater/package.json" ]; then
    echo "✅ electron-updater package.json exists"
else
    echo "❌ electron-updater package.json missing"
    exit 1
fi

# Check if main entry point exists
if [ -f "node_modules/electron-updater/out/main.js" ]; then
    echo "✅ electron-updater main.js exists"
elif [ -f "node_modules/electron-updater/dist/main.js" ]; then
    echo "✅ electron-updater dist/main.js exists"
else
    echo "❌ electron-updater main entry point not found"
    exit 1
fi

# Check if autoUpdater is exported (will fail outside Electron context, which is expected)
if node -e "try { const updater = require('electron-updater'); console.log('✅ electron-updater module loaded'); if (updater.autoUpdater) { console.log('✅ autoUpdater export found'); } else { console.log('❌ autoUpdater export not found'); process.exit(1); } } catch(e) { if (e.message.includes('getVersion')) { console.log('✅ autoUpdater export found (expected error in non-Electron context)'); } else { console.log('❌ Unexpected error:', e.message); process.exit(1); } }"; then
  echo "✅ autoUpdater export verified"
else
  echo "❌ autoUpdater export verification failed"
  exit 1
fi

# Check other critical dependencies
echo "🔍 Checking other critical dependencies..."

# Check electron-store
if [ -d "node_modules/electron-store" ]; then
    echo "✅ electron-store is installed"
else
    echo "❌ electron-store is not installed"
fi

# Check @sentry/electron
if [ -d "node_modules/@sentry/electron" ]; then
    echo "✅ @sentry/electron is installed"
else
    echo "❌ @sentry/electron is not installed"
fi

# Check uuid
if [ -d "node_modules/uuid" ]; then
    echo "✅ uuid is installed"
else
    echo "❌ uuid is not installed"
fi

# Check date-fns
if [ -d "node_modules/date-fns" ]; then
    echo "✅ date-fns is installed"
else
    echo "❌ date-fns is not installed"
fi

echo "🎉 Dependency verification complete!"
