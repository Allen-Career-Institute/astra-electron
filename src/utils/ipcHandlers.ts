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
import * as os from 'os';

// Storage management types
interface RecordingFolderInfo {
  meetingId: string;
  folderPath: string;
  sizeBytes: number;
  sizeMB: number;
  fileCount: number;
  createdAt: Date;
  modifiedAt: Date;
  ageInDays: number;
}

interface StorageInfo {
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  folderCount: number;
  totalFileCount: number;
  folders: RecordingFolderInfo[];
  recordingsPath: string;
}

// Deletion log types
const DELETION_LOG_FILE = 'deletion-log.json';

interface DeletionLogEntry {
  timestamp: string;
  meetingId: string;
  folderPath: string;
  sizeMB: number;
  sizeBytes: number;
  fileCount?: number;
  ageInDays: number;
  reason: 'age_limit' | 'size_limit' | 'manual' | 'manual_all';
  deletedBy: 'cleanup_task' | 'user_request';
}

interface DeletionLog {
  lastUpdated: string;
  totalDeleted: number;
  totalFreedMB: number;
  entries: DeletionLogEntry[];
}

// Helper function to calculate directory size recursively
function getDirectorySize(dirPath: string): {
  sizeBytes: number;
  fileCount: number;
} {
  let totalSize = 0;
  let fileCount = 0;

  try {
    if (!fs.existsSync(dirPath)) {
      return { sizeBytes: 0, fileCount: 0 };
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const subDirInfo = getDirectorySize(itemPath);
        totalSize += subDirInfo.sizeBytes;
        fileCount += subDirInfo.fileCount;
      } else if (item.isFile()) {
        try {
          const stats = fs.statSync(itemPath);
          totalSize += stats.size;
          fileCount++;
        } catch (error) {
          console.warn(`Could not stat file ${itemPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return { sizeBytes: totalSize, fileCount };
}

// Get the recordings directory path (Desktop/astra-recordings)
function getRecordingsBasePath(): string {
  return path.join(app.getPath('userData'), 'recordings');
}

// Helper function to get uploaded meeting IDs from uploaded_lmm.txt
// Returns a Set of entries in format "meetingId:contentId"
function getUploadedMeetingIds(): Set<string> {
  const recordingsDir = getRecordingsBasePath();
  const uploadedLmmFilePath = path.join(recordingsDir, 'uploaded_lmm.txt');
  const uploadedMeetingIds = new Set<string>();

  if (fs.existsSync(uploadedLmmFilePath)) {
    try {
      const content = fs.readFileSync(uploadedLmmFilePath, 'utf-8');
      content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .forEach(entry => {
          uploadedMeetingIds.add(entry);
        });
    } catch (error) {
      console.error('Error reading uploaded_lmm.txt:', error);
    }
  }

  return uploadedMeetingIds;
}

// Helper function to check if a meetingId is uploaded (checks if any entry starts with "meetingId:")
function isMeetingIdUploaded(meetingId: string): boolean {
  const uploadedEntries = getUploadedMeetingIds();
  return Array.from(uploadedEntries).some(entry => entry.startsWith(`${meetingId}:`));
}

// Get the deletion log file path
function getDeletionLogPath(): string {
  const recordingsPath = getRecordingsBasePath();
  // Store log in parent directory (Desktop) so it persists even if recordings folder is deleted
  return path.join(path.dirname(recordingsPath), DELETION_LOG_FILE);
}

// Read the deletion log file
function readDeletionLog(): DeletionLog {
  const logPath = getDeletionLogPath();

  try {
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      return JSON.parse(content) as DeletionLog;
    }
  } catch (error) {
    console.warn(
      '[Storage] Could not read deletion log, creating new one:',
      error
    );
  }

  return {
    lastUpdated: new Date().toISOString(),
    totalDeleted: 0,
    totalFreedMB: 0,
    entries: [],
  };
}

// Write the deletion log file
function writeDeletionLog(log: DeletionLog): void {
  const logPath = getDeletionLogPath();

  try {
    // Ensure parent directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    log.lastUpdated = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`[Storage] Deletion log updated: ${logPath}`);
  } catch (error) {
    console.error('[Storage] Error writing deletion log:', error);
  }
}

// Add an entry to the deletion log
function logDeletion(entry: Omit<DeletionLogEntry, 'timestamp'>): void {
  const log = readDeletionLog();

  const fullEntry: DeletionLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  log.entries.push(fullEntry);
  log.totalDeleted++;
  log.totalFreedMB = parseFloat((log.totalFreedMB + entry.sizeMB).toFixed(2));

  // Keep only last 1000 entries to prevent log file from growing too large
  if (log.entries.length > 1000) {
    log.entries = log.entries.slice(-1000);
  }

  writeDeletionLog(log);
}

// Get storage information for all recordings
function getRecordingsStorageInfo(): StorageInfo {
  const recordingsPath = getRecordingsBasePath();
  const folders: RecordingFolderInfo[] = [];
  let totalSizeBytes = 0;
  let totalFileCount = 0;

  try {
    if (!fs.existsSync(recordingsPath)) {
      return {
        totalSizeBytes: 0,
        totalSizeMB: 0,
        totalSizeGB: 0,
        folderCount: 0,
        totalFileCount: 0,
        folders: [],
        recordingsPath,
      };
    }

    const meetingFolders = fs
      .readdirSync(recordingsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const currentTime = Date.now();

    for (const meetingId of meetingFolders) {
      const folderPath = path.join(recordingsPath, meetingId);

      try {
        const stats = fs.statSync(folderPath);
        const { sizeBytes, fileCount } = getDirectorySize(folderPath);
        const createdAt = stats.birthtime;
        const modifiedAt = stats.mtime;
        const ageInDays =
          (currentTime - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        folders.push({
          meetingId,
          folderPath,
          sizeBytes,
          sizeMB: parseFloat((sizeBytes / (1024 * 1024)).toFixed(2)),
          fileCount,
          createdAt,
          modifiedAt,
          ageInDays: parseFloat(ageInDays.toFixed(2)),
        });

        totalSizeBytes += sizeBytes;
        totalFileCount += fileCount;
      } catch (error) {
        console.warn(`Could not get info for folder ${meetingId}:`, error);
      }
    }

    // Sort folders by age (oldest first) for deletion priority
    folders.sort((a, b) => b.ageInDays - a.ageInDays);
  } catch (error) {
    console.error('Error getting recordings storage info:', error);
  }

  return {
    totalSizeBytes,
    totalSizeMB: parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2)),
    totalSizeGB: parseFloat((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(3)),
    folderCount: folders.length,
    totalFileCount,
    folders,
    recordingsPath,
  };
}

// Delete old recordings to free up space
function cleanupRecordingsBySize(maxSizeGB: number = 5): {
  success: boolean;
  freedBytes: number;
  freedMB: number;
  deletedFolders: string[];
  remainingStorage: StorageInfo;
} {
  const deletedFolders: string[] = [];
  let freedBytes = 0;

  try {
    let storageInfo = getRecordingsStorageInfo();
    const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024; // GB to bytes

    console.log(
      `[Storage Cleanup] Current storage: ${storageInfo.totalSizeGB} GB, Max: ${maxSizeGB} GB`
    );

    // If we're under the limit, no cleanup needed
    if (storageInfo.totalSizeBytes <= maxSizeBytes) {
      console.log(
        '[Storage Cleanup] Storage is within limits, no cleanup needed'
      );
      return {
        success: true,
        freedBytes: 0,
        freedMB: 0,
        deletedFolders: [],
        remainingStorage: storageInfo,
      };
    }

    // Delete oldest folders until we're under the limit
    // Sort by age (oldest first) - folders array is already sorted
    for (const folder of storageInfo.folders) {
      if (storageInfo.totalSizeBytes <= maxSizeBytes) {
        break;
      }

      try {
        console.log(
          `[Storage Cleanup] Deleting old recording: ${folder.meetingId} (${folder.sizeMB} MB, ${folder.ageInDays} days old)`
        );
        fs.rmSync(folder.folderPath, { recursive: true, force: true });

        // Log the deletion
        logDeletion({
          meetingId: folder.meetingId,
          folderPath: folder.folderPath,
          sizeMB: folder.sizeMB,
          sizeBytes: folder.sizeBytes,
          fileCount: folder.fileCount,
          ageInDays: folder.ageInDays,
          reason: 'size_limit',
          deletedBy: 'user_request',
        });

        freedBytes += folder.sizeBytes;
        storageInfo.totalSizeBytes -= folder.sizeBytes;
        deletedFolders.push(folder.meetingId);

        console.log(
          `[Storage Cleanup] Deleted ${folder.meetingId}, freed ${folder.sizeMB} MB`
        );
      } catch (error) {
        console.error(
          `[Storage Cleanup] Error deleting folder ${folder.meetingId}:`,
          error
        );
      }
    }

    // Get updated storage info
    const remainingStorage = getRecordingsStorageInfo();

    console.log(
      `[Storage Cleanup] Cleanup complete. Freed ${(freedBytes / (1024 * 1024)).toFixed(2)} MB across ${deletedFolders.length} folders`
    );

    return {
      success: true,
      freedBytes,
      freedMB: parseFloat((freedBytes / (1024 * 1024)).toFixed(2)),
      deletedFolders,
      remainingStorage,
    };
  } catch (error) {
    console.error('[Storage Cleanup] Error during cleanup:', error);
    return {
      success: false,
      freedBytes,
      freedMB: parseFloat((freedBytes / (1024 * 1024)).toFixed(2)),
      deletedFolders,
      remainingStorage: getRecordingsStorageInfo(),
    };
  }
}

// Delete recordings older than specified days
function cleanupRecordingsByAge(maxAgeDays: number = 2): {
  success: boolean;
  freedBytes: number;
  freedMB: number;
  deletedFolders: string[];
  remainingStorage: StorageInfo;
} {
  const deletedFolders: string[] = [];
  let freedBytes = 0;

  try {
    const storageInfo = getRecordingsStorageInfo();

    console.log(
      `[Storage Cleanup] Cleaning recordings older than ${maxAgeDays} days`
    );

    for (const folder of storageInfo.folders) {
      if (folder.ageInDays > maxAgeDays) {
        try {
          console.log(
            `[Storage Cleanup] Deleting old recording: ${folder.meetingId} (${folder.sizeMB} MB, ${folder.ageInDays} days old)`
          );
          fs.rmSync(folder.folderPath, { recursive: true, force: true });

          // Log the deletion
          logDeletion({
            meetingId: folder.meetingId,
            folderPath: folder.folderPath,
            sizeMB: folder.sizeMB,
            sizeBytes: folder.sizeBytes,
            fileCount: folder.fileCount,
            ageInDays: folder.ageInDays,
            reason: 'age_limit',
            deletedBy: 'user_request',
          });

          freedBytes += folder.sizeBytes;
          deletedFolders.push(folder.meetingId);

          console.log(`[Storage Cleanup] Deleted ${folder.meetingId}`);
        } catch (error) {
          console.error(
            `[Storage Cleanup] Error deleting folder ${folder.meetingId}:`,
            error
          );
        }
      }
    }

    const remainingStorage = getRecordingsStorageInfo();

    console.log(
      `[Storage Cleanup] Age-based cleanup complete. Freed ${(freedBytes / (1024 * 1024)).toFixed(2)} MB across ${deletedFolders.length} folders`
    );

    return {
      success: true,
      freedBytes,
      freedMB: parseFloat((freedBytes / (1024 * 1024)).toFixed(2)),
      deletedFolders,
      remainingStorage,
    };
  } catch (error) {
    console.error('[Storage Cleanup] Error during age-based cleanup:', error);
    return {
      success: false,
      freedBytes,
      freedMB: parseFloat((freedBytes / (1024 * 1024)).toFixed(2)),
      deletedFolders,
      remainingStorage: getRecordingsStorageInfo(),
    };
  }
}

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
import * as Sentry from '@sentry/electron/main';

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
  // Zero-copy media chunk handler using postMessage
  ipcMain.on('media-chunk-data', async (event, message) => {
    try {
      const { meetingId, chunkData, chunkIndex, timestamp, isLastChunk, isScreenShare } =
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
      // Format: timestamp.webm or screenshare_timestamp.webm
      // Timestamp ensures uniqueness and proper ordering
      const chunkFileName = isScreenShare 
        ? `screenshare_${timestamp}.webm`
        : `${timestamp}.webm`;
      const chunkFilePath = path.join(recordingsDir, chunkFileName);

      // Convert ArrayBuffer to Buffer before writing to file system
      const buffer = Buffer.from(chunkData);
      // Write chunk data to file
      fs.writeFileSync(chunkFilePath, buffer);

      // Add chunk to rolling merge manager (for tracking purposes)
      // Use separate tracking key for screen share chunks
      const trackingKey = isScreenShare ? `${meetingId}_screenshare` : meetingId;
      rollingMergeManager.addChunk(trackingKey, chunkFileName);

      // Get current chunk list (use separate key for screen share)
      const chunkList = rollingMergeManager.getChunkList(trackingKey);

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
    } catch (error) {
      console.error('Error processing media chunk:', error);
    }
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
              Sentry.captureException(error);
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
              Sentry.captureException(error);
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
            const {
              meetingId,
              chunkData,
              chunkIndex,
              timestamp,
              isLastChunk,
              doRecording,
              isScreenShare,
            } = message.payload;

            if (!doRecording) {
              return {
                type: 'SUCCESS',
                payload: 'Recording disabled',
              };
            }

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
            // Format: timestamp.webm or screenshare_timestamp.webm
            // Timestamp ensures uniqueness and proper ordering
            const chunkFileName = isScreenShare 
              ? `screenshare_${timestamp}.webm`
              : `${timestamp}.webm`;
            const chunkFilePath = path.join(recordingsDir, chunkFileName);

            // Write chunk data to file
            fs.writeFileSync(chunkFilePath, chunkData);

            // Add chunk to rolling merge manager (for tracking purposes)
            // Use separate tracking key for screen share chunks
            const trackingKey = isScreenShare ? `${meetingId}_screenshare` : meetingId;
            rollingMergeManager.addChunk(trackingKey, chunkFileName);

            // Get current chunk list (use separate key for screen share)
            const chunkList = rollingMergeManager.getChunkList(trackingKey);

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
          let isScreenShareWindowAlreadyExists =
            screenShareWindow && !screenShareWindow.isDestroyed();
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

          if (isScreenShareWindowAlreadyExists) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

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
          try {
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
          } catch (error) {
            Sentry.captureException(error);
          }
          return { type: 'SUCCESS', payload: 'Audio device changed' };
        case 'CHANGE_VIDEO_DEVICE':
          try {
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
          } catch (error) {
            Sentry.captureException(error);
          }
          return { type: 'SUCCESS', payload: 'Video device changed' };
        default:
          return { type: 'ERROR', error: 'Unknown message type' };
      }
    } catch (error) {
      Sentry.captureException(error);
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

  ipcMain.handle('electron-tracks-published', async event => {
    try {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('electron-tracks-published-success');
      }
    } catch (error) {
      Sentry.captureException(error);
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

  ipcMain.handle('get-app-data-path', async event => {
    return app.getPath('userData');
  });

  ipcMain.handle('share-screen-published', async event => {
    const screenShareWindow = getScreenShareWindow();
    if (screenShareWindow && !screenShareWindow.isDestroyed()) {
      screenShareWindow.setSize(600, 338);
    }
  });

  ipcMain.handle('opened-screen-share-window', async event => {
    try {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screen-share-window-opened');
      }
    } catch (error) {
      Sentry.captureException(error);
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
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get list of recording sessions (folder names with creation dates)
  ipcMain.handle('get-recordings', async () => {
    try {
      const recordingsDir = path.join(app.getPath('userData'), 'recordings');
      
      // Create folder if it doesn't exist
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
        return {
          success: true,
          recordings: [],
          recordingsPath: recordingsDir,
          count: 0,
        };
      }
      
      // Get all items in the recordings directory
      const items = fs.readdirSync(recordingsDir, { withFileTypes: true });
      
      // Filter for directories only and get creation dates
      const recordings = items
        .filter(item => item.isDirectory())
        .map(item => {
          const folderPath = path.join(recordingsDir, item.name);
          const stats = fs.statSync(folderPath);
          return {
            id: item.name,
            createdAt: stats.birthtime.getTime(),
          };
        })
        // Sort by createdAt descending (newest first)
        .sort((a, b) => b.createdAt - a.createdAt);
      
      return {
        success: true,
        recordings,
        recordingsPath: recordingsDir,
        count: recordings.length,
      };
    } catch (error) {
      console.error('Error getting recordings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recordings: [],
      };
    }
  });

  // Get list of files inside a recording folder
  ipcMain.handle('get-recording-files', async (event, folderId: string) => {
    try {
      const recordingsDir = path.join(
        app.getPath('userData'),
        'recordings',
        folderId
      );

      if (!fs.existsSync(recordingsDir)) {
        return {
          success: false,
          error: `Recording folder not found: ${folderId}`,
          files: [],
        };
      }

      // Check if this meeting ID is in the uploaded_lmm.txt file
      // Format in file is "meetingId:contentId", so we check if any entry starts with "meetingId:"
      const isUploaded = isMeetingIdUploaded(folderId);

      const items = fs.readdirSync(recordingsDir, { withFileTypes: true });

      const files = items
        .filter(item => item.isFile())
        .map(item => {
          const filePath = path.join(recordingsDir, item.name);
          const stats = fs.statSync(filePath);
          return {
            name: item.name,
            path: filePath,
            size: stats.size,
          };
        });

      return {
        success: true,
        files,
        folderPath: recordingsDir,
        uploaded: isUploaded,
      };
    } catch (error) {
      console.error('Error getting recording files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
      };
    }
  });


  // Mark a recording as uploaded to LMM
  ipcMain.handle('mark-recording-uploaded-lmm', async (event, meetingId: string, contentId: string) => {
    try {
      if (!meetingId) {
        return {
          success: false,
          error: 'Meeting ID is required',
        };
      }

      if (!contentId) {
        return {
          success: false,
          error: 'Content ID is required',
        };
      }

      // Store uploaded_lmm.txt in the recordings directory (not in meeting folder)
      const recordingsDir = path.join(app.getPath('userData'), 'recordings');
      const uploadedLmmFilePath = path.join(recordingsDir, 'uploaded_lmm.txt');

      // Create recordings directory if it doesn't exist
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }

      // Read existing entries from file (format: "meetingId:contentId")
      const uploadedEntries = getUploadedMeetingIds();
      const newEntry = `${meetingId}:${contentId}`;

      // Add the new entry if not already present
      if (!uploadedEntries.has(newEntry)) {
        uploadedEntries.add(newEntry);

        // Write all entries to file (one per line, sorted)
        const content = Array.from(uploadedEntries)
          .sort()
          .join('\n') + '\n';

        fs.writeFileSync(uploadedLmmFilePath, content, 'utf-8');

        console.log(
          `[Upload Tracking] Marked recording ${meetingId} as uploaded to LMM`
        );
      } else {
        console.log(
          `[Upload Tracking] Recording ${meetingId} already marked as uploaded to LMM`
        );
      }

      return {
        success: true,
        message: 'Recording marked uploaded to LMM',
      };
    } catch (error) {
      console.error('Error marking recording as uploaded to LMM:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Upload a file to a presigned S3 URL
  ipcMain.handle(
    'upload-file-to-presigned-url',
    async (event, filePath: string, presignedUrl: string) => {
      try {
        if (!fs.existsSync(filePath)) {
          return {
            success: false,
            error: `File not found: ${filePath}`,
          };
        }

        // Read the file
        const fileBuffer = fs.readFileSync(filePath);

        // Detect content type from file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: { [key: string]: string } = {
          '.webm': 'video/webm',
          '.mp4': 'video/mp4',
          '.mkv': 'video/x-matroska',
          '.mov': 'video/quicktime',
          '.avi': 'video/x-msvideo',
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        // Upload to presigned URL using fetch
        const response = await fetch(presignedUrl, {
          method: 'PUT',
          body: fileBuffer,
          headers: {
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length.toString(),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, errorText);
          return {
            success: false,
            error: `Upload failed: ${response.status} ${response.statusText}`,
          };
        }

        // Extract ETag from S3 response headers
        // S3 returns ETag with quotes, so we remove them
        const etag = response.headers.get('ETag') || response.headers.get('etag');
        const cleanEtag = etag ? etag.replace(/"/g, '') : undefined;

        console.log(
          `[Upload] Successfully uploaded ${filePath} to presigned URL${cleanEtag ? ` (ETag: ${cleanEtag})` : ''}`
        );
        return {
          success: true,
          etag: cleanEtag,
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

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

  ipcMain.handle('delete-recording-file', async (event, meetingId: string) => {
    try {
      const recordingsDir = path.join(
        app.getPath('userData'),
        'recordings',
        meetingId
      );
      if (!fs.existsSync(recordingsDir)) {
        return { success: false, error: 'File not found' };
      }
      fs.rmSync(recordingsDir, { recursive: true, force: true });
      console.log(`[Storage] Deleted recording file: ${meetingId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting recording file:', error);
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

      // Clear rolling merge processes
      rollingMergeManager.cleanup();
      const allWindows = BrowserWindow.getAllWindows();

      // Create logout window for Gmail logout (preserves account for future sign-ins)
      const logoutWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: true,
        webPreferences: {
          webSecurity: false,
          sandbox: false,
          allowRunningInsecureContent: true,
          session: session.fromPartition('persist:shared'),
        },
        closable: false,
      });

      logoutWindow.loadURL('https://accounts.google.com/Logout');

      logoutWindow.focus();
      logoutWindow.show();

      logoutWindow.webContents.on('did-finish-load', async () => {
        logoutWindow.setClosable(true);
        // Close the logout window after a short delay
        setTimeout(async () => {
          if (logoutWindow && !logoutWindow.isDestroyed()) {
            logoutWindow.close();
            setTimeout(() => {
              if (logoutWindow && !logoutWindow.isDestroyed()) {
                logoutWindow.destroy();
              }
            }, 300);
          }

          // // Get all browser windows to clear their data

          // // Clear cookies and storage data for all sessions
          // const sessions = [
          //   session.defaultSession,
          //   session.fromPartition('persist:shared'),
          //   ...allWindows.map(win => win.webContents.session),
          // ];

          // // Clear cookies and storage data for each session
          // for (const sessionInstance of sessions) {
          //   if (sessionInstance) {
          //     try {
          //       // Clear all cookies and storage data
          //       await sessionInstance.clearStorageData({
          //         storages: [
          //           // 'cookies',
          //           // 'localstorage',
          //           // 'websql',
          //           // 'indexdb',
          //           // 'shadercache',
          //           // 'serviceworkers',
          //           // 'cachestorage',
          //         ],
          //       });

          //       // await sessionInstance.clearAuthCache();
          //       // await sessionInstance.clearCache();
          //       // await sessionInstance.clearHostResolverCache();
          //     } catch (error) {
          //       console.error(`Error clearing session:`, error);
          //     }
          //   }
          // }

          // // Reload main window to clear any remaining state
          // const { reloadMainWindow } = await import('../modules/reloadUtils');
          // reloadMainWindow(true);
        }, 2500);
      });

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

  ipcMain.handle('get-desktop-sources', async (event, options) => {
    try {
      await askMediaAccess(['screen']);
      const sources = await desktopCapturer.getSources(options);
      if (sources.length === 0) {
        return [];
      }
      return sources.map(source => ({
        ...source,
        thumbImageDataURL: source.thumbnail.toDataURL(),
        thumbnail: null,
      }));
    } catch (error) {
      return error;
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

  // Log event handler - forwards log events from any renderer to main window
  ipcMain.handle(
    'send-log-event',
    async (event, eventName: string, eventData: any) => {
      try {
        const mainWindow = getMainWindow();
        console.log('Received log event from renderer:', eventName);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            'electron-log-event',
            eventName,
            eventData
          );
          return { success: true };
        } else {
          console.warn(
            'Main window not available to send log event:',
            eventName,
            eventData
          );
          return { success: false, error: 'Main window not available' };
        }
      } catch (error) {
        console.error('Error forwarding log event:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // ========== STORAGE MANAGEMENT HANDLERS ==========

  // Check recordings storage usage
  ipcMain.handle('check-recordings-storage', async () => {
    try {
      const storageInfo = getRecordingsStorageInfo();
      console.log(
        `[Storage Check] Total: ${storageInfo.totalSizeGB} GB across ${storageInfo.folderCount} folders`
      );
      return {
        success: true,
        ...storageInfo,
      };
    } catch (error) {
      console.error('Error checking recordings storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Cleanup recordings by size limit (delete oldest when over limit)
  ipcMain.handle(
    'cleanup-recordings-by-size',
    async (event, maxSizeGB: number = 5) => {
      try {
        console.log(
          `[Storage Cleanup] Starting size-based cleanup with limit: ${maxSizeGB} GB`
        );
        const result = cleanupRecordingsBySize(maxSizeGB);
        return {
          success: result.success,
          freedBytes: result.freedBytes,
          freedMB: result.freedMB,
          deletedFolders: result.deletedFolders,
          deletedCount: result.deletedFolders.length,
          remainingStorage: result.remainingStorage,
        };
      } catch (error) {
        console.error('Error during size-based cleanup:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Cleanup recordings by age (delete recordings older than X days)
  ipcMain.handle(
    'cleanup-recordings-by-age',
    async (event, maxAgeDays: number = 2) => {
      try {
        console.log(
          `[Storage Cleanup] Starting age-based cleanup for recordings older than ${maxAgeDays} days`
        );
        const result = cleanupRecordingsByAge(maxAgeDays);
        return {
          success: result.success,
          freedBytes: result.freedBytes,
          freedMB: result.freedMB,
          deletedFolders: result.deletedFolders,
          deletedCount: result.deletedFolders.length,
          remainingStorage: result.remainingStorage,
        };
      } catch (error) {
        console.error('Error during age-based cleanup:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Delete a specific recording folder
  ipcMain.handle('delete-recording', async (event, meetingId: string) => {
    try {
      const recordingsPath = getRecordingsBasePath();
      const folderPath = path.join(recordingsPath, meetingId);

      if (!fs.existsSync(folderPath)) {
        return {
          success: false,
          error: `Recording folder not found: ${meetingId}`,
        };
      }

      // Get folder info before deletion
      const { sizeBytes, fileCount } = getDirectorySize(folderPath);
      const stats = fs.statSync(folderPath);
      const ageInDays =
        (Date.now() - stats.birthtime.getTime()) / (1000 * 60 * 60 * 24);
      const sizeMB = parseFloat((sizeBytes / (1024 * 1024)).toFixed(2));

      fs.rmSync(folderPath, { recursive: true, force: true });

      // Log the deletion
      logDeletion({
        meetingId,
        folderPath,
        sizeMB,
        sizeBytes,
        fileCount,
        ageInDays: parseFloat(ageInDays.toFixed(2)),
        reason: 'manual',
        deletedBy: 'user_request',
      });

      console.log(`[Storage] Deleted recording: ${meetingId} (${sizeMB} MB)`);

      return {
        success: true,
        deletedMeetingId: meetingId,
        freedBytes: sizeBytes,
        freedMB: sizeMB,
        remainingStorage: getRecordingsStorageInfo(),
      };
    } catch (error) {
      console.error(`Error deleting recording ${meetingId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Delete all recordings
  ipcMain.handle('delete-all-recordings', async () => {
    try {
      const recordingsPath = getRecordingsBasePath();

      if (!fs.existsSync(recordingsPath)) {
        return {
          success: true,
          message: 'No recordings directory exists',
          freedBytes: 0,
          freedMB: 0,
          deletedCount: 0,
        };
      }

      // Get storage info before deletion
      const beforeStorage = getRecordingsStorageInfo();

      // Log each folder deletion before deleting
      for (const folder of beforeStorage.folders) {
        logDeletion({
          meetingId: folder.meetingId,
          folderPath: folder.folderPath,
          sizeMB: folder.sizeMB,
          sizeBytes: folder.sizeBytes,
          fileCount: folder.fileCount,
          ageInDays: folder.ageInDays,
          reason: 'manual_all',
          deletedBy: 'user_request',
        });
      }

      // Delete entire recordings directory
      fs.rmSync(recordingsPath, { recursive: true, force: true });

      console.log(
        `[Storage] Deleted all recordings: ${beforeStorage.totalSizeMB} MB across ${beforeStorage.folderCount} folders`
      );

      return {
        success: true,
        freedBytes: beforeStorage.totalSizeBytes,
        freedMB: beforeStorage.totalSizeMB,
        freedGB: beforeStorage.totalSizeGB,
        deletedCount: beforeStorage.folderCount,
        deletedFileCount: beforeStorage.totalFileCount,
      };
    } catch (error) {
      console.error('Error deleting all recordings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get recordings folder structure for UI display
  ipcMain.handle('get-recordings-folder-structure', async () => {
    try {
      const recordingsPath = getRecordingsBasePath();

      if (!fs.existsSync(recordingsPath)) {
        return {
          success: true,
          recordingsPath,
          exists: false,
          folders: [],
          totalSize: 0,
          totalSizeMB: 0,
          totalFiles: 0,
        };
      }

      const folders: Array<{
        meetingId: string;
        path: string;
        files: Array<{
          name: string;
          path: string;
          size: number;
          sizeMB: number;
          extension: string;
          createdAt: string;
          modifiedAt: string;
        }>;
        totalSize: number;
        totalSizeMB: number;
        fileCount: number;
        createdAt: string;
        modifiedAt: string;
        ageInDays: number;
      }> = [];

      let totalSize = 0;
      let totalFiles = 0;
      const currentTime = Date.now();

      // Get all meeting folders
      const meetingFolders = fs
        .readdirSync(recordingsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const meetingId of meetingFolders) {
        const folderPath = path.join(recordingsPath, meetingId);

        try {
          const folderStats = fs.statSync(folderPath);
          const ageInDays =
            (currentTime - folderStats.birthtime.getTime()) /
            (1000 * 60 * 60 * 24);

          // Get files in the folder
          const fileEntries = fs
            .readdirSync(folderPath, { withFileTypes: true })
            .filter(dirent => dirent.isFile());

          const files: Array<{
            name: string;
            path: string;
            size: number;
            sizeMB: number;
            extension: string;
            createdAt: string;
            modifiedAt: string;
          }> = [];

          let folderSize = 0;

          for (const fileEntry of fileEntries) {
            const filePath = path.join(folderPath, fileEntry.name);
            try {
              const fileStats = fs.statSync(filePath);
              const extension = path.extname(fileEntry.name).toLowerCase();

              files.push({
                name: fileEntry.name,
                path: filePath,
                size: fileStats.size,
                sizeMB: parseFloat((fileStats.size / (1024 * 1024)).toFixed(2)),
                extension,
                createdAt: fileStats.birthtime.toISOString(),
                modifiedAt: fileStats.mtime.toISOString(),
              });

              folderSize += fileStats.size;
            } catch (error) {
              console.warn(`Could not stat file ${filePath}:`, error);
            }
          }

          // Sort files by name (timestamp-based names will be in order)
          files.sort((a, b) => a.name.localeCompare(b.name));

          folders.push({
            meetingId,
            path: folderPath,
            files,
            totalSize: folderSize,
            totalSizeMB: parseFloat((folderSize / (1024 * 1024)).toFixed(2)),
            fileCount: files.length,
            createdAt: folderStats.birthtime.toISOString(),
            modifiedAt: folderStats.mtime.toISOString(),
            ageInDays: parseFloat(ageInDays.toFixed(2)),
          });

          totalSize += folderSize;
          totalFiles += files.length;
        } catch (error) {
          console.warn(`Could not get info for folder ${meetingId}:`, error);
        }
      }

      // Sort folders by creation date (newest first)
      folders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        success: true,
        recordingsPath,
        exists: true,
        folders,
        folderCount: folders.length,
        totalSize,
        totalSizeMB: parseFloat((totalSize / (1024 * 1024)).toFixed(2)),
        totalSizeGB: parseFloat((totalSize / (1024 * 1024 * 1024)).toFixed(3)),
        totalFiles,
      };
    } catch (error) {
      console.error('Error getting recordings folder structure:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Open a specific file or folder in system file explorer
  ipcMain.handle('open-path-in-explorer', async (event, targetPath: string) => {
    try {
      const { shell } = require('electron');

      console.log('[Open Path] Attempting to open:', targetPath);

      if (!fs.existsSync(targetPath)) {
        console.error('[Open Path] Path does not exist:', targetPath);
        return {
          success: false,
          error: `Path does not exist: ${targetPath}`,
        };
      }

      // Check if it's a directory or file
      const stats = fs.statSync(targetPath);

      if (stats.isDirectory()) {
        // Open the directory directly
        const result = await shell.openPath(targetPath);
        if (result) {
          // openPath returns empty string on success, error message on failure
          console.error('[Open Path] Error opening directory:', result);
          return {
            success: false,
            error: result,
          };
        }
      } else {
        // For files, show in folder (highlights the file)
        shell.showItemInFolder(targetPath);
      }

      console.log('[Open Path] Successfully opened:', targetPath);
      return {
        success: true,
        message: 'Opened in file explorer',
      };
    } catch (error) {
      console.error('Error opening path in explorer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get the deletion log
  ipcMain.handle('get-deletion-log', async () => {
    try {
      const log = readDeletionLog();
      return {
        success: true,
        ...log,
        logPath: getDeletionLogPath(),
      };
    } catch (error) {
      console.error('Error getting deletion log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Clear the deletion log
  ipcMain.handle('clear-deletion-log', async () => {
    try {
      const logPath = getDeletionLogPath();

      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }

      console.log('[Storage] Deletion log cleared');

      return {
        success: true,
        message: 'Deletion log cleared',
      };
    } catch (error) {
      console.error('Error clearing deletion log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
