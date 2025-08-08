#!/bin/bash

# Development script for Allen UI Console Electron App
# This script runs both React build watcher and Electron with nodemon

echo "🚀 Starting Allen UI Console development environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Cleaning up development environment..."
    pkill -f "electron"
    pkill -f "webpack"
    pkill -f "nodemon"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if React build exists, if not build it
if [ ! -f "dist/renderer/index.html" ]; then
    echo "📦 Building React application..."
    yarn renderer:build
fi

# Start React development watcher in background
echo "⚛️  Starting React development watcher..."
yarn renderer:dev &
REACT_PID=$!

# Wait a moment for React build to start
sleep 3

# Start Electron with nodemon
echo "🔌 Starting Electron with nodemon..."
yarn dev:watch &
ELECTRON_PID=$!

echo "✅ Development environment started!"
echo "📝 React watcher PID: $REACT_PID"
echo "🔌 Electron PID: $ELECTRON_PID"
echo ""
echo "🔄 Changes to main process files will restart Electron"
echo "⚛️  Changes to React files will rebuild automatically"
echo "🛑 Press Ctrl+C to stop all processes"

# Wait for both processes
wait $REACT_PID $ELECTRON_PID
