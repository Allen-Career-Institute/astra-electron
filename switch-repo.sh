#!/bin/bash

# Script to switch between allen-ui-console-electron and allen-ui-live repositories

ELECTRON_REPO="/Users/dineshkumard/ALLEN_Digital/allen-ui-console-electron"
LIVE_REPO="/Users/dineshkumard/ALLEN_Digital/allen-ui-live"

echo "Available repositories:"
echo "1. allen-ui-console-electron"
echo "2. allen-ui-live"
echo "3. Open both in Cursor workspace"
echo ""

read -p "Select option (1-3): " choice

case $choice in
  1)
    echo "Switching to allen-ui-console-electron..."
    cd "$ELECTRON_REPO"
    code .
    ;;
  2)
    echo "Switching to allen-ui-live..."
    cd "$LIVE_REPO"
    code .
    ;;
  3)
    echo "Opening workspace with both repositories..."
    cd "$ELECTRON_REPO"
    code allen-workspace.code-workspace
    ;;
  *)
    echo "Invalid option"
    exit 1
    ;;
esac
