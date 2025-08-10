const { Menu, dialog } = require('electron');
const Store = require('electron-store');
const { ENV, DEFAULT_URL } = require('./config');
const { getMainWindow } = require('./windowManager');
const { reloadMainWindow } = require('./reloadUtils');

const store = new Store();

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Change URL',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            if (ENV === 'stage') {
              dialog
                .showInputBox({
                  title: 'Change URL',
                  message: 'Enter new URL:',
                  default: store.get('customUrl', DEFAULT_URL),
                })
                .then(result => {
                  if (!result.canceled && result.text) {
                    store.set('customUrl', result.text);
                  }
                });
            }
          },
          enabled: ENV === 'stage',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            require('electron').app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            reloadMainWindow();
          },
        },
        { type: 'separator' },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            reloadMainWindow(true);
          },
        },
        { type: 'separator' },
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
              title: 'About Allen UI Console',
              message: 'Allen UI Console Electron App',
              detail: 'Version 1.0.0\nEnvironment: ' + ENV,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
