#!/bin/bash

# Allen UI Console Electron App - Bun Setup Script

echo "🚀 Setting up Allen UI Console Electron App with Bun..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check Bun version
BUN_VERSION=$(bun --version)
echo "📦 Bun version: $BUN_VERSION"

# Install dependencies
echo "📥 Installing dependencies..."
bun install

# Setup Husky
echo "🐕 Setting up Husky..."
bunx husky install

# Setup commitlint
echo "📝 Setting up commitlint..."
bunx husky add .husky/commit-msg 'bunx commitlint --edit $1'

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p assets
mkdir -p recordings
mkdir -p logs

# Check if assets exist
if [ ! -f "assets/icon.icns" ]; then
    echo "⚠️  Warning: assets/icon.icns not found. Please add your app icons:"
    echo "   - assets/icon.icns (macOS)"
    echo "   - assets/icon.ico (Windows)"
    echo "   - assets/icon.png (Linux)"
fi

if [ ! -f "assets/splash.png" ]; then
    echo "⚠️  Warning: assets/splash.png not found. Please add your splash screen."
fi

# Setup environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file..."
    cat > .env << EOF
# Environment
NODE_ENV=development
APP_VERSION=1.0.0

# URLs
STAGE_URL=https://console.allen-stage.in
PROD_URL=https://astra.allen.in
CUSTOM_URL=http://localhost:3000

# Sentry Configuration (optional)
ASTRA_ELECTRON_SENTRY_DSN=dsdd
# GitHub Secrets (for CI/CD)
# GITHUB_TOKEN=your-github-token
# SENTRY_AUTH_TOKEN=your-sentry-auth-token
# SENTRY_ORG=your-sentry-org
# SENTRY_PROJECT=your-sentry-project
EOF
    echo "✅ Created .env file with default values"
fi

# Run type checking
echo "🔍 Running type checking..."
bun run typecheck

# Run linting
echo "🔍 Running linting..."
bun run lint

# Format code
echo "🎨 Formatting code..."
bun run format

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Add your app icons to assets/ directory"
echo "   2. Configure your .env file with actual values"
echo "   3. Run 'bun run dev' to start development"
echo "   4. Run 'bun run build' to build for production"
echo ""
echo "📚 Documentation: README.md"
echo "📋 Requirements: REQUIREMENTS.md"
