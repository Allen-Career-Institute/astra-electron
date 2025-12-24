import { Menu, dialog, app, BrowserWindow } from 'electron';
import { getAppVersion, getCurrentUrl, getEnv, isDev } from './config';
import { getMainWindow } from './windowManager';
import { reloadMainWindow } from './reloadUtils';
import { safeClosewhiteboardWindow } from './whiteboard-window';
import { safeCloseScreenShareWindow } from './screenShareWindow';
import { safeCloseStreamWindow } from './streamWindow';
import { clearActiveProfileStorage } from '../utils/profileUtils';

/**
 * Opens a Chrome internal URL in a new window
 */
const openChromeInternalUrl = (url: string) => {
  const debugWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    show: true,
    closable: true,
    maximizable: true,
    minimizable: true,
    resizable: true,
    frame: true,
    thickFrame: true,
    hasShadow: true,
    alwaysOnTop: true, // Keep on top of main window
    skipTaskbar: false,
    autoHideMenuBar: true,
    transparent: false,
    titleBarStyle: 'default',
    movable: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
    title: `Debug: ${url}`,
  });

  debugWindow.loadURL(url);
  if (isDev()) {
    debugWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

/**
 * Shows Chrome flags and feature status in a dialog
 */
const showChromeFlagsDialog = () => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Get GPU feature status
    const gpuStatus = app.getGPUFeatureStatus();

    // Get command line switches that are commonly used
    const commandLineSwitches = [
      'enable-features',
      'disable-features',
      'ignore-gpu-blocklist',
      'enable-gpu-service-logging',
      'enable-webgpu-developer-features',
    ];

    // Build flags status message
    let flagsMessage = '\n\n=== Command Line Switches ===\n';
    const hasFlags = commandLineSwitches.map(
      flag => `${flag}: ${app.commandLine.getSwitchValue(flag) || 'enabled'}`
    );

    if (hasFlags.length > 0) {
      flagsMessage += hasFlags.join('\n');
    } else {
      flagsMessage += 'No custom command line switches detected';
    }

    flagsMessage += '\n\n=== GPU Features ===\n';
    flagsMessage += Object.entries(gpuStatus)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Add system info
    flagsMessage += '\n\n=== System Info ===\n';
    flagsMessage += `Chrome Version: ${process.versions.chrome}\n`;
    flagsMessage += `Electron Version: ${process.versions.electron}\n`;
    flagsMessage += `Node Version: ${process.versions.node}\n`;
    flagsMessage += `V8 Version: ${process.versions.v8}`;

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Chrome Flags & Feature Status',
      message: 'Current Chrome Flags and Features',
      detail: flagsMessage,
      buttons: ['OK'],
    });
  }
};

function createMenu(): void {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Go Back',
          accelerator:
            process.platform === 'darwin' ? 'Cmd+[' : 'Alt+Left Arrow',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.goBack();
            }
            safeCloseStreamWindow('LEAVE_MEETING');
            safeClosewhiteboardWindow('LEAVE_MEETING');
            safeCloseScreenShareWindow('LEAVE_MEETING');
          },
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: async () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(isDev()
          ? [
              {
                label: 'Open Process Manager',
                accelerator: 'CmdOrCtrl+Shift+P',
                click: () => {
                  const {
                    openProcessManager,
                  } = require('electron-process-manager');
                  openProcessManager();
                },
              },
              { type: 'separator' as const },
            ]
          : []),
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            reloadMainWindow();
          },
        },
        { type: 'separator' as const },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            reloadMainWindow(true);
          },
        },
        { type: 'separator' as const },
        {
          label: 'Profile Selection',
          accelerator: 'F10',
          click: async () => {
            await clearActiveProfileStorage();
          },
        },
        { type: 'separator' as const },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: 'separator' as const },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
      ],
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Chrome Flags',
          click: () => {
            showChromeFlagsDialog();
          },
        },
        {
          label: 'WebRTC Internals',
          click: () => {
            openChromeInternalUrl('chrome://webrtc-internals');
          },
        },
        {
          label: 'GPU',
          click: () => {
            openChromeInternalUrl('chrome://gpu');
          },
        },
        {
          label: 'Media Internals',
          click: () => {
            openChromeInternalUrl('chrome://media-internals');
          },
        },
        {
          label: 'Process Internals',
          click: () => {
            openChromeInternalUrl('chrome://process-internals');
          },
        },
        ...(isDev()
          ? [
              { type: 'separator' as const },
              {
                label: 'Show GPU Status',
                click: () => {
                  const mainWindow = getMainWindow();
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    const gpuStatus = app.getGPUFeatureStatus();
                    const statusMessage = Object.entries(gpuStatus)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n');

                    dialog.showMessageBox(mainWindow, {
                      type: 'info',
                      title: 'GPU Feature Status',
                      message: 'Current GPU Features Status',
                      detail: statusMessage,
                      buttons: ['OK'],
                    });
                  }
                },
              },
              {
                label: 'Show App Metrics',
                click: () => {
                  const mainWindow = getMainWindow();
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    const metrics = app.getAppMetrics();
                    const metricsMessage = metrics
                      .map(
                        (metric, idx) =>
                          `Process ${idx + 1}:\n` +
                          `  Type: ${metric.type}\n` +
                          `  PID: ${metric.pid}\n` +
                          `  CPU: ${metric.cpu?.percentCPUUsage || 'N/A'}%\n` +
                          `  Memory: ${Math.round((metric.memory?.workingSetSize || 0) / 1024 / 1024)}MB`
                      )
                      .join('\n\n');

                    dialog.showMessageBox(mainWindow, {
                      type: 'info',
                      title: 'App Metrics',
                      message: 'Current Application Metrics',
                      detail: metricsMessage,
                      buttons: ['OK'],
                    });
                  }
                },
              },
            ]
          : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Application',
              message: 'Astra Console',
              detail:
                'Environment: ' +
                getEnv() +
                '\nURL: ' +
                getCurrentUrl() +
                '\nApp Version: ' +
                getAppVersion() +
                '\nAppData Path: ' +
                app.getPath('userData'),
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

export { createMenu };
