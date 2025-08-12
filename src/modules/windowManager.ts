import { BrowserWindow } from 'electron';
import path from 'path';
import { ENV, DEFAULT_URL } from './config';

let mainWindow: BrowserWindow | null = null;
let mainWindowHasLoaded: boolean = false;

function injectTokensToWindow(window: BrowserWindow): void {
  if (ENV === 'development') {
    const tokens = JSON.parse(process.env.AUTH_TOKEN || '{}');

    if (tokens) {
      window.webContents.executeJavaScript(`
        (function() {
          try {
            const tokens = ${JSON.stringify(tokens)};
            localStorage.setItem('tokens', JSON.stringify(tokens));
            console.log('Injected tokens object:', tokens);
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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: true,
      preload: path.join(__dirname, '../preload.js'),
      allowRunningInsecureContent: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Allen UI Console',
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

export {
  createMainWindow,
  getMainWindow,
  isMainWindowLoaded,
  setMainWindowLoaded,
  injectTokensToWindow,
};
