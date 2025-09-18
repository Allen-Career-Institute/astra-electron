import {
  IpcMain,
  app,
  BrowserWindow,
  session,
  desktopCapturer,
  systemPreferences,
} from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import {
  getStreamWindow,
  getStreamWindowConfig,
  createStreamWindow,
  safeCloseStreamWindow,
  isStreamWindowSettingUp,
} from '../modules/streamWindow';
import {
  createWhiteboardWindow,
  safeClosewhiteboardWindow,
} from '../modules/whiteboard-window';
import { rollingMergeManager } from '../modules/rollingMergeManager';
import {
  getRollingMergeDisabled,
  isUpdateAvailable,
  setUpdateAvailable,
} from '../modules/config';
import { isChunkLoggingEnabled } from '../modules/user-config';
import { reloadMainWindow } from '../modules/reloadUtils';
import { getAutoUpdater } from '../modules/autoUpdater';
import {
  createScreenShareWindow,
  getScreenShareWindow,
  getScreenShareWindowConfig,
  safeCloseScreenShareWindow,
} from '../modules/screenShareWindow';
import { askMediaAccess } from './permissionUtil';
import { getMainWindow } from '../modules/windowManager';

// Helper function to check if stream window is ready
function isStreamWindowReady(): boolean {
  const streamWindow = getStreamWindow();
  return !!(
    streamWindow &&
    !streamWindow.isDestroyed() &&
    !isStreamWindowSettingUp()
  );
}

// Helper function to wait for stream window to be ready
async function waitForStreamWindowReady(
  maxWaitMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (isStreamWindowReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

// Main IPC Handlers
export function setupIpcHandlers(ipcMain: IpcMain): void {
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
            isAudioEnabled: message.payload.isAudioEnabled,
            isVideoEnabled: message.payload.isVideoEnabled,
            hosts: message.payload.hosts,
            url: message.payload.url,
            configuration: message.payload.configuration,
          };

          createStreamWindow(agoraConfig);
          return { type: 'SUCCESS', payload: 'Stream window created' };

        case 'AUDIO_TOGGLE':
          console.log(
            'Audio toggle request received:',
            message.payload.enabled
          );

          // Wait for stream window to be ready
          const audioWindowReady = await waitForStreamWindowReady();
          if (!audioWindowReady) {
            console.warn(
              'Stream window not ready for audio toggle, request ignored'
            );
            return { type: 'ERROR', error: 'Stream window not ready' };
          }

          const streamWindowForAudio = getStreamWindow();
          if (streamWindowForAudio && !streamWindowForAudio.isDestroyed()) {
            const action = message.payload.enabled
              ? 'unmute-audio'
              : 'mute-audio';
            console.log(
              'Sending audio toggle to stream window:',
              action,
              message.payload.enabled
            );
            try {
              streamWindowForAudio.webContents.send(
                'stream-control',
                action,
                message.payload.enabled
              );
              console.log('Audio toggle sent successfully to stream window');
            } catch (error) {
              console.error(
                'Failed to send audio toggle to stream window:',
                error
              );
              return {
                type: 'ERROR',
                error: 'Failed to send audio toggle to stream window',
              };
            }
          } else {
            console.warn('Stream window not available for audio toggle');
            return { type: 'ERROR', error: 'Stream window not available' };
          }
          return { type: 'SUCCESS', payload: 'Audio toggle sent' };

        case 'VIDEO_TOGGLE':
          console.log(
            'Video toggle request received:',
            message.payload.enabled
          );

          // Wait for stream window to be ready
          const videoWindowReady = await waitForStreamWindowReady();
          if (!videoWindowReady) {
            console.warn(
              'Stream window not ready for video toggle, request ignored'
            );
            return { type: 'ERROR', error: 'Stream window not ready' };
          }

          const streamWindowForVideo = getStreamWindow();
          if (streamWindowForVideo && !streamWindowForVideo.isDestroyed()) {
            const action = message.payload.enabled
              ? 'unmute-video'
              : 'mute-video';
            try {
              streamWindowForVideo.webContents.send('stream-control', action);
              console.log('Video toggle sent successfully to stream window');
            } catch (error) {
              console.error(
                'Failed to send video toggle to stream window:',
                error
              );
              return {
                type: 'ERROR',
                error: 'Failed to send video toggle to stream window',
              };
            }
          } else {
            console.warn('Stream window not available for video toggle');
            return { type: 'ERROR', error: 'Stream window not available' };
          }
          return { type: 'SUCCESS', payload: 'Video toggle sent' };

        case 'LEAVE_MEETING':
          safeCloseStreamWindow('LEAVE_MEETING');
          safeClosewhiteboardWindow('LEAVE_MEETING');
          safeCloseScreenShareWindow('LEAVE_MEETING');

          // Stop FFmpeg process for this meeting
          const meetingId = message.payload?.meetingId;
          if (meetingId) {
            // Stop rolling merge process and cleanup
            rollingMergeManager.cleanupMeeting(meetingId);

            if (isUpdateAvailable()) {
              setTimeout(() => {
                setUpdateAvailable(false);
                getAutoUpdater()?.quitAndInstall();
              }, 5000);
            }
          }

          return {
            type: 'SUCCESS',
            payload: 'Stream window closed and processes stopped',
          };
        case 'OPEN_WHITEBOARD':
          createWhiteboardWindow(message.payload);
          return { type: 'SUCCESS', payload: 'Whiteboard window created' };
        case 'CLOSE_WHITEBOARD':
          safeClosewhiteboardWindow();
          return { type: 'SUCCESS', payload: 'Whiteboard window closed' };
        case 'MEDIA_CHUNK_DATA':
          try {
            const { meetingId, chunkData, chunkIndex, timestamp, isLastChunk } =
              message.payload;

            // Save chunk to file system as webm
            const recordingsDir = path.join(
              app.getPath('userData'),
              'recordings',
              meetingId
            );
            console.log('recordingsDir', recordingsDir);
            // Create recordings directory if it doesn't exist
            if (!fs.existsSync(recordingsDir)) {
              fs.mkdirSync(recordingsDir, { recursive: true });
            }

            // Store chunks as webm files using timestamp for unique naming
            // This prevents conflicts when page is reloaded and chunkIndex resets
            const chunkFileName = `${timestamp}.webm`;
            const chunkFilePath = path.join(recordingsDir, chunkFileName);

            // Write chunk data to file
            fs.writeFileSync(chunkFilePath, chunkData);

            // Add chunk to rolling merge manager (for tracking purposes)
            rollingMergeManager.addChunk(meetingId, chunkFileName);

            // Get current chunk list
            const chunkList = rollingMergeManager.getChunkList(meetingId);

            // Check if rolling merge is disabled
            if (!getRollingMergeDisabled()) {
              // Perform rolling merge when we have multiple chunks
              if (chunkList.length > 1) {
                await rollingMergeManager.performRollingMerge(
                  meetingId,
                  recordingsDir,
                  chunkList
                );
              }

              // Handle final merge when recording stops
              if (isLastChunk && chunkList.length > 0) {
                await rollingMergeManager.performFinalMerge(
                  meetingId,
                  recordingsDir,
                  chunkList
                );
              }
            } else {
              console.log(
                `Rolling merge disabled - keeping ${chunkList.length} chunks as individual files for meeting ${meetingId}`
              );

              // Log chunk details when rolling merge is disabled
              if (isLastChunk && isChunkLoggingEnabled()) {
                console.log(
                  `Recording completed for meeting ${meetingId}. Total chunks saved: ${chunkList.length}`
                );
                console.log(`Chunks saved in: ${recordingsDir}`);
                chunkList.forEach((chunk, index) => {
                  console.log(`  - ${chunk}`);
                });
              }
            }

            console.log(
              `Processed media chunk ${chunkIndex} (timestamp: ${timestamp}) - saved to ${chunkFilePath}`
            );
            return {
              type: 'SUCCESS',
              payload: {
                chunkFilePath,
                chunkIndex,
                merged: chunkList.length > 1,
                isLastChunk,
              },
            };
          } catch (error) {
            console.error('Error processing media chunk:', error);
            return {
              type: 'ERROR',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        case 'START_SCREEN_SHARE':
          const screenShareWindow = getScreenShareWindow();
          if (screenShareWindow && !screenShareWindow.isDestroyed()) {
            await safeCloseScreenShareWindow('START_SCREEN_SHARE');
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Close existing window if any
          if (screenShareWindow && !screenShareWindow.isDestroyed()) {
            console.log(
              'Screen share window already exists, closing existing window'
            );
            await safeCloseScreenShareWindow('recreating');
          }
          while (screenShareWindow && !screenShareWindow.isDestroyed()) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

          const screenShareConfig = {
            ...message.payload,
          };

          try {
            await askMediaAccess(['screen']);
            await createScreenShareWindow(screenShareConfig);
          } catch (error) {
            console.error('Error creating screen share window:', error);
            return {
              type: 'ERROR',
              error: 'Failed to create screen share window',
            };
          }
          return { type: 'SUCCESS', payload: 'Screen share window created' };

        case 'STOP_SCREEN_SHARE':
          await safeCloseScreenShareWindow('STOP_SCREEN_SHARE');
          return { type: 'SUCCESS', payload: 'Screen share window closed' };
        case 'CHANGE_AUDIO_DEVICE':
          const streamWindowForChangeAudioDevice = getStreamWindow();
          if (
            streamWindowForChangeAudioDevice &&
            !streamWindowForChangeAudioDevice.isDestroyed()
          ) {
            streamWindowForChangeAudioDevice.webContents.send(
              'stream-control',
              'change-audio-device',
              message.payload.deviceId
            );
          }
          return { type: 'SUCCESS', payload: 'Audio device changed' };
        case 'CHANGE_VIDEO_DEVICE':
          const streamWindowForChangeVideoDevice = getStreamWindow();
          if (
            streamWindowForChangeVideoDevice &&
            !streamWindowForChangeVideoDevice.isDestroyed()
          ) {
            streamWindowForChangeVideoDevice.webContents.send(
              'stream-control',
              'change-video-device',
              message.payload.deviceId
            );
          }
          return { type: 'SUCCESS', payload: 'Video device changed' };
        default:
          return { type: 'ERROR', error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message from allen-ui-live:', error);
      return {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  });

  ipcMain.handle('get-screen-share-config', async event => {
    try {
      const config = getScreenShareWindowConfig();
      if (config) {
        return {
          type: 'SUCCESS',
          payload: config,
        };
      } else {
        throw new Error('No screen share config available');
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  });

  ipcMain.handle('close-screen-share-window', async event => {
    await safeCloseScreenShareWindow('manual close');
  });

  ipcMain.handle('opened-screen-share-window', async event => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screen-share-window-opened');
    }
  });

  // Stream control handler
  ipcMain.handle('stream-control', async (event, action, deviceId) => {
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
        streamWindow.webContents.send('stream-control', action, deviceId);
      }
      return {
        success: true,
        message: 'Stream control action sent to stream window',
      };
    } catch (error) {
      console.error('Failed to handle stream control:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get recordings directory path
  ipcMain.handle('get-recordings-path', async () => {
    try {
      const recordingsDir = path.join(app.getPath('userData'), 'recordings');
      return {
        success: true,
        recordingsPath: recordingsDir,
        userDataPath: app.getPath('userData'),
      };
    } catch (error) {
      console.error('Failed to get recordings path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // List recordings for a specific meeting
  ipcMain.handle('list-recordings', async (event, meetingId) => {
    try {
      const recordingsDir = path.join(
        app.getPath('userData'),
        'recordings',
        meetingId
      );

      if (!fs.existsSync(recordingsDir)) {
        return {
          success: true,
          recordings: [],
          message: 'No recordings found for this meeting',
        };
      }

      const files = fs.readdirSync(recordingsDir);
      const recordings = files
        .filter(file => file.endsWith('.webm') || file.endsWith('.mpeg'))
        .map(file => {
          const filePath = path.join(recordingsDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            filePath: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            type: file.endsWith('.webm') ? 'webm' : 'mpeg',
          };
        })
        .sort((a, b) => a.fileName.localeCompare(b.fileName));

      // Check for final recording files
      const finalRecordings = recordings.filter(recording =>
        recording.fileName.startsWith('final_recording_')
      );

      const intermediateRecordings = recordings.filter(
        recording => !recording.fileName.startsWith('final_recording_')
      );

      return {
        success: true,
        recordings: intermediateRecordings,
        finalRecordings: finalRecordings,
        meetingId: meetingId,
        totalFiles: intermediateRecordings.length,
        totalFinalRecordings: finalRecordings.length,
      };
    } catch (error) {
      console.error('Failed to list recordings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Open recordings folder in file explorer
  ipcMain.handle('open-recordings-folder', async (event, meetingId) => {
    try {
      const { shell } = require('electron');
      const recordingsDir = path.join(
        app.getPath('userData'),
        'recordings',
        meetingId
      );

      if (!fs.existsSync(recordingsDir)) {
        return {
          success: false,
          error: 'Recordings folder does not exist',
        };
      }

      await shell.openPath(recordingsDir);
      return {
        success: true,
        message: 'Recordings folder opened in file explorer',
      };
    } catch (error) {
      console.error('Failed to open recordings folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Listen for logout events and clear storage
  ipcMain.handle('app-logout', async () => {
    try {
      console.log('Logout request received, clearing all app data...');

      // Get all browser windows to clear their data
      const allWindows = BrowserWindow.getAllWindows();

      // Clear cookies and storage data for all sessions
      const sessions = [
        session.defaultSession,
        session.fromPartition('persist:shared'),
        ...allWindows.map(win => win.webContents.session),
      ];

      // Clear cookies and storage data for each session
      for (const sessionInstance of sessions) {
        if (sessionInstance) {
          try {
            // Clear all cookies and storage data
            await sessionInstance.clearStorageData({
              storages: [
                'cookies',
                'localstorage',
                'websql',
                'indexdb',
                'shadercache',
                'serviceworkers',
                'cachestorage',
              ],
            });

            await sessionInstance.clearAuthCache();
            await sessionInstance.clearCache();
            // await sessionInstance.clearData({
            //   dataTypes: [
            //     'backgroundFetch',
            //     'cache',
            //     'cookies',
            //     'downloads',
            //     'indexedDB',
            //     'localStorage',
            //     'serviceWorkers',
            //     'webSQL',
            //   ],
            // });

            // Clear host resolver cache
            await sessionInstance.clearHostResolverCache();

            console.log(`Cleared storage data for session: default`);
          } catch (error) {
            console.error(`Error clearing session:`, error);
          }
        }
      }

      // Clear rolling merge processes
      rollingMergeManager.cleanup();

      reloadMainWindow(true);

      console.log('Logout completed successfully - all app data cleared');
      return {
        type: 'SUCCESS',
        payload: 'Logout completed - all app data cleared',
      };
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        type: 'ERROR',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during logout',
      };
    }
  });

  ipcMain.handle('get-stream-window-config', () => {
    try {
      const config = getStreamWindowConfig();
      return { success: true, config };
    } catch (error) {
      console.error('Error getting stream window config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // App information handlers
  ipcMain.handle('get-app-version', () => {
    try {
      const version = app.getVersion();
      return { success: true, version };
    } catch (error) {
      console.error('Error getting app version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('get-app-name', () => {
    try {
      const name = app.getName();
      return { success: true, name };
    } catch (error) {
      console.error('Error getting app name:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('get-app-path', () => {
    try {
      const appPath = app.getAppPath();
      return { success: true, appPath };
    } catch (error) {
      console.error('Error getting app path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
