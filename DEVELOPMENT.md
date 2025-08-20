# Development Guide

This guide explains how to use the development environment with automatic restart capabilities.

## Development Scripts

Watches React files and rebuilds automatically.

### 1. **Both React and Electron** (Alternative)

```bash
yarn dev:full
```

Runs both watchers using concurrently.

## What Gets Watched

### **Electron Main Process** (via nodemon)

- `src/main.js` - Main Electron process
- `src/preload.js` - Preload script
- `src/recording-process.js` - Recording worker
- `src/advanced-recording-process.js` - Advanced recording worker

### **React Renderer Process** (via webpack)

- All files in `src/renderer/`
- TypeScript/JavaScript files
- CSS files
- Component files

## Auto-Restart Behavior

### **Main Process Changes**

- ✅ Automatically closes existing Electron windows
- ✅ Terminates recording workers
- ✅ Restarts Electron with new code
- ✅ Preserves React build

### **React Changes**

- ✅ Automatically rebuilds React bundle
- ✅ Hot reloads in Electron
- ✅ No Electron restart needed

## Development Workflow

1. **Start Development:**

   ```bash
   yarn dev:script
   ```

2. **Make Changes:**
   - Edit React components → Auto-rebuild
   - Edit main process → Auto-restart
   - Edit preload script → Auto-restart

3. **Stop Development:**
   ```bash
   Ctrl+C
   ```

## Troubleshooting

### **Electron Windows Not Closing**

- Check if there are multiple Electron processes running
- Use `pkill -f electron` to force close all instances

### **React Build Not Updating**

- Check webpack output for errors
- Restart the development script

### **Port Conflicts**

- Check if port 3000 is in use (webpack dev server)
- Kill existing processes: `pkill -f webpack`

## File Structure for Development

```
src/
├── main.js                    # Main Electron process (watched)
├── preload.js                 # Preload script (watched)
├── recording-process.js       # Recording worker (watched)
├── advanced-recording-process.js # Advanced recording worker (watched)
└── renderer/
    ├── components/            # React components (watched)
    ├── hooks/                # React hooks (watched)
    ├── styles/               # CSS files (watched)
    └── index.tsx             # React entry point (watched)
```

## Environment Variables

The development environment uses:

- `NODE_ENV=development`
- Auto-detection of Sentry DSN
- Development-specific URLs

## Performance Tips

1. **Use the full development script** for best experience
2. **Keep DevTools open** for debugging
3. **Monitor console output** for build status
4. **Use Ctrl+C** to properly cleanup processes
