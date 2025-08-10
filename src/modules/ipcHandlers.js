const {
  getStreamWindow,
  getStreamWindowConfig,
  createStreamWindow,
} = require('./streamWindow');
const { getMainWindow } = require('./windowManager');
const { ENV, DEFAULT_URL } = require('./config');

// IPC Handlers
function setupIpcHandlers(ipcMain) {
  ipcMain.handle('get-environment', () => {
    return ENV;
  });

  ipcMain.handle('get-default-url', () => {
    return DEFAULT_URL;
  });

  ipcMain.handle('get-window-status', async () => {
    return {
      mainWindow: !!getMainWindow(),
    };
  });

  // Centralized IPC Communication handler for allen-ui-live web app
  ipcMain.handle('sendMessage', async (event, message) => {
    try {
      switch (message.type) {
        case 'CONFIG_UPDATE':
          const streamWindow = getStreamWindow();
          if (streamWindow && !streamWindow.isDestroyed()) {
            streamWindow.close();
          }

          const agoraConfig = {
            appId: message.payload.appId,
            channel: message.payload.channel,
            token: message.payload.token,
            uid: parseInt(message.payload.uid),
            meetingId: message.payload.meetingId,
            deviceIds: message.payload.deviceIds,
            hosts: message.payload.hosts,
            url: message.payload.url,
            configuration: message.payload.configuration,
          };

          createStreamWindow(agoraConfig);
          return { type: 'SUCCESS', payload: 'Stream window created' };

        case 'AUDIO_TOGGLE':
          const streamWindowForAudio = getStreamWindow();
          if (streamWindowForAudio && !streamWindowForAudio.isDestroyed()) {
            const action = message.payload.enabled
              ? 'unmute-audio'
              : 'mute-audio';
            streamWindowForAudio.webContents.send('stream-control', action);
          }
          return { type: 'SUCCESS', payload: 'Audio toggle sent' };

        case 'VIDEO_TOGGLE':
          const streamWindowForVideo = getStreamWindow();
          if (streamWindowForVideo && !streamWindowForVideo.isDestroyed()) {
            const action = message.payload.enabled
              ? 'unmute-video'
              : 'mute-video';
            streamWindowForVideo.webContents.send('stream-control', action);
          }
          return { type: 'SUCCESS', payload: 'Video toggle sent' };

        case 'LEAVE_MEETING':
          const streamWindowForLeave = getStreamWindow();
          if (streamWindowForLeave && !streamWindowForLeave.isDestroyed()) {
            streamWindowForLeave.close();
          }
          return { type: 'SUCCESS', payload: 'Stream window closed' };
        default:
          return { type: 'ERROR', error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message from allen-ui-live:', error);
      return { type: 'ERROR', error: error.message };
    }
  });

  // Request stream config handler
  ipcMain.handle('request-stream-config', async event => {
    try {
      const config = getStreamWindowConfig();
      if (config) {
        return config;
      } else {
        throw new Error('No stream config available');
      }
    } catch (error) {
      throw error;
    }
  });

  // Stream control handler
  ipcMain.handle('stream-control', async (event, action, enabled) => {
    try {
      const streamWindow = getStreamWindow();
      if (streamWindow && !streamWindow.isDestroyed()) {
        streamWindow.webContents.send('stream-control', action, enabled);
      }
      return {
        success: true,
        message: 'Stream control action sent to stream window',
      };
    } catch (error) {
      console.error('Failed to handle stream control:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupIpcHandlers };
