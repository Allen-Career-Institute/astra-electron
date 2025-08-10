const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import modules
const { initializeSentry } = require('./modules/sentry');
const { createMenu } = require('./modules/menu');
const { setupIpcHandlers } = require('./modules/ipcHandlers');
const { setupAutoUpdater } = require('./modules/autoUpdater');
const { cleanup, setupCleanupHandlers } = require('./modules/cleanup');
const { createMainWindow } = require('./modules/windowManager');
const { getStreamWindow } = require('./modules/streamWindow');

// Enable hardware acceleration and WebRTC optimizations for better video quality
app.commandLine.appendSwitch(
  '--enable-features',
  'VaapiVideoDecoder,VaapiVideoEncoder,WebCodecs'
);
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');
app.commandLine.appendSwitch('--enable-accelerated-video-encode');
app.commandLine.appendSwitch('--enable-webcodecs');
app.commandLine.appendSwitch('--enable-webrtc');

setupIpcHandlers(ipcMain);

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// App event handlers
app.on('ready', () => {
  try {
    initializeSentry();
    createMainWindow();
    createMenu();
    setupAutoUpdater();

    // Stream window is now positioned to not cover main window - no need for background positioning
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('focus', () => {
  // Stream window is now positioned to not cover main window
  // Ensure main window gets focus when app gains focus
  const { getMainWindow } = require('./modules/windowManager');
  const mainWindow = getMainWindow();

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.focus();
      mainWindow.show();
    } catch (error) {
      console.error('Error focusing main window on app focus:', error);
    }
  }

  // Ensure stream window doesn't steal focus
  const { getStreamWindow } = require('./modules/streamWindow');
  const streamWindow = getStreamWindow();

  if (streamWindow && !streamWindow.isDestroyed()) {
    try {
      streamWindow.setAlwaysOnTop(false);
      // Don't focus stream window
    } catch (error) {
      console.error('Error handling stream window on app focus:', error);
    }
  }
});

app.on('before-quit', () => {
  const streamWindow = getStreamWindow();
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
  }
  cleanup();
});

// Setup cleanup handlers
setupCleanupHandlers();
