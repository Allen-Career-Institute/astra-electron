import { ipcRenderer } from 'electron';
import {
  ScreenShareWindowConfig,
  safeCloseScreenShareWindow,
} from './modules/screenShareWindow';

// Expose functionality directly to the window object since contextIsolation is false
// @ts-ignore
window.screenShareElectronAPI = {
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
  closeScreenShareWindow: () => {
    ipcRenderer.invoke('close-screen-share-window');
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
