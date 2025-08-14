const {
  getStreamWindow,
  getStreamWindowConfig,
  createStreamWindow,
} = require('./streamWindow');
const {
  createWhiteboardWindow,
  safeClosewhiteboardWindow,
} = require('./whiteboard-window');
const { getMainWindow } = require('./windowManager');
const { ENV, DEFAULT_URL } = require('./config');
const screenSharingModule = require('./screenSharing');
const screenSharingManager = screenSharingModule.screenSharingManager;

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
            streamWindowForAudio.webContents.send(
              'stream-control',
              action,
              message.payload.enabled
            );
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
          const whiteboardWindow = getWhiteboardWindow();
          if (whiteboardWindow && !whiteboardWindow.isDestroyed()) {
            whiteboardWindow.close();
          }
          return { type: 'SUCCESS', payload: 'Stream window closed' };

        case 'SCREEN_SHARING_TOGGLE':
          const streamWindowForScreenSharingToggle = getStreamWindow();
          if (
            streamWindowForScreenSharingToggle &&
            !streamWindowForScreenSharingToggle.isDestroyed()
          ) {
            // Focus the stream window when screen sharing is toggled
            streamWindowForScreenSharingToggle.focus();
            streamWindowForScreenSharingToggle.show();

            if (message.payload.enabled) {
              // Start screen sharing - show desktop capturer dialog
              try {
                console.log('About to show desktop capturer dialog');

                if (
                  !screenSharingManager ||
                  typeof screenSharingManager.showDesktopCapturer !== 'function'
                ) {
                  console.error(
                    'screenSharingManager is not properly initialized'
                  );
                  return {
                    type: 'ERROR',
                    error: 'Screen sharing manager not initialized',
                  };
                }

                // Show the desktop capturer dialog
                await screenSharingManager.showDesktopCapturer();
                console.log('Desktop capturer dialog shown');
              } catch (error) {
                console.error('Error showing desktop capturer:', error);
                return {
                  type: 'ERROR',
                  error: 'Failed to show desktop capturer',
                };
              }
            } else {
              // Stop screen sharing
              try {
                await screenSharingManager.stopScreenSharing();
                const action = 'mute-screen-sharing';
                streamWindowForScreenSharingToggle.webContents.send(
                  'stream-control',
                  action,
                  message.payload.enabled
                );
              } catch (error) {
                console.error('Error stopping screen sharing:', error);
                return {
                  type: 'ERROR',
                  error: 'Failed to stop screen sharing',
                };
              }
            }
          }
          return { type: 'SUCCESS', payload: 'Screen sharing toggle sent' };
        case 'OPEN_WHITEBOARD':
          createWhiteboardWindow(message.payload);
          return { type: 'SUCCESS', payload: 'Whiteboard window created' };
        case 'CLOSE_WHITEBOARD':
          safeClosewhiteboardWindow();
          return { type: 'SUCCESS', payload: 'Whiteboard window closed' };
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
        if (
          action === 'unmute-screen-sharing' ||
          action === 'mute-screen-sharing'
        ) {
          streamWindow.focus();
          streamWindow.show();
        }
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
