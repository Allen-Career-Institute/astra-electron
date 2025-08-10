const { getMainWindow } = require('./windowManager');
const { getStreamWindow } = require('./streamWindow');
const { dialog } = require('electron');
const path = require('path');
const { safeCloseStreamWindow } = require('./streamWindow');

const reloadMainWindow = (force = false) => {
  const mainWindow = getMainWindow();
  const streamWindow = getStreamWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (streamWindow && !streamWindow.isDestroyed()) {
      // Show confirmation dialog
      dialog
        .showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['Cancel', 'Reload'],
          defaultId: 1,
          title: 'Confirm Reload',
          message: 'Are you sure you want to reload the main window?',
          detail: 'This will stop the stream window if it is currently open.',
          icon: path.join(__dirname, '../../assets/icon.png'),
        })
        .then(result => {
          if (result.response === 1) {
            // User clicked "Reload"
            // Close stream window before reloading main window
            safeCloseStreamWindow('main-window-reload');

            if (force) {
              mainWindow.webContents.reloadIgnoringCache();
            } else {
              mainWindow.reload();
            }
          }
        })
        .catch(error => {
          console.error('Error showing reload confirmation dialog:', error);
        });
    } else {
      if (force) {
        mainWindow.webContents.reloadIgnoringCache();
      } else {
        mainWindow.reload();
      }
    }
  } else {
    console.log('Main window is destroyed');
  }
};

module.exports = {
  reloadMainWindow,
};
