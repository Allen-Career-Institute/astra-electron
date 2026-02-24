import { contextBridge, ipcRenderer, clipboard, nativeImage } from 'electron';
import { MainElectronAPI } from './types/preload';
import { getAppVersion } from './modules/config';

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
  getAppVersion: () => getAppVersion(),
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
    isLastChunk: boolean = false,
    doRecording?: boolean
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
          doRecording,
        },
      });
    } catch (error) {
      console.error('Error sending media chunk:', error);
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  sendMediaChunkV2: async (
    meetingId: string,
    chunkData: ArrayBuffer,
    chunkIndex: number,
    isLastChunk: boolean = false,
    doRecording?: boolean
  ): Promise<any> => {
    try {
      // Use postMessage for zero-copy transfer of ArrayBuffer
      // Electron's structured clone automatically handles ArrayBuffer transfer efficiently
      const message = {
        type: 'MEDIA_CHUNK_DATA',
        payload: {
          meetingId,
          chunkData, // ArrayBuffer will be transferred efficiently via structured clone
          chunkIndex,
          timestamp: Date.now(),
          isLastChunk,
          doRecording,
        },
      };

      // postMessage uses structured clone which efficiently transfers ArrayBuffers
      ipcRenderer.postMessage('media-chunk-data', message);

      // Return success immediately since postMessage is fire-and-forget
      // The main process will handle the chunk asynchronously
      return {
        type: 'SUCCESS',
        payload: { chunkIndex, isLastChunk },
      };
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
  writeImageToClipboard: async (dataUrl: string): Promise<boolean> => {
    try {
      // Create a native image from the base64 data
      const image = nativeImage.createFromDataURL(dataUrl);

      // Write to clipboard
      clipboard.writeImage(image);

      return true;
    } catch (error) {
      console.error('Failed to write image to clipboard:', error);
      return false;
    }
  },
  getDesktopSources: async (options: any) => {
    try {
      const sources = await ipcRenderer.invoke('get-desktop-sources', options);
      return sources;
    } catch (error) {
      return error;
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
  onElectronTracksPublishedSuccess: (
    callback: (event: any, ...args: any[]) => void
  ): void => {
    ipcRenderer.on('electron-tracks-published-success', callback);
  },

  // ========== STORAGE MANAGEMENT APIs ==========

  // Get list of recording sessions (folder names)
  getRecordings: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('get-recordings');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recordings: [],
      };
    }
  },

  deleteRecordingFile: async (meetingId: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('delete-recording-file', meetingId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Get list of files inside a recording folder
  getRecordingFiles: async (folderId: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('get-recording-files', folderId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
      };
    }
  },

  markRecordingAsUploadedToLMM: async (
    meetingId: string,
    contentId: string
  ): Promise<any> => {
    try {
      return await ipcRenderer.invoke(
        'mark-recording-uploaded-lmm',
        meetingId,
        contentId
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Upload a file to a presigned S3 URL
  uploadFileToPresignedUrl: async (
    filePath: string,
    presignedUrl: string
  ): Promise<any> => {
    try {
      return await ipcRenderer.invoke(
        'upload-file-to-presigned-url',
        filePath,
        presignedUrl
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Check recordings storage usage
  checkRecordingsStorage: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('check-recordings-storage');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Cleanup recordings by size limit (delete oldest when over limit)
  cleanupRecordingsBySize: async (maxSizeGB: number = 5): Promise<any> => {
    try {
      return await ipcRenderer.invoke('cleanup-recordings-by-size', maxSizeGB);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Cleanup recordings by age (delete recordings older than X days)
  cleanupRecordingsByAge: async (maxAgeDays: number = 2): Promise<any> => {
    try {
      return await ipcRenderer.invoke('cleanup-recordings-by-age', maxAgeDays);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Delete a specific recording
  deleteRecording: async (meetingId: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('delete-recording', meetingId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Delete all recordings
  deleteAllRecordings: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('delete-all-recordings');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Get recordings folder structure for UI display
  getRecordingsFolderStructure: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('get-recordings-folder-structure');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Open a path in system file explorer
  openPathInExplorer: async (targetPath: string): Promise<any> => {
    try {
      return await ipcRenderer.invoke('open-path-in-explorer', targetPath);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Get deletion log (history of deleted recordings)
  getDeletionLog: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('get-deletion-log');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Clear deletion log
  clearDeletionLog: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('clear-deletion-log');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
} as MainElectronAPI);

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: MainElectronAPI;
  }
}
