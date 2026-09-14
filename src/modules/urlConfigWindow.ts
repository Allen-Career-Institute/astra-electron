// Small utility window that lets the app be pointed at a different deployment
// at runtime (Settings → Change App URL). See ./urlOverride for persistence.

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  getCurrentUrl,
  getEnv,
  getEnvUrl,
  getUrlByEnv,
  getUrlOverride,
  isUrlOverrideEnabled,
  setUrlOverride,
} from './config';
import {
  extractPrNumber,
  getPrUrlTemplate,
  getRecentUrls,
  getStoredUrlOverride,
  storeUrlOverride,
} from './urlOverride';
import { URL_OVERRIDE_BUILD_ENABLED } from './buildFlags';
import { getMainWindow } from './windowManager';
import { safeCloseStreamWindow } from './streamWindow';
import { safeClosewhiteboardWindow } from './whiteboard-window';
import { safeCloseScreenShareWindow } from './screenShareWindow';

let urlConfigWindow: BrowserWindow | null = null;

const getUrlConfigHtmlPath = (): string => {
  const appPath = app.isPackaged ? app.getAppPath() : process.cwd();
  const bundled = path.join(appPath, 'dist', 'renderer', 'url-config.html');

  // `yarn dev` compiles with tsc only and never emits renderer assets, so fall
  // back to the source file when the webpack output is not there.
  return fs.existsSync(bundled)
    ? bundled
    : path.join(appPath, 'src', 'renderer', 'url-config.html');
};

const closeUrlConfigWindow = (): void => {
  if (urlConfigWindow && !urlConfigWindow.isDestroyed()) {
    urlConfigWindow.close();
  }
  urlConfigWindow = null;
};

/**
 * Points the main window at `url` and tears down the auxiliary windows, which
 * belong to the previously loaded deployment.
 */
const applyUrl = (url: string): void => {
  safeCloseStreamWindow('app-url-changed');
  safeCloseScreenShareWindow('app-url-changed');
  safeClosewhiteboardWindow('app-url-changed');

  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(url);
    mainWindow.focus();
  }
};

const openUrlConfigWindow = (): void => {
  if (!URL_OVERRIDE_BUILD_ENABLED || !isUrlOverrideEnabled()) {
    return;
  }

  if (urlConfigWindow && !urlConfigWindow.isDestroyed()) {
    urlConfigWindow.focus();
    return;
  }

  const parent = getMainWindow();

  urlConfigWindow = new BrowserWindow({
    width: 620,
    height: 560,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    title: 'Change App URL',
    ...(parent && !parent.isDestroyed() ? { parent, modal: false } : {}),
    webPreferences: {
      // The page is local and app-authored; node access keeps it dependency-free.
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
  });

  urlConfigWindow.loadFile(getUrlConfigHtmlPath());

  urlConfigWindow.on('closed', () => {
    urlConfigWindow = null;
  });
};

const setupUrlConfigHandlers = (): void => {
  // Production builds never register these channels, so there is nothing for a
  // renderer to call into.
  if (!URL_OVERRIDE_BUILD_ENABLED || !isUrlOverrideEnabled()) {
    return;
  }

  ipcMain.handle('url-override:get-state', () => {
    const override = getUrlOverride() || getStoredUrlOverride();
    return {
      env: getEnv(),
      envUrl: getEnvUrl(),
      override,
      prNumber: override ? extractPrNumber(override) : null,
      prUrlTemplate: getPrUrlTemplate(),
      currentUrl: getCurrentUrl() || getUrlByEnv(),
      recents: getRecentUrls(),
    };
  });

  ipcMain.handle('url-override:save', (_event, url: string) => {
    try {
      const stored = storeUrlOverride(url);
      if (!stored) {
        return {
          success: false,
          error: 'Enter a PR number or a URL, or reset to .env.local',
        };
      }

      setUrlOverride(stored);
      closeUrlConfigWindow();
      applyUrl(stored);
      return { success: true, url: stored };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('url-override:reset', () => {
    try {
      storeUrlOverride(null);
      setUrlOverride(null);
      closeUrlConfigWindow();
      applyUrl(getUrlByEnv());
      return { success: true, url: getUrlByEnv() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('url-override:close', () => {
    closeUrlConfigWindow();
    return { success: true };
  });
};

/**
 * Clears the override without opening the window (menu shortcut).
 */
const resetUrlOverride = (): void => {
  if (!URL_OVERRIDE_BUILD_ENABLED || !isUrlOverrideEnabled()) {
    return;
  }

  try {
    storeUrlOverride(null);
    setUrlOverride(null);
    applyUrl(getUrlByEnv());
  } catch (error) {
    dialog.showErrorBox(
      'Reset App URL',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

export {
  closeUrlConfigWindow,
  openUrlConfigWindow,
  resetUrlOverride,
  setupUrlConfigHandlers,
};
