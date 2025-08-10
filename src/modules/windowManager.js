const { BrowserWindow } = require('electron');
const path = require('path');
const { ENV, DEFAULT_URL } = require('./config');

let mainWindow;
let mainWindowHasLoaded = false;

function injectTokensToWindow(window) {
  if (ENV === 'development') {
    const tokens = JSON.parse(process.env.AUTH_TOKEN);

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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      webviewTag: true,
      preload: path.join(__dirname, '../preload.js'),
      allowRunningInsecureContent: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Allen UI Console',
  });

  mainWindow.loadURL(DEFAULT_URL);

  if (ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindowHasLoaded = true;
    try {
      injectTokensToWindow(mainWindow);
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

function getMainWindow() {
  return mainWindow;
}

function isMainWindowLoaded() {
  return mainWindowHasLoaded;
}

function setMainWindowLoaded(loaded) {
  mainWindowHasLoaded = loaded;
}

module.exports = {
  createMainWindow,
  getMainWindow,
  isMainWindowLoaded,
  setMainWindowLoaded,
  injectTokensToWindow,
};
