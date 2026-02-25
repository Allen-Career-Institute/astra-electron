import { ipcRenderer } from 'electron';
import { ScreenShareWindowConfig } from './modules/screenShareWindow';

// Expose functionality directly to the window object since contextIsolation is false
// @ts-ignore
window.screenShareElectronAPI = {
  getAppDataPath: async () => await ipcRenderer.invoke('get-app-data-path'),
  // Screen sharing methods
  getScreenShareConfig: async (): Promise<{
    type: 'SUCCESS' | 'ERROR';
    error?: string;
    payload?: ScreenShareWindowConfig;
  }> => {
    try {
      return await ipcRenderer.invoke('get-screen-share-config');
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  onCleanupResources: (callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on('cleanup-resources', callback);
  },
  closeScreenShareWindow: () => {
    ipcRenderer.invoke('close-screen-share-window');
  },
  shareScreenPublished: () => {
    ipcRenderer.invoke('share-screen-published');
  },
  openedScreenShareWindow: () => {
    ipcRenderer.invoke('opened-screen-share-window');
  },
  // Media chunk recording APIs (for screen share recording)
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
          isScreenShare: true, // Flag to identify screen share chunks
        },
      });
    } catch (error) {
      console.error('Error sending screen share media chunk:', error);
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
      const message = {
        type: 'MEDIA_CHUNK_DATA',
        payload: {
          meetingId,
          chunkData,
          chunkIndex,
          timestamp: Date.now(),
          isLastChunk,
          doRecording,
          isScreenShare: true, // Flag to identify screen share chunks
        },
      };

      // postMessage uses structured clone which efficiently transfers ArrayBuffers
      ipcRenderer.postMessage('media-chunk-data', message);

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
  getDesktopSources: async (options: any) => {
    try {
      return await ipcRenderer.invoke('get-desktop-sources', options);
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      return [];
    }
  },
  removeAllListeners: (channel: string) => {
    const validChannels = ['get-screen-share-config', 'electron-log-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
};
