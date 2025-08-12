// Stream window preload script
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
  });

  console.log('Successfully exposed electronAPI to renderer process');
} catch (error) {
  console.error('Failed to expose electronAPI:', error);
}

// Add error handler for uncaught errors
process.on('uncaughtException', error => {
  console.error('Uncaught exception in preload script:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in preload script:', reason, promise);
});
