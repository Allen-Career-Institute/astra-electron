const { contextBridge, ipcRenderer } = require('electron');

// Sentry initialization removed - unused
// const Sentry = require('@sentry/electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Detect if running in Electron environment
  isElectron: true,
  // IPC Communication interface
  sendMessage: async message => {
    try {
      return await ipcRenderer.invoke('sendMessage', message);
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  // Window URL management
  getWindowStatus: () => ipcRenderer.invoke('get-window-status'),
});
