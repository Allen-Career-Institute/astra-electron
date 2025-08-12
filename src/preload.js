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
  // Request stream configuration
  requestStreamConfig: async () => {
    try {
      return await ipcRenderer.invoke('request-stream-config');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  // Stream control event listener
  onStreamControl: callback => {
    ipcRenderer.on('stream-control', callback);
  },
  // Cleanup resources event listener
  onCleanupResources: callback => {
    ipcRenderer.on('cleanup-resources', callback);
  },
  // Remove all listeners
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});
