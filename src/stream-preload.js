// Stream window preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Request stream config from main process
  requestStreamConfig: () => ipcRenderer.invoke('request-stream-config'),

  // Stream window control (disabled for security)
  // closeStreamWindow: () => ipcRenderer.invoke('close-stream-window'),

  // Send stream control messages to main process
  sendStreamControl: (action, enabled) =>
    ipcRenderer.invoke('stream-control', action, enabled),

  // Event listeners
  onStreamConfig: callback => ipcRenderer.on('stream-config', callback),
  onStreamControl: callback => ipcRenderer.on('stream-control', callback),

  // Remove listeners
  removeAllListeners: channel => ipcRenderer.removeAllListeners(channel),
});

console.log('Stream window preload script loaded');
