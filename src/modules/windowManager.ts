import { BrowserWindow, session, dialog } from 'electron';
import path from 'path';
import { ENV, DEFAULT_URL, URLS } from './config';

let mainWindow: BrowserWindow | null = null;
let mainWindowHasLoaded: boolean = false;
let sharedSession: Electron.Session | null = null;

// Lazy initialization of shared session
function getSharedSession(): Electron.Session {
  if (!sharedSession) {
    // Create a shared session for all windows to ensure localStorage/cookies persistence
    sharedSession = session.fromPartition('persist:shared');

    // Debug: Log session information
    console.log('Shared session created with partition: persist:shared');
    console.log('Shared session storage path:', sharedSession.getStoragePath());

    // Configure permission handler
    sharedSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        if (permission === 'media' || permission === 'display-capture') {
          callback(true); // Allow screen capture
        } else {
          callback(false);
        }
      }
    );
  }
  return sharedSession;
}

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

function showEnvironmentValuesDialog(): void {
  try {
    // Get all environment variables
    const envVars = process.env;
    const envEntries = [
      ...Object.entries(envVars),
      ...Object.entries(URLS),
      ['ENV', ENV],
    ];

    // Filter out sensitive information and format for display
    const safeEnvVars = envEntries
      .filter(
        ([key]) =>
          !key.toLowerCase().includes('secret') &&
          !key.toLowerCase().includes('password') &&
          !key.toLowerCase().includes('token')
      )
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Show dialog with environment values
    dialog.showMessageBox({
      type: 'info',
      title: 'Environment Variables',
      message: 'Current environment variables:',
      detail: safeEnvVars || 'No environment variables found',
      buttons: ['OK'],
      defaultId: 0,
    });
  } catch (error) {
    console.error('Failed to show environment values dialog:', error);
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
      session: getSharedSession(),
    },
    title: 'Astra',
  });

  mainWindow.loadURL(DEFAULT_URL);
  mainWindow.setFullScreen(true);
  mainWindow.maximize();

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
        showEnvironmentValuesDialog();
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

// Export the shared session getter so other windows can use it
export {
  createMainWindow,
  getMainWindow,
  isMainWindowLoaded,
  setMainWindowLoaded,
  injectTokensToWindow,
  getSharedSession,
};
