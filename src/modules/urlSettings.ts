// URL Settings Module - Allows runtime URL configuration
// Uses simple file-based storage instead of electron-store (ESM compatibility)
import { dialog, BrowserWindow, app } from 'electron';
import { getMainWindow } from './windowManager';
import * as fs from 'fs';
import * as path from 'path';

interface UrlSettings {
  customUrl: string | null;
  useCustomUrl: boolean;
}

const DEFAULT_SETTINGS: UrlSettings = {
  customUrl: null,
  useCustomUrl: false,
};

// Get the settings file path
const getSettingsPath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'url-settings.json');
};

// Read settings from file
const readSettings = (): UrlSettings => {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error reading URL settings:', error);
  }
  return DEFAULT_SETTINGS;
};

// Write settings to file
const writeSettings = (settings: UrlSettings): void => {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing URL settings:', error);
  }
};

// Get the custom URL if enabled
export const getCustomUrl = (): string | null => {
  const settings = readSettings();
  if (settings.useCustomUrl) {
    return settings.customUrl;
  }
  return null;
};

// Set a custom URL
export const setCustomUrl = (url: string | null): void => {
  const settings = readSettings();
  if (url) {
    settings.customUrl = url;
    settings.useCustomUrl = true;
  } else {
    settings.customUrl = null;
    settings.useCustomUrl = false;
  }
  writeSettings(settings);
};

// Check if custom URL is enabled
export const isCustomUrlEnabled = (): boolean => {
  const settings = readSettings();
  return settings.useCustomUrl;
};

// Clear custom URL and use default
export const clearCustomUrl = (): void => {
  writeSettings(DEFAULT_SETTINGS);
};

// URL Presets
const URL_PRESETS = {
  stage: 'https://console.allen-stage.in/',
  prod: 'https://astra.allen.in/',
  vercelBase:
    'https://allen-ic-stage-ui-live-web-pr-{PR}-allen-frontend-team.vercel.app',
};

// Build Vercel URL from PR number
const buildVercelUrl = (prNumber: string): string => {
  return URL_PRESETS.vercelBase.replace('{PR}', prNumber);
};

// Show Vercel PR input dialog
const showVercelPrInput = async (
  mainWindow: BrowserWindow
): Promise<boolean> => {
  const { ipcMain, Menu } = require('electron');

  const inputWindow = new BrowserWindow({
    width: 500,
    height: 220,
    parent: mainWindow,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Enter Vercel PR Number',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Create Edit menu for clipboard
  const inputMenu = Menu.buildFromTemplate([
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' as const },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo' as const,
        },
        { type: 'separator' as const },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' as const },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' as const },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' as const },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll' as const,
        },
      ],
    },
  ]);
  inputWindow.setMenu(inputMenu);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 24px;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #fff;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        h3 { margin-bottom: 8px; font-size: 16px; color: #a78bfa; }
        label { display: block; margin-bottom: 12px; font-size: 13px; color: #94a3b8; }
        input {
          width: 100%;
          padding: 14px;
          border: 2px solid #4c1d95;
          border-radius: 8px;
          background: #1e1b4b;
          color: #fff;
          font-size: 18px;
          margin-bottom: 12px;
          text-align: center;
          letter-spacing: 2px;
        }
        input:focus { outline: none; border-color: #8b5cf6; }
        .preview {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 16px;
          word-break: break-all;
          padding: 8px;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        .buttons { display: flex; gap: 10px; justify-content: flex-end; }
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        }
        .save { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff; }
        .save:hover { opacity: 0.9; }
        .cancel { background: #374151; color: #fff; }
        .cancel:hover { background: #4b5563; }
      </style>
    </head>
    <body>
      <div>
        <h3>🚀 Vercel PR Preview</h3>
        <label>Enter the PR number to load the Vercel preview:</label>
        <input type="text" id="pr" placeholder="e.g. 905" autofocus />
        <div class="preview" id="preview">URL: https://allen-ic-stage-ui-live-web-pr-<strong>___</strong>-allen-frontend-team.vercel.app</div>
        <div class="buttons">
          <button class="cancel" onclick="cancel()">Cancel</button>
          <button class="save" onclick="save()">Load PR</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        const prInput = document.getElementById('pr');
        const preview = document.getElementById('preview');
        
        prInput.addEventListener('input', (e) => {
          const pr = e.target.value.trim();
          if (pr) {
            preview.innerHTML = 'URL: https://allen-ic-stage-ui-live-web-pr-<strong>' + pr + '</strong>-allen-frontend-team.vercel.app';
          } else {
            preview.innerHTML = 'URL: https://allen-ic-stage-ui-live-web-pr-<strong>___</strong>-allen-frontend-team.vercel.app';
          }
        });
        
        prInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        });
        prInput.focus();
        
        function save() {
          const pr = document.getElementById('pr').value.trim();
          if (pr) {
            ipcRenderer.send('vercel-pr-save', pr);
          }
          window.close();
        }
        function cancel() {
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  inputWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
  );

  return new Promise(resolve => {
    const handler = (_event: any, prNumber: string) => {
      const url = buildVercelUrl(prNumber);
      setCustomUrl(url);
      ipcMain.removeListener('vercel-pr-save', handler);

      // Reload the main window with new URL
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(url);
        }
      }, 100);

      resolve(true);
    };

    ipcMain.on('vercel-pr-save', handler);

    inputWindow.on('closed', () => {
      ipcMain.removeListener('vercel-pr-save', handler);
      resolve(false);
    });
  });
};

// Show URL input dialog using native dialogs
export const showUrlInputDialogNative = async (): Promise<boolean> => {
  const mainWindow = getMainWindow();
  if (!mainWindow) return false;

  const settings = readSettings();
  const currentCustomUrl = settings.customUrl || '';
  const isEnabled = settings.useCustomUrl;

  // First, show options
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'URL Settings',
    message: 'Configure Application URL',
    detail: isEnabled
      ? `Current URL:\n${currentCustomUrl}\n\nSelect an option:`
      : 'Select a URL configuration:',
    buttons: [
      'Stage',
      'Production',
      'Vercel PR',
      'Custom URL',
      'Reset to Default',
      'Cancel',
    ],
    defaultId: 0,
    cancelId: 5,
  });

  if (response === 5) {
    // Cancel
    return false;
  }

  if (response === 0) {
    // Stage
    setCustomUrl(URL_PRESETS.stage);
    mainWindow.loadURL(URL_PRESETS.stage);
    return true;
  }

  if (response === 1) {
    // Production
    setCustomUrl(URL_PRESETS.prod);
    mainWindow.loadURL(URL_PRESETS.prod);
    return true;
  }

  if (response === 2) {
    // Vercel PR - show PR number input
    return await showVercelPrInput(mainWindow);
  }

  if (response === 4) {
    // Reset to default
    clearCustomUrl();

    const { response: reloadResponse } = await dialog.showMessageBox(
      mainWindow,
      {
        type: 'info',
        title: 'URL Reset',
        message: 'URL has been reset to default',
        detail: 'The app will now reload with the default URL from .env.local',
        buttons: ['Reload Now', 'Later'],
        defaultId: 0,
      }
    );

    if (reloadResponse === 0) {
      // Reload the app with default URL
      const { getUrlByEnv } = require('./config');
      mainWindow.loadURL(getUrlByEnv());
    }
    return true;
  }

  // Custom URL (response === 3) - show input window
  const { ipcMain, Menu } = require('electron');

  const inputWindow = new BrowserWindow({
    width: 700,
    height: 200,
    parent: mainWindow,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Enter URL',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Create Edit menu for the input window to enable Copy/Paste
  const inputMenu = Menu.buildFromTemplate([
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' as const },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo' as const,
        },
        { type: 'separator' as const },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' as const },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' as const },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' as const },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll' as const,
        },
      ],
    },
  ]);
  inputWindow.setMenu(inputMenu);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        label { display: block; margin-bottom: 10px; font-size: 14px; color: #a0a0a0; }
        input {
          width: 100%;
          padding: 14px;
          border: 2px solid #3a3a5c;
          border-radius: 8px;
          background: #0f0f23;
          color: #fff;
          font-size: 15px;
          margin-bottom: 16px;
        }
        input:focus { outline: none; border-color: #00d4ff; }
        .buttons { display: flex; gap: 10px; justify-content: flex-end; }
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        }
        .save { background: linear-gradient(135deg, #00d4ff 0%, #0078d4 100%); color: #fff; }
        .save:hover { opacity: 0.9; }
        .cancel { background: #3a3a5c; color: #fff; }
        .cancel:hover { background: #4a4a6c; }
      </style>
    </head>
    <body>
      <div>
        <label>Enter the URL you want to load:</label>
        <input type="text" id="url" placeholder="https://your-url.com" value="${currentCustomUrl}" autofocus />
        <div class="buttons">
          <button class="cancel" onclick="cancel()">Cancel</button>
          <button class="save" onclick="save()">Save & Reload</button>
        </div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        document.getElementById('url').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        });
        document.getElementById('url').focus();
        document.getElementById('url').select();
        
        function save() {
          const url = document.getElementById('url').value.trim();
          if (url) {
            ipcRenderer.send('url-settings-save', url);
          }
          window.close();
        }
        function cancel() {
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  inputWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
  );

  return new Promise(resolve => {
    const handler = (_event: any, url: string) => {
      setCustomUrl(url);
      ipcMain.removeListener('url-settings-save', handler);

      // Reload the main window with new URL
      setTimeout(() => {
        const mainWin = getMainWindow();
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.loadURL(url);
        }
      }, 100);

      resolve(true);
    };

    ipcMain.on('url-settings-save', handler);

    inputWindow.on('closed', () => {
      ipcMain.removeListener('url-settings-save', handler);
      resolve(false);
    });
  });
};

export default {
  getCustomUrl,
  setCustomUrl,
  isCustomUrlEnabled,
  clearCustomUrl,
  showUrlInputDialogNative,
};
