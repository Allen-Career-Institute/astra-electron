import { BrowserWindow, dialog, screen, ipcMain } from 'electron';
import path from 'path';
import { spawn, SpawnOptions } from 'child_process';
import fs from 'fs';
import { DEFAULT_URL, ENV, RECORDING_CONFIG } from './config';
import { getMainWindow } from './windowManager';
import {
  StreamWindowConfig,
  RecordingConfig,
  RecordingProcess,
  RecordingMessage,
  RecordingChunk,
  RecordingStatus,
} from '../types/electron';

let streamWindow: BrowserWindow | null = null;
let streamWindowConfig: StreamWindowConfig | null = null;
let streamWindowSettingUp: boolean = false;
let recordingProcesses: Map<string, RecordingProcess> = new Map(); // Track recording processes by meetingId
let recordingConfig: Map<string, RecordingConfig> = new Map(); // Track recording configuration by meetingId

// Recording configuration defaults with better memory optimization - FINAL WATCH TEST
const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  ...RECORDING_CONFIG, // Use config from config module
  // Override with any specific defaults
  enabled: true,
  chunkDuration: 30000, // 30 seconds per chunk
  maxChunks: 50, // Reduced from 100 for better memory management
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '1500k', // Reduced for better performance
  audioBitrate: '96k', // Reduced for better performance
  fps: 25, // Reduced from 30 for better performance
  resolution: '1280x720', // Reduced from 1920x1080 for better performance
  preset: 'ultrafast',
  tune: 'zerolatency',
  memoryLimit: 500, // MB limit for memory monitoring
  autoRestart: true, // Enable auto-restart on crash
  maxRestartAttempts: 3, // Maximum restart attempts
  restartDelay: 2000, // Delay before restart in ms
};

// Force close stream window (for admin/emergency use)
function forceCloseStreamWindow(): boolean {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      // Set force close flag
      if (streamWindowConfig) {
        streamWindowConfig.forceClose = true;
      }

      // Stop all recording processes
      for (const [meetingId, process] of recordingProcesses.entries()) {
        stopRecording(meetingId);
      }

      // Close the window
      streamWindow.close();

      setTimeout(() => {
        if (streamWindow && !streamWindow.isDestroyed()) {
          try {
            streamWindow.destroy();
          } catch (destroyError) {
            console.error('Error destroying stream window:', destroyError);
          }
        }

        streamWindow = null;
        streamWindowSettingUp = false;
        streamWindowConfig = null;
      }, 100);

      return true;
    }
    return false;
  } catch (error) {
    console.error('Error force closing stream window:', error);
    return false;
  }
}

// Enhanced cleanup function
function cleanupStreamWindowResources(): void {
  try {
    if (
      streamWindow &&
      !streamWindow.isDestroyed() &&
      streamWindow.webContents
    ) {
      try {
        streamWindow.webContents.send('cleanup-resources');
      } catch (error) {
        console.log(
          'Could not send cleanup signal to stream window:',
          (error as Error).message
        );
      }
    }

    // Stop all recording processes gracefully
    for (const [meetingId, process] of recordingProcesses.entries()) {
      try {
        stopRecording(meetingId);
      } catch (error) {
        console.error(`Error stopping recording for ${meetingId}:`, error);
      }
    }

    // Clear all maps
    recordingProcesses.clear();
    recordingConfig.clear();

    console.log('Stream window resources cleaned up successfully');
  } catch (error) {
    console.error('Error during stream window cleanup:', error);
  }
}

// Recording management functions
function startRecording(
  meetingId: string,
  config: Partial<RecordingConfig> = {}
): boolean {
  try {
    if (recordingProcesses.has(meetingId)) {
      console.log(`Recording already in progress for meeting: ${meetingId}`);
      return false;
    }

    const recordingSettings: RecordingConfig = {
      ...DEFAULT_RECORDING_CONFIG,
      ...config,
    };
    const recordingsDir: string = path.join(
      process.cwd(),
      'recordings',
      meetingId
    );

    // Create recordings directory
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    // Create chunk directory
    const chunksDir: string = path.join(recordingsDir, 'chunks');
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Create metadata file for tracking chunks
    const metadataPath: string = path.join(recordingsDir, 'metadata.json');
    const metadata = {
      meetingId,
      startTime: Date.now(),
      chunks: [],
      status: 'recording',
      config: recordingSettings,
      restartAttempts: 0,
      lastRestart: null,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Start recording process
    const recordingProcess = spawn(
      'node',
      [
        path.join(__dirname, 'recordingWorker.js'),
        meetingId,
        JSON.stringify(recordingSettings),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      }
    );

    // Handle process events
    recordingProcess.on('error', (error: Error) => {
      console.error(`Recording process error for ${meetingId}:`, error);
      if (recordingSettings.autoRestart) {
        restartRecording(meetingId);
      }
    });

    recordingProcess.on(
      'exit',
      (code: number | null, signal: string | null) => {
        console.log(`Recording process exited for ${meetingId}:`, {
          code,
          signal,
        });
        if (code !== 0 && recordingSettings.autoRestart) {
          restartRecording(meetingId);
        }
      }
    );

    recordingProcess.on('message', (message: any) => {
      handleRecordingMessage(meetingId, message);
    });

    // Store process reference with restart tracking
    recordingProcesses.set(meetingId, {
      process: recordingProcess,
      startTime: Date.now(),
      chunks: [],
      config: recordingSettings,
      restartAttempts: 0,
      lastRestart: null,
      status: 'recording',
    });

    recordingConfig.set(meetingId, recordingSettings);

    console.log(
      `Started recording for meeting: ${meetingId} with PID: ${recordingProcess.pid}`
    );
    return true;
  } catch (error) {
    console.error(`Error starting recording for ${meetingId}:`, error);
    return false;
  }
}

function stopRecording(meetingId: string): boolean {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (!recordingData) {
      return false;
    }

    // Stop the recording process
    if (recordingData.process && !recordingData.process.killed) {
      recordingData.process.kill('SIGTERM');

      // Force kill if it doesn't stop gracefully
      setTimeout(() => {
        if (recordingData.process && !recordingData.process.killed) {
          recordingData.process.kill('SIGKILL');
        }
      }, 5000);
    }

    // Update status
    recordingData.status = 'stopped';

    // Remove from tracking
    recordingProcesses.delete(meetingId);
    recordingConfig.delete(meetingId);

    console.log(`Stopped recording for meeting: ${meetingId}`);
    return true;
  } catch (error) {
    console.error(`Error stopping recording for ${meetingId}:`, error);
    return false;
  }
}

function restartRecording(meetingId: string): boolean {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (!recordingData) {
      console.log(`No recording found for meeting: ${meetingId}`);
      return false;
    }

    // Check restart attempts
    if (
      recordingData.restartAttempts >=
      (recordingData.config.maxRestartAttempts || 3)
    ) {
      console.log(`Max restart attempts reached for meeting: ${meetingId}`);
      return false;
    }

    console.log(`Restarting recording for meeting: ${meetingId}`);

    // Stop current recording
    stopRecording(meetingId);

    // Wait before restarting
    setTimeout(() => {
      startRecording(meetingId, recordingData.config);
    }, recordingData.config.restartDelay || 2000);

    return true;
  } catch (error) {
    console.error(`Error restarting recording for ${meetingId}:`, error);
    return false;
  }
}

function handleRecordingMessage(
  meetingId: string,
  message: RecordingMessage
): void {
  try {
    switch (message.type) {
      case 'start':
        console.log(`Recording started for meeting: ${meetingId}`);
        break;
      case 'stop':
        console.log(`Recording stopped for meeting: ${meetingId}`);
        break;
      case 'chunk':
        if (message.data) {
          updateMetadataChunks(meetingId, message.data);
        }
        break;
      case 'error':
        console.error(
          `Recording error for meeting ${meetingId}:`,
          message.error
        );
        break;
      case 'status':
        if (message.data) {
          updateMetadataStatus(meetingId, message.data);
        }
        break;
      default:
        console.log(`Unknown recording message type: ${message.type}`);
    }
  } catch (error) {
    console.error(`Error handling recording message for ${meetingId}:`, error);
  }
}

function updateMetadataChunks(meetingId: string, chunk: RecordingChunk): void {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (recordingData) {
      recordingData.chunks.push(chunk);
    }
  } catch (error) {
    console.error(`Error updating metadata chunks for ${meetingId}:`, error);
  }
}

function updateMetadataStatus(
  meetingId: string,
  status: Partial<RecordingStatus>
): void {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (recordingData) {
      Object.assign(recordingData, status);
    }
  } catch (error) {
    console.error(`Error updating metadata status for ${meetingId}:`, error);
  }
}

function safeCloseStreamWindow(reason: string = 'unknown'): boolean {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      cleanupStreamWindowResources();

      if (streamWindow.webContents && streamWindow.webContents.isLoading()) {
        let loadTimeout = setTimeout(() => {
          proceedWithClose();
        }, 2000);

        streamWindow.webContents.once('did-finish-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });

        streamWindow.webContents.once('did-fail-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });

        return true;
      } else {
        return proceedWithClose();
      }

      function proceedWithClose(): boolean {
        try {
          streamWindow?.close();

          setTimeout(() => {
            if (streamWindow && !streamWindow.isDestroyed()) {
              try {
                streamWindow.destroy();
              } catch (destroyError) {
                console.error('Error destroying stream window:', destroyError);
              }
            }

            streamWindow = null;
            streamWindowSettingUp = false;
            streamWindowConfig = null;
          }, 100);

          console.log(`Stream window closed safely. Reason: ${reason}`);
          return true;
        } catch (error) {
          console.error('Error during stream window close:', error);
          return false;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error in safeCloseStreamWindow:', error);
    return false;
  }
}

function createStreamWindow(config: StreamWindowConfig): BrowserWindow {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      console.log('Stream window already exists, returning existing window');
      return streamWindow;
    }

    streamWindowSettingUp = true;
    streamWindowConfig = { ...config };

    // Get primary display bounds
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    // Calculate window dimensions and position
    const windowWidth = config.width || 1280;
    const windowHeight = config.height || 720;
    const x = config.x || Math.floor((screenWidth - windowWidth) / 2);
    const y = config.y || Math.floor((screenHeight - windowHeight) / 2);

    // Create the stream window
    streamWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      title: config.title || 'Allen Live Stream',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../stream-preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      closable: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      autoHideMenuBar: true,
      frame: true,
      transparent: false,
      hasShadow: true,
      thickFrame: true,
      titleBarStyle: 'default',
    });

    // Load the stream window content
    // streamWindow.loadFile(path.join(__dirname, '../renderer/recording-window.html'));
    streamWindow.loadURL(streamWindowConfig.url || DEFAULT_URL);

    // Handle window events
    streamWindow.once('ready-to-show', () => {
      if (streamWindow && !streamWindow.isDestroyed()) {
        streamWindow.show();
        streamWindowSettingUp = false;
        console.log('Stream window ready and shown');
      }
    });

    streamWindow.on('closed', () => {
      streamWindow = null;
      streamWindowSettingUp = false;
      streamWindowConfig = null;
      console.log('Stream window closed');
    });

    streamWindow.on('unresponsive', () => {
      console.error('Stream window became unresponsive');
      streamWindowSettingUp = false;
    });

    return streamWindow;
  } catch (error) {
    console.error('Error creating stream window:', error);
    streamWindowSettingUp = false;
    throw error;
  }
}

// Getter functions
function getStreamWindow(): BrowserWindow | null {
  return streamWindow;
}

function getStreamWindowConfig(): StreamWindowConfig | null {
  return streamWindowConfig;
}

function isStreamWindowSettingUp(): boolean {
  return streamWindowSettingUp;
}

// Export all functions
export {
  forceCloseStreamWindow,
  cleanupStreamWindowResources,
  startRecording,
  stopRecording,
  restartRecording,
  handleRecordingMessage,
  updateMetadataChunks,
  updateMetadataStatus,
  safeCloseStreamWindow,
  createStreamWindow,
  getStreamWindow,
  getStreamWindowConfig,
  isStreamWindowSettingUp,
};
