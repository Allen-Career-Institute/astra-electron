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
  removeAllListeners: (channel: string) => {
    const validChannels = ['get-screen-share-config', 'electron-log-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
};
