import { Menu, dialog, app } from 'electron';
import { getAppVersion, getCurrentUrl, getEnv, isDev } from './config';
import { getMainWindow } from './windowManager';
import { reloadMainWindow } from './reloadUtils';

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
          },
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
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
                getAppVersion(),
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
