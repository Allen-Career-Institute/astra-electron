import { BrowserWindow, session, app, globalShortcut } from 'electron';
import path from 'path';
import { getUrlByEnv, isDev, setCurrentUrl } from './config';
import { safeCloseStreamWindow } from './streamWindow';
import { safeClosewhiteboardWindow } from './whiteboard-window';
import { createMenu } from './menu';
import { registerMainUI } from './processNaming';
import {
  addKeyboardListenerUtil,
  registerZoomShortcut,
} from '../utils/keyboardListenerUtil';
import { getActiveProfile } from '../utils/profileUtils';

let mainWindow: BrowserWindow | null = null;
let mainWindowHasLoaded: boolean = false;
let sharedSession: Electron.Session | null = null;
let mainWindowPid: number | null = null;
let profileSelectionWindow: BrowserWindow | null = null;

// Lazy initialization of shared session
function getSharedSession(): Electron.Session {
  if (!sharedSession) {
    // Create a shared session for all windows to ensure localStorage/cookies persistence
    const sessionValue = getActiveProfile() || 'persist:shared';
    sharedSession = session.fromPartition(sessionValue);

    // Debug: Log session information
    console.log('Shared session created with partition:', sessionValue);
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
  if (isDev()) {
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

function createMainWindow(
  showProfileSelection: boolean = false
): BrowserWindow {
  const appPath = app.isPackaged ? app.getAppPath() : process.cwd();
  const activeProfile = getActiveProfile();
  if (!activeProfile || showProfileSelection) {
    const preloadPath = path.join(
      appPath,
      'dist',
      'profile-selection-preload.js'
    );
    if (showProfileSelection) {
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      });
    }
    // Create a new profile selection window
    profileSelectionWindow = new BrowserWindow({
      title: 'Astra - Profile Selection',
      show: true,
      fullscreen: true, // Explicitly prevent fullscreen
      webPreferences: {
        session: session.defaultSession,
        preload: preloadPath,
      },
      resizable: true,
      minimizable: true,
      maximizable: true,
      closable: false,
      alwaysOnTop: true, // Keep on top of main window
      skipTaskbar: false,
      autoHideMenuBar: true,
      frame: true,
      transparent: false,
      hasShadow: true,
      thickFrame: true,
      titleBarStyle: 'default',
    });

    profileSelectionWindow.loadFile(
      path.join(appPath, 'dist', 'renderer', 'profile-selection.html')
    );
    if (isDev()) {
      profileSelectionWindow.webContents.openDevTools();
    }
    return profileSelectionWindow;
  }
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  });
  // Use app.getAppPath() for packaged app, process.cwd() for development
  const preloadPath = path.join(appPath, 'dist', 'preload.js');
  if (profileSelectionWindow && !profileSelectionWindow.isDestroyed()) {
    profileSelectionWindow.destroy();
    profileSelectionWindow = null;
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    useContentSize: false,
    zoomToPageWidth: true,
    fullscreen: process.platform === 'darwin' ? true : false,
    frame: true,
    maximizable: true,
    resizable: true,
    minimizable: true,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false, // only if you trust the content
      sandbox: false,
      backgroundThrottling: false,
      allowRunningInsecureContent: true, // only if HTTP content
      // Most important for WebRTC:
      webviewTag: false,
      experimentalFeatures: true,
      enableBlinkFeatures:
        'WebCodecs,WebRTC,GetDisplayMedia,ScreenCaptureKit,DesktopCaptureKit,WebRTCPipeWireCapturer,MediaCapture,ScreenCapture',
      // Use shared session for localStorage/cookies persistence
      session: getSharedSession(),
    },
    title: 'Astra',
  });

  mainWindow.loadURL(getUrlByEnv());
  mainWindow.maximize();
  registerZoomShortcut();

  if (isDev()) {
    // mainWindow.webContents.openDevTools();
  }

  // Ensure window is properly set after content loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindowHasLoaded = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Register with new process naming system
      registerMainUI(mainWindow);
      mainWindowPid = mainWindow.webContents.getOSProcessId();
    }
    try {
      if (mainWindow) {
        mainWindow.maximize();
        if (process.platform === 'darwin') {
          mainWindow.setFullScreen(true);
        }
        injectTokensToWindow(mainWindow);
        addKeyboardListenerUtil(mainWindow);
      }
    } catch (error) {
      console.error('Failed to inject tokens to main window:', error);
    }
  });

  mainWindow.webContents.on('did-start-loading', () => {
    mainWindowHasLoaded = false;
  });
  mainWindow.on('close', () => {
    safeCloseStreamWindow();
    safeClosewhiteboardWindow();
  });

  mainWindow.webContents.on('did-navigate', (event, url) => {
    setCurrentUrl(url);
    createMenu();
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

function getMainWindowPid(): number | null {
  return mainWindowPid;
}

// Export the shared session getter so other windows can use it
export {
  createMainWindow,
  getMainWindow,
  isMainWindowLoaded,
  setMainWindowLoaded,
  injectTokensToWindow,
  getSharedSession,
  getMainWindowPid,
};
