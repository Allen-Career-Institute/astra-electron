#!/bin/bash

# Allen UI Console Electron App - Yarn 4 Setup Script

echo "🚀 Setting up Allen UI Console Electron App with Yarn 4..."

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install Yarn 4 first:"
    echo "   npm install -g yarn"
    exit 1
fi

# Check Yarn version
YARN_VERSION=$(yarn --version)
echo "📦 Yarn version: $YARN_VERSION"

# Enable Yarn Berry (Yarn 4)
echo "🔄 Setting up Yarn Berry..."
yarn set version berry

# Configure Yarn for node_modules
echo "⚙️  Configuring Yarn for node_modules..."
yarn config set nodeLinker node-modules

# Install dependencies
echo "📥 Installing dependencies..."
yarn install

# Setup Husky
echo "🐕 Setting up Husky..."
yarn dlx husky install

# Setup commitlint
echo "📝 Setting up commitlint..."
yarn dlx husky add .husky/commit-msg 'yarn dlx commitlint --edit $1'

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
PR_URL_TEMPLATE=https://allen-ic-stage-ui-live-web-pr-{pr}-allen-frontend-team.vercel.app

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
yarn typecheck

# Run linting
echo "🔍 Running linting..."
yarn lint

# Format code
echo "🎨 Formatting code..."
yarn format

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Add your app icons to assets/ directory"
echo "   2. Configure your .env file with actual values"
echo "   3. Run 'yarn dev' to start development"
echo "   4. Run 'yarn build' to build for production"
echo ""
echo "📚 Documentation: README.md"
echo "📋 Requirements: REQUIREMENTS.md"
