import { getMainWindow } from '../modules/windowManager';
import { BrowserWindow, globalShortcut } from 'electron';

const addKeyboardListenerUtil = (window: BrowserWindow) => {
  if (window && !window.isDestroyed()) {
    window.webContents.executeJavaScript(`
            // Initialize external zoom value
            if (typeof window.externalZoom === 'undefined') {
              window.externalZoom = 1;
            }
            
            window.addEventListener('keydown', function (e) {
              if (e.keyCode === 88 && e.metaKey) {
                document.execCommand('cut');
              }
              else if (e.keyCode === 67 && e.metaKey) {
                document.execCommand('copy');
              }
              else if (e.keyCode === 86 && e.metaKey) {
                document.execCommand('paste');
              }
              else if (e.keyCode === 65 && e.metaKey) {
                document.execCommand('selectAll');
              }
              else if (e.keyCode === 90 && e.metaKey) {
                document.execCommand('undo');
              }
              else if (e.keyCode === 89 && e.metaKey) {
                document.execCommand('redo');
              }
            });
        `);
  }
};

const registerZoomShortcut = () => {
  try {
    if (process.platform === 'darwin') {
      // Use Command+= for zoom in (Shift+= gives +)
      globalShortcut.register('Command+=', () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const zoomLevel = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(zoomLevel + 0.25);
        }
      });

      globalShortcut.register('Command+-', () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const zoomLevel = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(zoomLevel - 0.25);
        }
      });
    } else {
      globalShortcut.register('Control+=', () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const zoomLevel = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(zoomLevel + 0.25);
        }
      });

      globalShortcut.register('Control+-', () => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const zoomLevel = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(zoomLevel - 0.25);
        }
      });
    }
  } catch (error) {
    console.error('Failed to register zoom shortcuts:', error);
    // Don't crash the app if shortcuts fail to register
  }
};

export { addKeyboardListenerUtil, registerZoomShortcut };
