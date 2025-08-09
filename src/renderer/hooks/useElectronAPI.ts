import { useCallback } from 'react';

declare global {
  interface Window {
    electronAPI: {
      // IPC Communication interface
      sendMessage: (message: any) => Promise<any>;

      // Environment and URL management
      getEnvironment: () => Promise<string>;
      getDefaultUrl: () => Promise<string>;

      // Inter-window communication
      sendToMainWindow: (data: any) => Promise<boolean>;

      // Event listeners
      onUrlChanged: (callback: (event: any, newUrl: string) => void) => void;
      onMessageFromMain: (callback: (event: any, data: any) => void) => void;
      onMessageFromOther: (callback: (event: any, data: any) => void) => void;

      // Remove listeners
      removeAllListeners: (channel: string) => void;

      // Video recording
      startRecording: (options: any) => Promise<any>;
      stopRecording: () => Promise<any>;
      getRecordingStatus: () => Promise<any>;

      // File system
      saveVideoFile: (data: any, filename: string) => Promise<any>;
      deleteVideoFile: (filename: string) => Promise<any>;

      // Agora integration
      initializeAgora: (config: any) => Promise<any>;
      joinChannel: (channelName: string, uid: string) => Promise<any>;
      leaveChannel: () => Promise<any>;
      publishStream: (stream: any) => Promise<any>;
      unpublishStream: () => Promise<any>;

      // Audio/Video controls
      muteAudio: (mute: boolean) => Promise<any>;
      muteVideo: (mute: boolean) => Promise<any>;
      stopAudio: () => Promise<any>;
      stopVideo: () => Promise<any>;

      // Window URL management
      getWindowStatus: () => Promise<any>;

      // Event listeners for audio/video controls
      onAudioControl: (callback: (event: any, data: any) => void) => void;
      onVideoControl: (callback: (event: any, data: any) => void) => void;
      onLoadUrl: (callback: (event: any, url: string) => void) => void;
      onLoadAgora: (callback: (event: any, config: any) => void) => void;

      // Recording process APIs
      startVideoRecording: (streamData: any, options: any) => Promise<any>;
      stopVideoRecording: () => Promise<any>;
      startAudioRecording: (streamData: any, options: any) => Promise<any>;
      stopAudioRecording: () => Promise<any>;

      // Recording process event listeners
      onRecordingProcessMessage: (
        callback: (event: any, message: any) => void
      ) => void;

      // Device management APIs
      getDevices: () => Promise<any>;

      // Advanced recording APIs
      initializeDevices: (deviceIds: any) => Promise<any>;
      startAdvancedRecording: (options: any) => Promise<any>;
      pauseRecording: () => Promise<any>;
      resumeRecording: () => Promise<any>;
      toggleMute: () => Promise<any>;
      stopAdvancedRecording: () => Promise<any>;

      // Advanced recording event listeners
      onAdvancedRecordingMessage: (
        callback: (event: any, message: any) => void
      ) => void;

      // Stream window specific APIs
      minimizeStreamWindow: () => Promise<any>;
      closeStreamWindow: () => Promise<any>;
      closeStreamWindowFromMain: () => Promise<any>;

      // Stream window event listeners
      onShowStreamWindow: (callback: (event: any, config: any) => void) => void;
      onHideStreamWindow: (callback: () => void) => void;
      onLoadStreamUrl: (callback: (event: any, url: string) => void) => void;
    };
  }
}

export const useElectronAPI = () => {
  const sendMessage = useCallback(async (message: any): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.sendMessage(message);
    }
    throw new Error('Electron API not available');
  }, []);

  const getEnvironment = useCallback(async (): Promise<string> => {
    if (window.electronAPI) {
      return await window.electronAPI.getEnvironment();
    }
    throw new Error('Electron API not available');
  }, []);

  const getDefaultUrl = useCallback(async (): Promise<string> => {
    if (window.electronAPI) {
      return await window.electronAPI.getDefaultUrl();
    }
    throw new Error('Electron API not available');
  }, []);

  const sendToMainWindow = useCallback(async (data: any): Promise<boolean> => {
    if (window.electronAPI) {
      return await window.electronAPI.sendToMainWindow(data);
    }
    throw new Error('Electron API not available');
  }, []);

  const onUrlChanged = useCallback(
    (callback: (event: any, newUrl: string) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onUrlChanged(callback);
      }
    },
    []
  );

  const onMessageFromMain = useCallback(
    (callback: (event: any, data: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onMessageFromMain(callback);
      }
    },
    []
  );

  const onMessageFromOther = useCallback(
    (callback: (event: any, data: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onMessageFromOther(callback);
      }
    },
    []
  );

  const removeAllListeners = useCallback((channel: string) => {
    if (window.electronAPI) {
      window.electronAPI.removeAllListeners(channel);
    }
  }, []);

  const startRecording = useCallback(async (options: any): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.startRecording(options);
    }
    throw new Error('Electron API not available');
  }, []);

  const stopRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const getRecordingStatus = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.getRecordingStatus();
    }
    throw new Error('Electron API not available');
  }, []);

  const saveVideoFile = useCallback(
    async (data: any, filename: string): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.saveVideoFile(data, filename);
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const deleteVideoFile = useCallback(
    async (filename: string): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.deleteVideoFile(filename);
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const initializeAgora = useCallback(async (config: any): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.initializeAgora(config);
    }
    throw new Error('Electron API not available');
  }, []);

  const joinChannel = useCallback(
    async (channelName: string, uid: string): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.joinChannel(channelName, uid);
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const leaveChannel = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.leaveChannel();
    }
    throw new Error('Electron API not available');
  }, []);

  const publishStream = useCallback(async (stream: any): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.publishStream(stream);
    }
    throw new Error('Electron API not available');
  }, []);

  const unpublishStream = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.unpublishStream();
    }
    throw new Error('Electron API not available');
  }, []);

  const muteAudio = useCallback(async (mute: boolean): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.muteAudio(mute);
    }
    throw new Error('Electron API not available');
  }, []);

  const muteVideo = useCallback(async (mute: boolean): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.muteVideo(mute);
    }
    throw new Error('Electron API not available');
  }, []);

  const stopAudio = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopAudio();
    }
    throw new Error('Electron API not available');
  }, []);

  const stopVideo = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopVideo();
    }
    throw new Error('Electron API not available');
  }, []);

  const getWindowStatus = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.getWindowStatus();
    }
    throw new Error('Electron API not available');
  }, []);

  const onAudioControl = useCallback(
    (callback: (event: any, data: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onAudioControl(callback);
      }
    },
    []
  );

  const onVideoControl = useCallback(
    (callback: (event: any, data: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onVideoControl(callback);
      }
    },
    []
  );

  const onLoadUrl = useCallback(
    (callback: (event: any, url: string) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onLoadUrl(callback);
      }
    },
    []
  );

  const onLoadAgora = useCallback(
    (callback: (event: any, config: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onLoadAgora(callback);
      }
    },
    []
  );

  const onLoadStreamUrl = useCallback(
    (callback: (event: any, url: string) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onLoadStreamUrl(callback);
      }
    },
    []
  );

  const onShowStreamWindow = useCallback(
    (callback: (event: any, config: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onShowStreamWindow(callback);
      }
    },
    []
  );

  const onHideStreamWindow = useCallback((callback: () => void) => {
    if (window.electronAPI) {
      window.electronAPI.onHideStreamWindow(callback);
    }
  }, []);

  const startVideoRecording = useCallback(
    async (streamData: any, options: any): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.startVideoRecording(
          streamData,
          options
        );
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const stopVideoRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopVideoRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const startAudioRecording = useCallback(
    async (streamData: any, options: any): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.startAudioRecording(
          streamData,
          options
        );
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const stopAudioRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopAudioRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const onRecordingProcessMessage = useCallback(
    (callback: (event: any, message: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onRecordingProcessMessage(callback);
      }
    },
    []
  );

  const getDevices = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.getDevices();
    }
    throw new Error('Electron API not available');
  }, []);

  const initializeDevices = useCallback(
    async (deviceIds: any): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.initializeDevices(deviceIds);
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const startAdvancedRecording = useCallback(
    async (options: any): Promise<any> => {
      if (window.electronAPI) {
        return await window.electronAPI.startAdvancedRecording(options);
      }
      throw new Error('Electron API not available');
    },
    []
  );

  const pauseRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.pauseRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const resumeRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.resumeRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const toggleMute = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.toggleMute();
    }
    throw new Error('Electron API not available');
  }, []);

  const stopAdvancedRecording = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.stopAdvancedRecording();
    }
    throw new Error('Electron API not available');
  }, []);

  const onAdvancedRecordingMessage = useCallback(
    (callback: (event: any, message: any) => void) => {
      if (window.electronAPI) {
        window.electronAPI.onAdvancedRecordingMessage(callback);
      }
    },
    []
  );

  const minimizeStreamWindow = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.minimizeStreamWindow();
    }
    throw new Error('Electron API not available');
  }, []);

  const closeStreamWindow = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.closeStreamWindow();
    }
    throw new Error('Electron API not available');
  }, []);

  const closeStreamWindowFromMain = useCallback(async (): Promise<any> => {
    if (window.electronAPI) {
      return await window.electronAPI.closeStreamWindowFromMain();
    }
    throw new Error('Electron API not available');
  }, []);

  return {
    sendMessage,
    getEnvironment,
    getDefaultUrl,
    sendToMainWindow,
    onUrlChanged,
    onMessageFromMain,
    onMessageFromOther,
    removeAllListeners,
    startRecording,
    stopRecording,
    getRecordingStatus,
    saveVideoFile,
    deleteVideoFile,
    initializeAgora,
    joinChannel,
    leaveChannel,
    publishStream,
    unpublishStream,
    muteAudio,
    muteVideo,
    stopAudio,
    stopVideo,
    getWindowStatus,
    onAudioControl,
    onVideoControl,
    onLoadUrl,
    onLoadAgora,
    startVideoRecording,
    stopVideoRecording,
    startAudioRecording,
    stopAudioRecording,
    onRecordingProcessMessage,
    getDevices,
    initializeDevices,
    startAdvancedRecording,
    pauseRecording,
    resumeRecording,
    toggleMute,
    stopAdvancedRecording,
    onAdvancedRecordingMessage,
    minimizeStreamWindow,
    closeStreamWindow,
    closeStreamWindowFromMain,
    onShowStreamWindow,
    onHideStreamWindow,
    onLoadStreamUrl,
  };
};
