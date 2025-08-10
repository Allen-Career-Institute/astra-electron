const { BrowserWindow, dialog, screen, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { ENV, RECORDING_CONFIG } = require('./config');
const { getMainWindow } = require('./windowManager');

let streamWindow;
let streamWindowConfig = null;
let streamWindowSettingUp = false;
let recordingProcesses = new Map(); // Track recording processes by meetingId
let recordingConfig = new Map(); // Track recording configuration by meetingId

// Recording configuration defaults with better memory optimization
const DEFAULT_RECORDING_CONFIG = {
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
function forceCloseStreamWindow() {
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
function cleanupStreamWindowResources() {
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
          error.message
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

function safeCloseStreamWindow(reason = 'unknown') {
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

      function proceedWithClose() {
        try {
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
        } catch (closeError) {
          console.error('Error during stream window close:', closeError);
          streamWindow = null;
          streamWindowSettingUp = false;
          streamWindowConfig = null;
          return false;
        }
      }
    } else {
      streamWindow = null;
      streamWindowSettingUp = false;
      streamWindowConfig = null;
      return false;
    }
  } catch (error) {
    console.error(
      `Error safely closing stream window (reason: ${reason}):`,
      error
    );
    streamWindow = null;
    streamWindowSettingUp = false;
    streamWindowConfig = null;
    return false;
  }
}

// Recording management functions
function startRecording(meetingId, config = {}) {
  try {
    if (recordingProcesses.has(meetingId)) {
      console.log(`Recording already in progress for meeting: ${meetingId}`);
      return false;
    }

    const recordingSettings = { ...DEFAULT_RECORDING_CONFIG, ...config };
    const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);

    // Create recordings directory
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    // Create chunk directory
    const chunksDir = path.join(recordingsDir, 'chunks');
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Create metadata file for tracking chunks
    const metadataPath = path.join(recordingsDir, 'metadata.json');
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
    recordingProcess.on('error', error => {
      console.error(`Recording process error for ${meetingId}:`, error);
      if (recordingSettings.autoRestart) {
        restartRecording(meetingId);
      }
    });

    recordingProcess.on('exit', (code, signal) => {
      console.log(`Recording process exited for ${meetingId}:`, {
        code,
        signal,
      });
      if (code !== 0 && recordingSettings.autoRestart) {
        restartRecording(meetingId);
      }
    });

    recordingProcess.on('message', message => {
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
      pid: recordingProcess.pid,
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

function stopRecording(meetingId) {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (!recordingData) {
      return false;
    }

    // Kill the recording process
    if (recordingData.process && !recordingData.process.killed) {
      recordingData.process.kill('SIGTERM');

      // Force kill if needed
      setTimeout(() => {
        if (recordingData.process && !recordingData.process.killed) {
          recordingData.process.kill('SIGKILL');
        }
      }, 5000);
    }

    // Start combining process
    startCombiningProcess(meetingId);

    // Clean up
    recordingProcesses.delete(meetingId);
    recordingConfig.delete(meetingId);

    console.log(`Stopped recording for meeting: ${meetingId}`);
    return true;
  } catch (error) {
    console.error(`Error stopping recording for ${meetingId}:`, error);
    return false;
  }
}

function restartRecording(meetingId) {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (!recordingData) {
      console.log(`No recording data found for ${meetingId}, cannot restart`);
      return false;
    }

    const maxAttempts = recordingData.config.maxRestartAttempts || 3;
    const currentAttempts = recordingData.restartAttempts || 0;

    if (currentAttempts >= maxAttempts) {
      console.error(
        `Maximum restart attempts (${maxAttempts}) reached for ${meetingId}`
      );
      updateMetadataStatus(meetingId, 'failed');
      return false;
    }

    console.log(
      `Restarting recording for meeting: ${meetingId} (attempt ${currentAttempts + 1}/${maxAttempts})`
    );

    // Update restart tracking
    recordingData.restartAttempts = currentAttempts + 1;
    recordingData.lastRestart = Date.now();

    // Stop current recording process
    if (recordingData.process && !recordingData.process.killed) {
      recordingData.process.kill('SIGTERM');
    }

    // Wait before restarting
    const restartDelay = recordingData.config.restartDelay || 2000;
    setTimeout(() => {
      try {
        // Check if recording is still needed
        if (recordingProcesses.has(meetingId)) {
          const newProcess = spawn(
            'node',
            [
              path.join(__dirname, 'recordingWorker.js'),
              meetingId,
              JSON.stringify(recordingData.config),
            ],
            {
              stdio: ['pipe', 'pipe', 'pipe'],
              detached: false,
            }
          );

          // Update process reference
          recordingData.process = newProcess;
          recordingData.pid = newProcess.pid;

          // Set up event handlers for new process
          newProcess.on('error', error => {
            console.error(
              `Restarted recording process error for ${meetingId}:`,
              error
            );
            if (recordingData.config.autoRestart) {
              restartRecording(meetingId);
            }
          });

          newProcess.on('exit', (code, signal) => {
            console.log(
              `Restarted recording process exited for ${meetingId}:`,
              { code, signal }
            );
            if (code !== 0 && recordingData.config.autoRestart) {
              restartRecording(meetingId);
            }
          });

          newProcess.on('message', message => {
            handleRecordingMessage(meetingId, message);
          });

          console.log(
            `Successfully restarted recording for ${meetingId} with new PID: ${newProcess.pid}`
          );
        }
      } catch (error) {
        console.error(
          `Error restarting recording process for ${meetingId}:`,
          error
        );
      }
    }, restartDelay);

    return true;
  } catch (error) {
    console.error(`Error restarting recording for ${meetingId}:`, error);
    return false;
  }
}

function startCombiningProcess(meetingId) {
  try {
    const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);
    const metadataPath = path.join(recordingsDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.error(`Metadata not found for ${meetingId}`);
      return;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // Ensure chunks are properly ordered before combining
    if (metadata.chunks && metadata.chunks.length > 0) {
      // Sort chunks by number to ensure correct order
      metadata.chunks.sort((a, b) => a.number - b.number);

      // Update metadata with sorted chunks
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // Start combining process
    const combiningProcess = spawn(
      'node',
      [
        path.join(__dirname, 'combiningWorker.js'),
        meetingId,
        JSON.stringify(metadata),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      }
    );

    combiningProcess.on('error', error => {
      console.error(`Combining process error for ${meetingId}:`, error);
      // Retry combining process on error
      setTimeout(() => {
        if (fs.existsSync(metadataPath)) {
          startCombiningProcess(meetingId);
        }
      }, 5000);
    });

    combiningProcess.on('exit', (code, signal) => {
      console.log(`Combining process completed for ${meetingId}:`, {
        code,
        signal,
      });
      if (code === 0) {
        updateMetadataStatus(meetingId, 'completed');
      } else {
        console.error(`Combining process failed for ${meetingId}, retrying...`);
        // Retry combining process on failure
        setTimeout(() => {
          if (fs.existsSync(metadataPath)) {
            startCombiningProcess(meetingId);
          }
        }, 5000);
      }
    });

    console.log(`Started combining process for meeting: ${meetingId}`);
  } catch (error) {
    console.error(`Error starting combining process for ${meetingId}:`, error);
  }
}

function handleRecordingMessage(meetingId, message) {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    if (!recordingData) return;

    if (message.type === 'chunk_created') {
      // Ensure chunk order is maintained
      const chunk = message.chunk;
      chunk.timestamp = Date.now();
      chunk.sequence = recordingData.chunks.length;

      recordingData.chunks.push(chunk);
      updateMetadataChunks(meetingId, chunk);

      console.log(
        `Chunk ${chunk.number} created for ${meetingId}, total chunks: ${recordingData.chunks.length}`
      );
    } else if (message.type === 'error') {
      console.error(`Recording error for ${meetingId}:`, message.error);
      if (recordingData.config.autoRestart) {
        restartRecording(meetingId);
      }
    } else if (message.type === 'warning') {
      console.warn(`Recording warning for ${meetingId}:`, message.message);
      // Handle memory warnings
      if (message.message.includes('memory')) {
        console.log(`Memory warning for ${meetingId}, monitoring closely...`);
      }
    } else if (message.type === 'ready') {
      console.log(`Recording worker ready for ${meetingId}`);
    }
  } catch (error) {
    console.error(`Error handling recording message for ${meetingId}:`, error);
  }
}

function updateMetadataChunks(meetingId, chunk) {
  try {
    const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);
    const metadataPath = path.join(recordingsDir, 'metadata.json');

    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Add chunk with proper ordering
      metadata.chunks.push(chunk);

      // Sort chunks by number to ensure correct order
      metadata.chunks.sort((a, b) => a.number - b.number);

      // Update chunk count and last update time
      metadata.totalChunks = metadata.chunks.length;
      metadata.lastChunkUpdate = Date.now();

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
  } catch (error) {
    console.error(`Error updating metadata chunks for ${meetingId}:`, error);
  }
}

function updateMetadataStatus(meetingId, status) {
  try {
    const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);
    const metadataPath = path.join(recordingsDir, 'metadata.json');

    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.status = status;
      metadata.endTime = Date.now();
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
  } catch (error) {
    console.error(`Error updating metadata status for ${meetingId}:`, error);
  }
}

function createStreamWindow(config) {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      streamWindow.show();
      // Don't focus stream window - let main window keep focus
      return;
    }

    streamWindowSettingUp = true;

    setTimeout(() => {
      if (streamWindowSettingUp) {
        streamWindowSettingUp = false;
      }
    }, 10000);

    // Get primary display for positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    // Position stream window to open in full screen for debugging
    const streamWindowWidth = screenWidth;
    const streamWindowHeight = screenHeight;
    const streamWindowX = 0;
    const streamWindowY = 0;

    try {
      streamWindow = new BrowserWindow({
        width: streamWindowWidth,
        height: streamWindowHeight,
        x: streamWindowX,
        y: streamWindowY,
        frame: false, // No frame for modern appearance
        resizable: true, // Allow resizing for flexibility
        movable: true, // Allow moving so user can position it
        alwaysOnTop: false, // Don't always stay on top - let main window have focus
        skipTaskbar: false, // Show in taskbar
        parent: null, // No parent for independence
        modal: false,
        focusable: true, // Can be focused but won't steal focus
        minimizable: true, // Can be minimized
        maximizable: true, // Allow maximize for full screen
        fullscreenable: true, // Allow fullscreen toggle
        closable: false, // Cannot be closed by user - persistent window
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          webSecurity: true,
          webviewTag: false,
          preload: path.resolve(__dirname, '../stream-preload.js'),
          enableWebCodecs: true,
          enableWebRTC: true,
          allowRunningInsecureContent: true,
          // Disable reload functionality
          enableWebContents: false,
          // Ensure preload script can access required APIs
          worldSafeExecuteJavaScript: true,
          // Allow preload script to run in main world
          nodeIntegrationInWorker: false,
          // Additional settings for better compatibility
          experimentalFeatures: false,
          // Ensure sandbox is disabled for preload script access
          sandbox: false,
        },
        title: 'Allen Live Stream',
        show: false, // Start hidden
        transparent: false,
        titleBarStyle: 'hidden',
        hasShadow: true,
        thickFrame: false,
        vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
        // Make it a normal window, not a floating panel
        type: 'normal',
      });

      console.log(
        'Stream window created successfully with preload script:',
        path.resolve(__dirname, '../stream-preload.js')
      );
    } catch (windowError) {
      console.error('Error creating stream window:', windowError);
      throw windowError;
    }

    const {
      appId,
      channel,
      token,
      uid,
      hosts,
      meetingId,
      deviceIds,
      url,
      configuration,
    } = config;

    const streamConfig = {
      appId,
      channel,
      token,
      uid,
      meetingId,
      deviceIds,
      url,
      hosts,
      configuration,
    };

    streamWindowConfig = streamConfig;
    const streamUrl = url;

    try {
      console.log('Loading URL in stream window:', streamUrl);
      streamWindow.loadURL(streamUrl);

      // Always open devtools for debugging - not just in development
      streamWindow.webContents.openDevTools();
      console.log('DevTools opened successfully');

      // Maximize the window to open in full screen
      streamWindow.minimize();
      console.log('Stream window maximized to full screen');
    } catch (loadError) {
      console.error('Error loading URL or opening DevTools:', loadError);
      throw loadError;
    }

    // Add error handling for preload script and webContents
    streamWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(
          'Stream window failed to load:',
          errorCode,
          errorDescription,
          validatedURL
        );
      }
    );

    streamWindow.webContents.on(
      'preload-error',
      (event, preloadPath, error) => {
        console.error('Preload script error:', preloadPath, error);
      }
    );

    streamWindow.webContents.on(
      'console-message',
      (event, level, message, line, sourceId) => {
        console.log(
          `Stream window console [${level}]:`,
          message,
          `at ${sourceId}:${line}`
        );
      }
    );

    // Handle stream window events
    streamWindow.on('moved', () => {
      // Allow moving freely in full screen mode
      if (streamWindow && !streamWindow.isDestroyed()) {
        // Don't constrain positioning in full screen mode
        console.log('Stream window moved to:', streamWindow.getBounds());
      }
    });

    // Prevent window from being closed - enhanced protection
    streamWindow.on('close', event => {
      // Prevent closing unless explicitly requested
      if (!streamWindowConfig?.forceClose) {
        event.preventDefault();
        console.log('Stream window close prevented - window is persistent');

        // Minimize the window instead of showing it
        setTimeout(() => {
          if (streamWindow && !streamWindow.isDestroyed()) {
            streamWindow.minimize();
            // Don't focus - let main window keep focus
            streamWindow.setAlwaysOnTop(false);
          }
        }, 100);
        return;
      }
    });

    // Prevent any reload attempts
    streamWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      event.preventDefault();
      console.log('Navigation prevented in stream window:', navigationUrl);
    });

    // Prevent reload via keyboard shortcuts
    streamWindow.webContents.on('before-input-event', (event, input) => {
      // Block Ctrl+R, Cmd+R, F5, Ctrl+Shift+R, Cmd+Shift+R
      if ((input.control || input.meta) && input.key === 'r') {
        event.preventDefault();
        console.log('Reload shortcut blocked in stream window');
        return;
      }
      if (input.key === 'F5') {
        event.preventDefault();
        console.log('F5 reload blocked in stream window');
        return;
      }
      if ((input.control || input.meta) && input.shift && input.key === 'R') {
        event.preventDefault();
        console.log('Force reload shortcut blocked in stream window');
        return;
      }
      // Allow F12 for devtools in debugging mode
      if (input.key === 'F12') {
        // Don't block F12 - allow devtools to open
        console.log('F12 pressed - allowing devtools to open');
        return;
      }
      // Block any other potential reload combinations
      if ((input.control || input.meta) && input.key === 'u') {
        event.preventDefault();
        console.log('View source shortcut blocked in stream window');
        return;
      }
    });

    // Additional shortcut blocking for the stream window
    streamWindow.on('focus', () => {
      // When stream window gains focus, ensure shortcuts are blocked
      streamWindow.webContents.on('before-input-event', (event, input) => {
        // Block reload shortcuts when focused
        if ((input.control || input.meta) && input.key === 'r') {
          event.preventDefault();
          return;
        }
        if (input.key === 'F5') {
          event.preventDefault();
          return;
        }
        if ((input.control || input.meta) && input.shift && input.key === 'R') {
          event.preventDefault();
          return;
        }
      });
    });

    // Prevent any reload attempts via webContents
    streamWindow.webContents.on('will-reload', event => {
      event.preventDefault();
      console.log('Reload prevented in stream window');
    });

    // Prevent any navigation that could lead to reload
    streamWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      event.preventDefault();
      console.log('Navigation prevented in stream window:', navigationUrl);
    });

    // Prevent any redirects
    streamWindow.webContents.on('will-redirect', (event, redirectUrl) => {
      event.preventDefault();
      console.log('Redirect prevented in stream window:', redirectUrl);
    });

    // Additional webContents event blocking for reload prevention
    streamWindow.webContents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      console.log(
        'New window creation blocked in stream window:',
        navigationUrl
      );
    });

    streamWindow.webContents.on('did-finish-load', () => {
      try {
        const { injectTokensToWindow } = require('./windowManager');
        try {
          injectTokensToWindow(streamWindow);
        } catch (error) {
          console.error('Failed to inject tokens to stream window:', error);
        }

        if (streamWindow && !streamWindow.isDestroyed()) {
          // Don't show the window immediately - keep it minimized
          // streamWindow.show(); // Removed - don't show on load

          // Ensure it's always minimized on load
          streamWindow.minimize();
          const mainWindow = getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
          }
          // Don't set always on top - let main window have focus
          streamWindow.setAlwaysOnTop(false);

          // Don't focus the window - let main window keep focus

          // Enforce isolation but allow minimization
          ensureStreamWindowIsolation();
          // Set up periodic isolation check
          // const isolationInterval = setInterval(() => {
          //   if (streamWindow && !streamWindow.isDestroyed()) {
          //     ensureStreamWindowIsolation();
          //   } else {
          //     clearInterval(isolationInterval);
          //   }
          // }, 5000); // Check every 5 seconds

          // Start recording if enabled in configuration
          const recordingEnabled = configuration?.recording?.enabled !== false;
          if (recordingEnabled && meetingId) {
            const recordingConfig = {
              ...DEFAULT_RECORDING_CONFIG,
              ...configuration?.recording,
            };
            startRecording(meetingId, recordingConfig);
          }

          streamWindowSettingUp = false;
        } else {
          streamWindowSettingUp = false;
        }
      } catch (error) {
        console.error('Error in stream window load handler:', error);
        streamWindowSettingUp = false;
      }
    });

    streamWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL) => {
        console.error('Stream window failed to load:', {
          errorCode,
          errorDescription,
          validatedURL,
        });
      }
    );

    streamWindow.webContents.on('crashed', (event, killed) => {
      console.error('Stream window webContents crashed:', { killed });
    });

    streamWindow.on('closed', () => {
      try {
        cleanupStreamWindowResources();
        streamWindow = null;
        streamWindowSettingUp = false;
        streamWindowConfig = null;
      } catch (error) {
        console.error('Error in stream window closed handler:', error);
        streamWindow = null;
        streamWindowSettingUp = false;
        streamWindowConfig = null;
      }
    });

    // Set up main window event listeners for cleanup only
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.on('close', () => {
        try {
          safeCloseStreamWindow('main-window-close');
        } catch (error) {
          console.error(
            'Error closing stream window on main window close:',
            error
          );
        }
      });

      mainWindow.on('minimize', () => {
        try {
          // When main window minimizes, also minimize stream window
          if (streamWindow && !streamWindow.isDestroyed()) {
            streamWindow.minimize();
          }
        } catch (error) {
          console.error('Error handling main window minimize:', error);
        }
      });

      mainWindow.on('restore', () => {
        try {
          // When main window is restored, also restore stream window
          if (streamWindow && !streamWindow.isDestroyed()) {
            streamWindow.restore();
            // Allow free positioning in full screen mode
            console.log('Stream window restored with main window');
            // Don't focus - let main window keep focus
          }
        } catch (error) {
          console.error('Error handling main window restore:', error);
        }
      });

      mainWindow.on('focus', () => {
        try {
          // When main window gains focus, ensure stream window doesn't steal focus
          if (streamWindow && !streamWindow.isDestroyed()) {
            streamWindow.setAlwaysOnTop(false);
            // Don't focus stream window
          }
        } catch (error) {
          console.error('Error handling main window focus:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error in createStreamWindow:', error);

    if (streamWindow && !streamWindow.isDestroyed()) {
      try {
        streamWindow.close();
      } catch (closeError) {
        console.error('Error closing stream window after error:', closeError);
      }
    }
    streamWindow = null;
    streamWindowSettingUp = false;

    if (ENV === 'development') {
      dialog.showErrorBox(
        'Stream Window Error',
        `Failed to create stream window: ${error.message}\n\nStack: ${error.stack}`
      );
    }

    throw error;
  }
}

// IPC handlers for recording control
ipcMain.handle('start-recording', async (event, meetingId, config) => {
  try {
    const recordingConfig = {
      ...DEFAULT_RECORDING_CONFIG,
      ...config,
    };
    return startRecording(meetingId, recordingConfig);
  } catch (error) {
    console.error('Error starting recording via IPC:', error);
    return false;
  }
});

ipcMain.handle('stop-recording', async (event, meetingId) => {
  try {
    return stopRecording(meetingId);
  } catch (error) {
    console.error('Error stopping recording via IPC:', error);
    return false;
  }
});

ipcMain.handle('get-recording-status', async (event, meetingId) => {
  try {
    const recordingData = recordingProcesses.get(meetingId);
    return {
      isRecording: !!recordingData,
      startTime: recordingData?.startTime || null,
      chunks: recordingData?.chunks || [],
      config: recordingData?.config || null,
      restartAttempts: recordingData?.restartAttempts || 0,
      lastRestart: recordingData?.lastRestart || null,
      pid: recordingData?.pid || null,
    };
  } catch (error) {
    console.error('Error getting recording status via IPC:', error);
    return { isRecording: false, error: error.message };
  }
});

ipcMain.handle('get-recording-config', async event => {
  try {
    return {
      ...DEFAULT_RECORDING_CONFIG,
      availableQualities: ['low', 'balanced', 'high'],
    };
  } catch (error) {
    console.error('Error getting recording config via IPC:', error);
    return DEFAULT_RECORDING_CONFIG;
  }
});

ipcMain.handle('update-recording-config', async (event, newConfig) => {
  try {
    // Update the default recording config
    Object.assign(DEFAULT_RECORDING_CONFIG, newConfig);

    // Update existing recording processes with new config
    for (const [meetingId, recordingData] of recordingProcesses.entries()) {
      if (recordingData.config) {
        Object.assign(recordingData.config, newConfig);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating recording config via IPC:', error);
    return false;
  }
});

// Prevent reload attempts from teacher liveclass stream interface
ipcMain.handle('reload-stream-window', async event => {
  console.log('Reload attempt blocked for stream window');
  return { success: false, message: 'Reload is not allowed for stream window' };
});

ipcMain.handle('force-reload-stream-window', async event => {
  console.log('Force reload attempt blocked for stream window');
  return {
    success: false,
    message: 'Force reload is not allowed for stream window',
  };
});

ipcMain.handle('navigate-stream-window', async (event, url) => {
  console.log('Navigation attempt blocked for stream window:', url);
  return {
    success: false,
    message: 'Navigation is not allowed for stream window',
  };
});

// Stream window control functions
ipcMain.handle('show-stream-window', async event => {
  try {
    return showStreamWindow();
  } catch (error) {
    console.error('Error showing stream window via IPC:', error);
    return false;
  }
});

ipcMain.handle('minimize-stream-window', async event => {
  try {
    return minimizeStreamWindow();
  } catch (error) {
    console.error('Error minimizing stream window via IPC:', error);
    return false;
  }
});

ipcMain.handle('force-close-stream-window', async event => {
  try {
    return forceCloseStreamWindow();
  } catch (error) {
    console.error('Error force closing stream window via IPC:', error);
    return false;
  }
});

ipcMain.handle('get-stream-window-info', async event => {
  try {
    return {
      exists: !!(streamWindow && !streamWindow.isDestroyed()),
      isSettingUp: streamWindowSettingUp,
      config: streamWindowConfig,
      recordingProcesses: Array.from(recordingProcesses.keys()),
    };
  } catch (error) {
    console.error('Error getting stream window info via IPC:', error);
    return { exists: false, error: error.message };
  }
});

function getStreamWindow() {
  return streamWindow;
}

function getStreamWindowConfig() {
  return streamWindowConfig;
}

function isStreamWindowSettingUp() {
  return streamWindowSettingUp;
}

// Ensure stream window is completely isolated
function ensureStreamWindowIsolation() {
  if (streamWindow && !streamWindow.isDestroyed()) {
    try {
      // Don't set always on top - let main window have focus
      streamWindow.setAlwaysOnTop(false);

      // Don't focus - let main window keep focus

      // Keep window minimized by default - don't auto-show
      if (!streamWindow.isMinimized() && !streamWindow.isVisible()) {
        // Only minimize if it's not already minimized and not visible
        streamWindow.minimize();
      }

      // Prevent any system-level actions that could close the window
      streamWindow.setClosable(false);
      // Allow minimization
      streamWindow.setMinimizable(true);
      streamWindow.setMaximizable(false);
      streamWindow.setResizable(true);
      streamWindow.setMovable(true);

      // Ensure it's positioned correctly to not cover main window
      ensureProperPositioning();

      console.log(
        'Stream window isolation enforced (keeping minimized by default)'
      );
    } catch (error) {
      console.error('Error enforcing stream window isolation:', error);
    }
  }
}

// Ensure stream window is positioned to not cover main window
function ensureProperPositioning() {
  if (streamWindow && !streamWindow.isDestroyed()) {
    try {
      // In full screen mode, allow free positioning
      const bounds = streamWindow.getBounds();
      console.log('Stream window current position:', bounds);
      // No positioning constraints in full screen mode
    } catch (error) {
      console.error('Error checking stream window position:', error);
    }
  }
}

// Ensure shortcut blocking is maintained in stream window
function ensureShortcutBlocking() {
  if (streamWindow && !streamWindow.isDestroyed() && streamWindow.webContents) {
    try {
      // Re-apply shortcut blocking to ensure it's always active
      streamWindow.webContents.on('before-input-event', (event, input) => {
        // Block reload shortcuts
        if ((input.control || input.meta) && input.key === 'r') {
          event.preventDefault();
          console.log('Reload shortcut blocked in stream window (reapplied)');
          return;
        }
        if (input.key === 'F5') {
          event.preventDefault();
          console.log('F5 reload blocked in stream window (reapplied)');
          return;
        }
        if ((input.control || input.meta) && input.shift && input.key === 'R') {
          event.preventDefault();
          console.log(
            'Force reload shortcut blocked in stream window (reapplied)'
          );
          return;
        }
        // Allow F12 for devtools in debugging mode
        if (input.key === 'F12') {
          // Don't block F12 - allow devtools to open
          console.log('F12 pressed - allowing devtools to open');
          return;
        }
        if ((input.control || input.meta) && input.key === 'u') {
          event.preventDefault();
          console.log(
            'View source shortcut blocked in stream window (reapplied)'
          );
          return;
        }
      });

      console.log('Shortcut blocking reapplied to stream window');
    } catch (error) {
      console.error('Error ensuring shortcut blocking:', error);
    }
  }
}

// Function to explicitly show the stream window when needed
function showStreamWindow() {
  if (streamWindow && !streamWindow.isDestroyed()) {
    try {
      streamWindow.restore();
      streamWindow.show();
      streamWindow.focus();
      console.log('Stream window explicitly shown');
      return true;
    } catch (error) {
      console.error('Error showing stream window:', error);
      return false;
    }
  }
  return false;
}

// Function to minimize the stream window
function minimizeStreamWindow() {
  if (streamWindow && !streamWindow.isDestroyed()) {
    try {
      streamWindow.minimize();
      console.log('Stream window minimized');
      return true;
    } catch (error) {
      console.error('Error minimizing stream window:', error);
      return false;
    }
  }
  return false;
}

module.exports = {
  createStreamWindow,
  getStreamWindow,
  getStreamWindowConfig,
  isStreamWindowSettingUp,
  safeCloseStreamWindow,
  forceCloseStreamWindow, // Export the new function
  ensureStreamWindowIsolation, // Export the isolation function
  ensureProperPositioning, // Export the positioning function
  ensureShortcutBlocking, // Export the shortcut blocking function
  showStreamWindow, // Export the show function
  minimizeStreamWindow, // Export the minimize function
  startRecording,
  stopRecording,
  getRecordingStatus: meetingId => {
    const recordingData = recordingProcesses.get(meetingId);
    return {
      isRecording: !!recordingData,
      startTime: recordingData?.startTime || null,
      chunks: recordingData?.chunks || [],
      config: recordingData?.config || null,
      restartAttempts: recordingData?.restartAttempts || 0,
      lastRestart: recordingData?.lastRestart || null,
      pid: recordingData?.pid || null,
    };
  },
};
