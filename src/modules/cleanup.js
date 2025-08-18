const { getMainWindow } = require('./windowManager');
const { getStreamWindow } = require('./streamWindow');
const { getWhiteboardWindow } = require('./whiteboard-window');
const { ENV } = require('./config');

function cleanup() {
  const mainWindow = getMainWindow();
  const streamWindow = getStreamWindow();
  const whiteboardWindow = getWhiteboardWindow();

  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
  }

  if (mainWindow) {
    mainWindow.close();
  }

  if (whiteboardWindow && !whiteboardWindow.isDestroyed()) {
    whiteboardWindow.close();
  }
}

function handleUncaughtException(error) {
  console.error('Uncaught Exception:', error);

  if (ENV === 'development') {
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Uncaught Exception',
      `An uncaught exception occurred: ${error.message}\n\nStack: ${error.stack}`
    );
  }
}

function handleUnhandledRejection(reason, promise) {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);

  if (ENV === 'development') {
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Unhandled Rejection',
      `An unhandled rejection occurred: ${reason}`
    );
  }
}

function setupCleanupHandlers() {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
}

module.exports = {
  cleanup,
  handleUncaughtException,
  handleUnhandledRejection,
  setupCleanupHandlers,
};
