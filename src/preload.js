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
  // Screen sharing methods
  getScreenSources: async () => {
    try {
      return await ipcRenderer.invoke('get-screen-sources');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  requestScreenPermission: async () => {
    try {
      return await ipcRenderer.invoke('request-screen-permission');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  startScreenSharing: async sourceId => {
    try {
      return await ipcRenderer.invoke('start-screen-sharing', sourceId);
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  stopScreenSharing: async () => {
    try {
      return await ipcRenderer.invoke('stop-screen-sharing');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  getScreenSharingState: async () => {
    try {
      return await ipcRenderer.invoke('get-screen-sharing-state');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  showDesktopCapturer: async () => {
    try {
      return await ipcRenderer.invoke('show-desktop-capturer');
    } catch (error) {
      return { type: 'ERROR', error: error.message };
    }
  },
  // Remove all listeners
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});
