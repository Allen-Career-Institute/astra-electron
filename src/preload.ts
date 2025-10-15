import { contextBridge, ipcRenderer } from 'electron';
import { MainElectronAPI } from './types/preload';

// Set process name for OS task manager visibility
try {
  if (typeof process !== 'undefined') {
    process.title = 'Astra-Main';
  }
} catch (error) {}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Detect if running in Electron environment
  isElectron: true,
  // IPC Communication interface
  sendMessage: async (message: any): Promise<any> => {
    try {
      return await ipcRenderer.invoke('sendMessage', message);
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  // Request stream configuration
  requestStreamConfig: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('request-stream-config');
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  // Stream control event listener
  onStreamControl: (callback: (event: any, ...args: any[]) => void): void => {
    ipcRenderer.on('stream-control', callback);
  },
  // Cleanup resources event listener
  onCleanupResources: (
    callback: (event: any, ...args: any[]) => void
  ): void => {
    ipcRenderer.on('cleanup-resources', callback);
  },
  sendMediaChunk: async (
    meetingId: string,
    chunkData: any,
    chunkIndex: number,
    isLastChunk: boolean = false
  ): Promise<any> => {
    try {
      return await ipcRenderer.invoke('sendMessage', {
        type: 'MEDIA_CHUNK_DATA',
        payload: {
          meetingId,
          chunkData,
          chunkIndex,
          timestamp: Date.now(),
          isLastChunk,
        },
      });
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  // Remove all listeners
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  },
  // Logout event listener
  logout: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('app-logout');
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  getDesktopSources: async (options: any) => {
    try {
      const sources = await ipcRenderer.invoke('get-desktop-sources', options);
      return sources;
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  // Metrics event listener
  onMetrics: (
    callback: (
      event: any,
      data: {
        metrics: any;
        streamWindowPid: number;
        whiteboardWindowPid: number;
        mainWindowPid: number;
      }
    ) => void
  ): void => {
    ipcRenderer.on('app-metrics', callback);
  },
  onElectronScreenShareWindowClosed: (
    callback: (event: any, ...args: any[]) => void
  ): void => {
    ipcRenderer.on('screen-share-window-closed', callback);
  },
  onElectronScreenShareWindowOpened: (
    callback: (event: any, ...args: any[]) => void
  ): void => {
    ipcRenderer.on('screen-share-window-opened', callback);
  },
  onElectronLogEvent: (
    callback: (event: any, eventName: string, eventData: any) => void
  ): void => {
    ipcRenderer.on('electron-log-event', callback);
  },
} as MainElectronAPI);

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: MainElectronAPI;
  }
}
