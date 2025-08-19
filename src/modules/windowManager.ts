import { BrowserWindow, session } from 'electron';
import path from 'path';
import { ENV, DEFAULT_URL } from './config';

let mainWindow: BrowserWindow | null = null;
let mainWindowHasLoaded: boolean = false;

// Create a shared session for all windows to ensure localStorage/cookies persistence
const sharedSession = session.fromPartition('persist:shared');

// Debug: Log session information
console.log('Shared session created with partition: persist:shared');
console.log('Shared session storage path:', sharedSession.getStoragePath());

function injectTokensToWindow(window: BrowserWindow): void {
  if (ENV === 'development') {
    const tokens = JSON.parse(process.env.AUTH_TOKEN || '{}');

    if (tokens && Object.keys(tokens).length > 0) {
      window.webContents.executeJavaScript(`
        (function() {
          try {
            const tokens = ${JSON.stringify(tokens)};
            localStorage.setItem('tokens', JSON.stringify(tokens));
          } catch (error) {
            console.error('Failed to inject tokens to localStorage:', error);
          }
        })();
      `);
    }
  }
}

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    frame: true,
    maximizable: true,
    resizable: true,
    minimizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      webSecurity: false, // only if you trust the content
      sandbox: false,
      allowRunningInsecureContent: true, // only if HTTP content
      // Most important for WebRTC:
      webviewTag: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'MediaCapture,ScreenCapture',
      // Use shared session for localStorage/cookies persistence
      session: sharedSession,
    },
    title: 'Allen UI Console',
  });

  mainWindow.loadURL(DEFAULT_URL);
  mainWindow.setFullScreen(true);
  mainWindow.maximize();

  sharedSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === 'media' || permission === 'display-capture') {
        callback(true); // Allow screen capture
      } else {
        callback(false);
      }
    }
  );

  if (ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Ensure fullscreen is properly set after content loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindowHasLoaded = true;
    try {
      if (mainWindow) {
        mainWindow.setFullScreen(true);
        mainWindow.maximize();
        injectTokensToWindow(mainWindow);
      }
    } catch (error) {
      console.error('Failed to inject tokens to main window:', error);
    }
  });

  mainWindow.webContents.on('did-start-loading', () => {
    mainWindowHasLoaded = false;
  });

  // Stream window is now floating and independent - no need to update its position
  // when main window moves or resizes

  return mainWindow;
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function isMainWindowLoaded(): boolean {
  return mainWindowHasLoaded;
}

function setMainWindowLoaded(loaded: boolean): void {
  mainWindowHasLoaded = loaded;
}

// Export the shared session so other windows can use it
export {
  createMainWindow,
  getMainWindow,
  isMainWindowLoaded,
  setMainWindowLoaded,
  injectTokensToWindow,
  sharedSession,
};

// Utility function to get the shared session with proper configuration
export function getSharedSession() {
  // Ensure the session is properly configured
  sharedSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === 'media' || permission === 'display-capture') {
        callback(true); // Allow screen capture
      } else {
        callback(false);
      }
    }
  );

  return sharedSession;
}
