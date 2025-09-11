import { contextBridge, ipcRenderer } from 'electron';
import { ScreenShareElectronAPI } from './types/preload';
import { ScreenShareWindowConfig } from './modules/screenShareWindow';
import { askMediaAccess } from './utils/permissionUtil';
import { agoraScreenShareService } from './renderer/services/agoraScreenShareService';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('screenShareElectronAPI', {
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
  getScreenSourcesForWindow: async (): Promise<any> => {
    try {
      return await ipcRenderer.invoke('get-screen-share-sources');
    } catch (error) {
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  removeAllListeners: (channel: string) => {
    const validChannels = ['get-screen-share-config', 'electron-log-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Agora Screen Share methods - now handled in renderer process
  agoraInitialize: async (config: ScreenShareWindowConfig) => {
    try {
      const result = await askMediaAccess(['microphone', 'camera', 'screen']);
      await agoraScreenShareService.initialize(config);
      return { success: true };
    } catch (error) {
      console.error('Error initializing Agora in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraJoinChannel: async () => {
    try {
      await agoraScreenShareService.joinChannel();
      return { success: true };
    } catch (error) {
      console.error('Error joining channel in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraLeaveChannel: async () => {
    try {
      await agoraScreenShareService.leaveChannel();
      return { success: true };
    } catch (error) {
      console.error('Error leaving channel in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraGetScreenSources: async () => {
    try {
      const sources = await agoraScreenShareService.getScreenSources();
      return { success: true, sources };
    } catch (error) {
      console.error('Error getting screen sources in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraSelectSource: async (sourceId: string, autoSelect = false) => {
    try {
      await agoraScreenShareService.selectScreenSource(sourceId, autoSelect);
      return { success: true };
    } catch (error) {
      console.error('Error selecting source in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraAutoSelectSource: async () => {
    try {
      const sourceId = await agoraScreenShareService.autoSelectScreenSource();
      return { success: true, sourceId };
    } catch (error) {
      console.error('Error auto-selecting source in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraPublish: async () => {
    try {
      await agoraScreenShareService.publishScreenShare();
      return { success: true };
    } catch (error) {
      console.error('Error publishing in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraUnpublish: async () => {
    try {
      await agoraScreenShareService.unpublishScreenShare();
      return { success: true };
    } catch (error) {
      console.error('Error unpublishing in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraGetState: async () => {
    try {
      const state = agoraScreenShareService.getCurrentState();
      return { success: true, state };
    } catch (error) {
      console.error('Error getting state in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraGetStats: async () => {
    try {
      const stats = agoraScreenShareService.getRTCStats();
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting stats in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  agoraCleanup: async () => {
    try {
      await agoraScreenShareService.cleanup();
      return { success: true };
    } catch (error) {
      console.error('Error cleaning up in renderer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    screenShareElectronAPI: ScreenShareElectronAPI;
  }
}
