# React Migration for Allen UI Console Electron App

This document explains the migration from vanilla JavaScript to React for the renderer process.

## Overview

The application has been migrated from vanilla JavaScript to React while maintaining all existing
functionality. The main process (Electron) remains unchanged, but the renderer process now uses
React components.

## New Structure

### React Components

- `src/renderer/components/App.tsx` - Main application component
- `src/renderer/components/Header.tsx` - Header with title and controls
- `src/renderer/components/WebViewContainer.tsx` - WebView wrapper component
- `src/renderer/components/StatusBar.tsx` - Status bar component

### Custom Hooks

- `src/renderer/hooks/useElectronAPI.ts` - Provides access to all Electron API functions
- `src/renderer/hooks/useRecording.ts` - Manages recording state and functionality

### Styles

- `src/renderer/styles/global.css` - Global styles
- Component-specific CSS files in `src/renderer/components/`

## Development Setup

### Prerequisites

Make sure you have all the new dependencies installed:

```bash
yarn install
```

### Development Commands

1. **Build the React renderer:**

   ```bash
   yarn renderer:build
   ```

2. **Development mode with hot reload:**

   ```bash
   yarn renderer:dev
   ```

3. **Start the Electron app:**

   ```bash
   yarn start
   ```

4. **Combined development (in separate terminals):**

   ```bash
   # Terminal 1: Build React with watch
   yarn renderer:dev

   # Terminal 2: Start Electron
   yarn start
   ```

## Key Changes

### 1. Component-Based Architecture

- Replaced vanilla JavaScript with React components
- Better separation of concerns
- Reusable components and hooks

### 2. TypeScript Support

- All components are written in TypeScript
- Better type safety and IntelliSense
- Proper type definitions for Electron API

### 3. Custom Hooks

- `useElectronAPI` - Provides all Electron API functions
- `useRecording` - Manages recording state
- Easy to extend with new hooks

### 4. Webpack Configuration

- Added webpack for bundling React components
- Babel configuration for TypeScript and React
- Development server support

## File Structure

```
src/renderer/
├── components/
│   ├── App.tsx
│   ├── Header.tsx
│   ├── Header.css
│   ├── WebViewContainer.tsx
│   ├── WebViewContainer.css
│   ├── StatusBar.tsx
│   └── StatusBar.css
├── hooks/
│   ├── useElectronAPI.ts
│   └── useRecording.ts
├── styles/
│   └── global.css
├── index.tsx
└── index.html
```

## Benefits of React Migration

1. **Better State Management** - React hooks provide cleaner state management
2. **Component Reusability** - Components can be easily reused and extended
3. **Type Safety** - TypeScript provides better development experience
4. **Easier Testing** - React components are easier to test
5. **Better Developer Experience** - Hot reload, better debugging, etc.

## Migration Notes

- All existing functionality is preserved
- Electron main process remains unchanged
- WebView integration works the same way
- Recording functionality is maintained
- All IPC communication works as before

## Troubleshooting

### Common Issues

1. **TypeScript errors**: Make sure all dependencies are installed
2. **Webpack build errors**: Check webpack.config.js configuration
3. **Electron API not found**: Ensure preload.js is properly configured

### Development Tips

1. Use `yarn renderer:dev` for development with hot reload
2. Use `yarn renderer:build` for production builds
3. Check the browser console for React-specific errors
4. Use React DevTools for debugging components

## Next Steps

1. Convert other windows (second-window.html, third-window.html) to React
2. Add more React components for better organization
3. Implement state management (Redux/Context) if needed
4. Add unit tests for React components
5. Optimize bundle size and performance
