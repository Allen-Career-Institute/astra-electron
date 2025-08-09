const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
} = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');
const debounce = require('lodash/debounce');
const { Worker } = require('worker_threads');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Sentry
const Sentry = require('@sentry/electron');

// Initialize Sentry with environment-based configuration
function initializeSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    try {
      // Check if Sentry integrations are available
      const integrations = [];

      if (Sentry.Integrations && Sentry.Integrations.GlobalHandlers) {
        try {
          integrations.push(new Sentry.Integrations.GlobalHandlers());
        } catch (e) {
          console.warn('GlobalHandlers integration not available:', e.message);
        }
      }

      if (Sentry.Integrations && Sentry.Integrations.Process) {
        try {
          integrations.push(new Sentry.Integrations.Process());
        } catch (e) {
          console.warn('Process integration not available:', e.message);
        }
      }

      Sentry.init({
        dsn: dsn,
        environment: environment,
        debug: environment === 'development',
        integrations: integrations,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        attachStacktrace: true,
        includeLocalVariables: true,
        // Enable source maps
        release: process.env.APP_VERSION || '1.0.0',
        dist: process.env.NODE_ENV || 'development',
      });

      console.log(`Sentry initialized for environment: ${environment}`);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      console.log('Continuing without Sentry...');
    }
  } else {
    console.log('Sentry DSN not provided, skipping initialization');
  }
}

// Initialize store for configuration
const store = new Store();

// Global window references
let mainWindow;

let streamWindow; // New global reference for the stream window

// Global configuration storage
let streamWindowConfig = null;

// Track main window load state to prevent premature stream window closure
let mainWindowHasLoaded = false;
let streamWindowSettingUp = false; // Track when stream window is being set up

// Recording process management
let recordingWorker = null;
let advancedRecordingWorker = null;
// let recordingCallbacks = new Map();

// Environment configuration
const ENV = process.env.NODE_ENV || 'development';
const URLS = {
  development: 'http://localhost:3000/',
  stage: 'https://console.allen-stage.in/',
  production: 'https://astra.allen.in/',
};

const DEFAULT_URL = URLS[ENV] || URLS.development;

// Helper function to safely access stream window
function getStreamWindow() {
  if (streamWindow && !streamWindow.isDestroyed() && streamWindow.webContents) {
    return streamWindow;
  }
  return null;
}

// Function to inject tokens into browser window local storage
function injectTokensToWindow(window) {
  if (ENV === 'development') {
    const tokens = JSON.parse(process.env.AUTH_TOKEN);

    if (tokens) {
      // Inject tokens as a single object under 'tokens' key
      window.webContents.executeJavaScript(`
        (function() {
          try {
            const tokens = ${JSON.stringify(tokens)};
            localStorage.setItem('tokens', JSON.stringify(tokens));
            console.log('Injected tokens object:', tokens);
          } catch (error) {
            console.error('Failed to inject tokens to localStorage:', error);
          }
        })();
      `);
    }
  }
}

function injectTokensToStreamWindow(window) {
  if (ENV === 'development') {
    const tokens = JSON.parse(process.env.AUTH_TOKEN);

    if (tokens) {
      // Send tokens via IPC to the stream window
      window.webContents.send('inject-tokens', tokens);
      console.log('Sent tokens to stream window via IPC');
    }
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      // Allow communication with allen-ui-live
      allowRunningInsecureContent: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'Allen UI Console',
  });

  // Load the main HTML file (React build)
  //   mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  mainWindow.loadURL(DEFAULT_URL);

  // Open DevTools in development
  if (ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Track when main window finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window finished loading');
    mainWindowHasLoaded = true;
  });

  // Handle main window resize to reposition stream window
  let resizeTimeout;
  mainWindow.on('resize', () => {
    // Debounce resize events to prevent too many repositioning calls
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (streamWindow && !streamWindow.isDestroyed()) {
        const mainBounds = mainWindow.getBounds();
        const streamBounds = streamWindow.getBounds();

        // Calculate new position
        const newStreamX =
          mainBounds.x + mainBounds.width - streamBounds.width - 20;
        const newStreamY =
          mainBounds.y + mainBounds.height - streamBounds.height - 20;

        // Ensure the stream window stays within screen bounds
        const screenBounds =
          require('electron').screen.getPrimaryDisplay().workAreaSize;
        const finalX = Math.max(
          0,
          Math.min(newStreamX, screenBounds.width - streamBounds.width)
        );
        const finalY = Math.max(
          0,
          Math.min(newStreamY, screenBounds.height - streamBounds.height)
        );

        streamWindow.setPosition(finalX, finalY);
      }
    }, 100); // 100ms debounce
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Change URL',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            if (ENV === 'stage') {
              dialog
                .showInputBox({
                  title: 'Change URL',
                  message: 'Enter new URL:',
                  default: store.get('customUrl', DEFAULT_URL),
                })
                .then(result => {
                  if (!result.canceled && result.text) {
                    store.set('customUrl', result.text);
                    mainWindow.webContents.send('url-changed', result.text);
                  }
                });
            }
          },
          enabled: ENV === 'stage',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },

    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reload();
            }
          },
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Allen UI Console',
              message: 'Allen UI Console Electron App',
              detail: 'Version 1.0.0\nEnvironment: ' + ENV,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Stream overlay is now handled within the main window renderer process
// No separate window creation needed

function createStreamWindow(config) {
  try {
    console.log('Starting createStreamWindow with config:', config);

    if (streamWindow && !streamWindow.isDestroyed()) {
      console.log('Stream window already exists, focusing it');
      streamWindow.focus();
      return;
    }

    // Set flag to prevent premature closure during setup
    streamWindowSettingUp = true;

    // Set a timeout to reset the flag in case setup gets stuck
    setTimeout(() => {
      if (streamWindowSettingUp) {
        console.warn('Stream window setup timeout, resetting flag');
        streamWindowSettingUp = false;
      }
    }, 10000); // 10 second timeout

    try {
      // Calculate dimensions for 16:9 aspect ratio with 180px height
      const height = 180;
      const width = Math.round(height * (16 / 9)); // 320px

      // Get main window bounds to position stream window at bottom right
      const mainBounds = mainWindow.getBounds();
      const streamX = mainBounds.x + mainBounds.width - width - 20; // 20px from right edge
      const streamY = mainBounds.y + mainBounds.height - height - 20; // 20px from bottom

      console.log('Creating BrowserWindow with dimensions:', {
        width,
        height,
        x: streamX,
        y: streamY,
      });

      streamWindow = new BrowserWindow({
        width: width,
        height: height,
        x: streamX,
        y: streamY,
        frame: false, // Remove default window frame for custom styling
        resizable: true,
        movable: true,
        alwaysOnTop: true, // Keep window on top
        skipTaskbar: true, // Don't show in taskbar
        parent: null, // Remove parent to make it truly floating
        modal: false, // Don't make it modal
        focusable: true,
        minimizable: false, // Disable minimize
        maximizable: false, // Prevent maximization for floating window
        fullscreenable: false, // Prevent fullscreen
        closable: false, // Disable close button
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          webSecurity: true,
          webviewTag: false,
          preload: path.join(__dirname, 'stream-preload.js'),
        },
        title: 'Allen UI Console - Stream Window',
        show: false, // Don't show until ready
        minWidth: 240,
        minHeight: 135,
        maxWidth: 800,
        maxHeight: 450,
        // Enable transparency for better floating effect
        transparent: false,
        // Enable rounded corners (macOS)
        titleBarStyle: 'hidden',
        // Enable window shadow
        hasShadow: true,
      });

      console.log('BrowserWindow created successfully');
    } catch (error) {
      console.error('Error creating BrowserWindow:', error);
      throw error; // Re-throw to be caught by outer handler
    }

    try {
      // Extract stream config from the payload
      const { appId, channel, token, uid, meetingId, deviceIds, url } = config;
      const streamConfig = {
        appId,
        channel,
        token,
        uid,
        meetingId,
        deviceIds,
        url,
      };

      console.log('Creating stream window with config:', streamConfig);

      // Store config globally for the stream window
      streamWindowConfig = streamConfig;

      // Load the streaming URL from allen-ui-live
      const streamUrl = url;
      console.log('Loading stream URL:', streamUrl);

      streamWindow.loadURL(streamUrl);
      console.log('Stream URL loaded successfully');
    } catch (error) {
      console.error('Error loading stream URL:', error);
      throw error;
    }

    // Show window immediately after stream window loads
    streamWindow.webContents.on('did-finish-load', () => {
      try {
        console.log('Stream window loaded');

        // Ensure window is still valid before proceeding
        if (streamWindow && !streamWindow.isDestroyed()) {
          console.log('Showing stream window');
          streamWindow.show(); // Show window immediately

          // Inject tokens if in development mode
          injectTokensToStreamWindow(streamWindow);

          // Send stream config to the web page
          console.log(
            'Sending stream config to stream window:',
            streamWindowConfig
          );
          streamWindow.webContents.send('stream-config', streamWindowConfig);

          if (ENV === 'development') {
            console.log('Opening DevTools in development mode');
            streamWindow.webContents.openDevTools();
          }

          console.log('Stream window setup completed successfully');
          streamWindowSettingUp = false; // Reset setup flag
        } else {
          console.warn(
            'Stream window was destroyed before setup could complete'
          );
          streamWindowSettingUp = false; // Reset setup flag
        }
      } catch (error) {
        console.error('Error in stream window load handler:', error);
        console.error('Error stack:', error.stack);
        streamWindowSettingUp = false; // Reset setup flag on error
      }
    });

    // Add error handler for webContents
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

    // Add crash handler
    streamWindow.webContents.on('crashed', (event, killed) => {
      console.error('Stream window webContents crashed:', { killed });
    });

    // Handle window close
    streamWindow.on('closed', () => {
      try {
        console.log('Stream window closed');
        streamWindow = null;
        streamWindowSettingUp = false; // Reset setup flag
      } catch (error) {
        console.error('Error in stream window closed handler:', error);
        streamWindow = null;
        streamWindowSettingUp = false; // Reset setup flag
      }
    });

    // Enable window dragging and set up floating behavior
    try {
      streamWindow.setMovable(true);
      streamWindow.setResizable(true);

      // Set minimum and maximum sizes
      streamWindow.setMinimumSize(240, 135);
      streamWindow.setMaximumSize(800, 450);

      // Make window always on top
      streamWindow.setAlwaysOnTop(true, 'screen-saver');

      // Enable window focus
      streamWindow.setFocusable(true);
    } catch (error) {
      console.error('Error setting stream window properties:', error);
    }

    // Add floating window event handlers
    streamWindow.on('focus', () => {
      console.log('Stream window focused');
    });

    streamWindow.on('blur', () => {
      console.log('Stream window lost focus');
    });

    streamWindow.on('move', () => {
      console.log('Stream window moved');
    });

    streamWindow.on('resize', () => {
      console.log('Stream window resized');
    });

    // Handle stream window minimize/maximize
    streamWindow.on('minimize', () => {
      console.log('Stream window minimized');
    });

    streamWindow.on('restore', () => {
      console.log('Stream window restored');
    });

    // Close stream window when main window is about to close
    mainWindow.on('close', () => {
      try {
        if (streamWindow && !streamWindow.isDestroyed()) {
          console.log('Main window closing, closing stream window');
          streamWindow.close();
          streamWindow = null;
        }
      } catch (error) {
        console.error(
          'Error closing stream window on main window close:',
          error
        );
        streamWindow = null;
      }
    });

    // Clean up when main window is closed
    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

    // Close stream window when main window is minimized
    mainWindow.on('minimize', () => {
      try {
        if (streamWindow && !streamWindow.isDestroyed()) {
          console.log('Main window minimized, closing stream window');
          streamWindow.close();
          streamWindow = null;
        }
      } catch (error) {
        console.error('Error closing stream window on minimize:', error);
        streamWindow = null;
      }
    });

    // Handle main window reload
    mainWindow.webContents.on('did-start-loading', () => {
      try {
        // Close stream window when main window starts reloading
        if (
          mainWindowHasLoaded &&
          streamWindow &&
          !streamWindow.isDestroyed() &&
          !streamWindowSettingUp
        ) {
          console.log('Main window reloading, closing stream window');
          streamWindow.close();
          streamWindow = null;
        }
      } catch (error) {
        console.error('Error closing stream window on reload:', error);
        streamWindow = null;
      }
    });

    console.log('createStreamWindow completed successfully');
  } catch (error) {
    console.error('Error in createStreamWindow:', error);
    console.error('Error stack:', error.stack);

    // Clean up any partially created window
    if (streamWindow && !streamWindow.isDestroyed()) {
      try {
        streamWindow.close();
      } catch (closeError) {
        console.error('Error closing stream window after error:', closeError);
      }
    }
    streamWindow = null;
    streamWindowSettingUp = false; // Reset setup flag

    // Show error dialog in development
    if (ENV === 'development') {
      dialog.showErrorBox(
        'Stream Window Error',
        `Failed to create stream window: ${error.message}\n\nStack: ${error.stack}`
      );
    }

    throw error; // Re-throw to be handled by caller
  }
}

// IPC Handlers
ipcMain.handle('get-environment', () => {
  return ENV;
});

ipcMain.handle('get-default-url', () => {
  return DEFAULT_URL;
});

ipcMain.handle('send-to-main-window', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('message-from-other', data);
  }
  return true;
});

// Video recording handlers
ipcMain.handle('start-recording', async (event, options) => {
  try {
    console.log('start-recording', options, event);
    // This will be handled by the renderer process
    return { success: true, message: 'Recording started' };
  } catch (error) {
    console.error('Failed to start recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  try {
    // This will be handled by the renderer process
    return { success: true, message: 'Recording stopped' };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return { success: false, error: error.message };
  }
});

// File system handlers
ipcMain.handle('save-video-file', async (event, data, filename) => {
  try {
    const recordingsDir = path.join(app.getPath('userData'), 'recordings');

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const filePath = path.join(recordingsDir, filename);
    const buffer = Buffer.from(data);

    fs.writeFileSync(filePath, buffer);

    console.log(`Video file saved: ${filePath}`);
    return { success: true, filePath };
  } catch (error) {
    console.error('Failed to save video file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-video-file', async (event, filename) => {
  try {
    const recordingsDir = path.join(app.getPath('userData'), 'recordings');
    const filePath = path.join(recordingsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Video file deleted: ${filePath}`);
      return { success: true };
    } else {
      return { success: false, error: 'File not found' };
    }
  } catch (error) {
    console.error('Failed to delete video file:', error);
    return { success: false, error: error.message };
  }
});

// Get window status
ipcMain.handle('get-window-status', async () => {
  return {
    mainWindow: !!mainWindow,
  };
});

// Centralized IPC Communication handler for allen-ui-live web app
ipcMain.handle('sendMessage', async (event, message) => {
  console.log('Received message from allen-ui-live:', message);

  try {
    switch (message.type) {
      case 'CONFIG_UPDATE':
        // Create stream window with Agora config
        if (streamWindow && !streamWindow.isDestroyed()) {
          streamWindow.close();
          streamWindow = null;
        }

        const agoraConfig = {
          appId: message.payload.appId,
          channel: message.payload.channel,
          token: message.payload.token,
          uid: parseInt(message.payload.uid),
          meetingId: message.payload.meetingId,
          deviceIds: message.payload.deviceIds,
          url: message.payload.url,
        };

        createStreamWindow(agoraConfig);
        return { type: 'SUCCESS', payload: 'Stream window created' };

      case 'AUDIO_TOGGLE':
        // Forward audio toggle to stream window
        if (streamWindow && !streamWindow.isDestroyed()) {
          streamWindow.webContents.send(
            'stream-control',
            message.payload.enabled ? 'unmute-audio' : 'mute-audio'
          );
        }
        return { type: 'SUCCESS', payload: 'Audio toggle sent' };

      case 'VIDEO_TOGGLE':
        // Forward video toggle to stream window
        if (streamWindow && !streamWindow.isDestroyed()) {
          streamWindow.webContents.send(
            'stream-control',
            message.payload.enabled ? 'unmute-video' : 'mute-video'
          );
        }
        return { type: 'SUCCESS', payload: 'Video toggle sent' };

      case 'LEAVE_MEETING':
        // Close stream window
        if (streamWindow && !streamWindow.isDestroyed()) {
          streamWindow.close();
          streamWindow = null;
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
    if (streamWindowConfig) {
      console.log('Returning stream config:', streamWindowConfig);
      return streamWindowConfig;
    } else {
      console.warn('No stream config available');
      throw new Error('No stream config available');
    }
  } catch (error) {
    console.error('Failed to get stream config:', error);
    throw error;
  }
});

// Stream control handler
ipcMain.handle('stream-control', async (event, action, enabled) => {
  try {
    console.log('Stream control action:', action, 'enabled:', enabled);

    // Forward control action to main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-control-action', action, enabled);
    }

    return { success: true, message: 'Stream control action sent' };
  } catch (error) {
    console.error('Failed to handle stream control:', error);
    return { success: false, error: error.message };
  }
});

// Stream window control handlers
ipcMain.handle('close-stream-window', async event => {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      streamWindow.close();
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to close stream window:', error);
    return { success: false, error: error.message };
  }
});

// Recording process management
function initializeRecordingProcess() {
  try {
    const recordingProcessPath = path.join(__dirname, 'recording-process.js');

    recordingWorker = new Worker(recordingProcessPath, {
      workerData: {
        environment: process.env.NODE_ENV || 'development',
        sentryDsn: process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV,
      },
    });

    recordingWorker.on('message', message => {
      handleRecordingProcessMessage(message);
    });

    recordingWorker.on('error', error => {
      Sentry.captureException(error, {
        tags: { process: 'recording', error: 'worker-error' },
      });
      console.error('Recording process error:', error);
    });

    recordingWorker.on('exit', code => {
      if (code !== 0) {
        Sentry.captureMessage('Recording process exited with code: ' + code, {
          level: 'error',
          tags: { process: 'recording', exitCode: code },
        });
      }
      recordingWorker = null;
    });

    console.log('Recording process initialized');
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'initialize' },
    });
    console.error('Failed to initialize recording process:', error);
  }
}

function handleRecordingProcessMessage(message) {
  try {
    switch (message.type) {
      case 'recording-started':
      case 'recording-stopped':
      case 'recording-saved':
      case 'audio-recording-started':
      case 'audio-recording-stopped':
      case 'audio-recording-saved':
        // Forward to main window
        if (mainWindow) {
          mainWindow.webContents.send('recording-process-message', message);
        }
        break;

      case 'error':
        Sentry.captureMessage('Recording process error: ' + message.error, {
          level: 'error',
          tags: { process: 'recording' },
        });
        console.error('Recording process error:', message.error);
        break;

      case 'pong':
        console.log('Recording process is alive');
        break;

      default:
        console.log('Unknown recording process message:', message);
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'handle-message' },
    });
  }
}

// Recording process IPC handlers
ipcMain.handle('start-video-recording', async (event, streamData, options) => {
  try {
    if (!recordingWorker) {
      initializeRecordingProcess();
    }

    recordingWorker.postMessage({
      type: 'start-video-recording',
      streamData,
      options,
    });

    return { success: true, message: 'Video recording started' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'start-video' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-video-recording', async () => {
  try {
    if (recordingWorker) {
      recordingWorker.postMessage({ type: 'stop-video-recording' });
    }
    return { success: true, message: 'Video recording stopped' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'stop-video' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-audio-recording', async (event, streamData, options) => {
  try {
    if (!recordingWorker) {
      initializeRecordingProcess();
    }

    recordingWorker.postMessage({
      type: 'start-audio-recording',
      streamData,
      options,
    });

    return { success: true, message: 'Audio recording started' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'start-audio' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-audio-recording', async () => {
  try {
    if (recordingWorker) {
      recordingWorker.postMessage({ type: 'stop-audio-recording' });
    }
    return { success: true, message: 'Audio recording stopped' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'recording', action: 'stop-audio' },
    });
    return { success: false, error: error.message };
  }
});

// Advanced recording process management
function initializeAdvancedRecordingProcess() {
  try {
    const advancedRecordingProcessPath = path.join(
      __dirname,
      'advanced-recording-process.js'
    );

    advancedRecordingWorker = new Worker(advancedRecordingProcessPath, {
      workerData: {
        environment: process.env.NODE_ENV || 'development',
        sentryDsn: process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV,
      },
    });

    advancedRecordingWorker.on('message', message => {
      handleAdvancedRecordingProcessMessage(message);
    });

    advancedRecordingWorker.on('error', error => {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', error: 'worker-error' },
      });
      console.error('Advanced recording process error:', error);
    });

    advancedRecordingWorker.on('exit', code => {
      if (code !== 0) {
        Sentry.captureMessage(
          'Advanced recording process exited with code: ' + code,
          {
            level: 'error',
            tags: { process: 'advanced-recording', exitCode: code },
          }
        );
      }
      advancedRecordingWorker = null;
    });

    console.log('Advanced recording process initialized');
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'initialize' },
    });
    console.error('Failed to initialize advanced recording process:', error);
  }
}

function handleAdvancedRecordingProcessMessage(message) {
  try {
    switch (message.type) {
      case 'devices-initialized':
      case 'recording-started':
      case 'recording-paused':
      case 'recording-resumed':
      case 'audio-mute-toggled':
      case 'recording-stopped':
      case 'combine-progress':
        // Forward to main window
        if (mainWindow) {
          mainWindow.webContents.send('advanced-recording-message', message);
        }
        break;

      case 'error':
        Sentry.captureMessage(
          'Advanced recording process error: ' + message.error,
          {
            level: 'error',
            tags: { process: 'advanced-recording' },
          }
        );
        console.error('Advanced recording process error:', message.error);
        break;

      case 'pong':
        console.log('Advanced recording process is alive');
        break;

      default:
        console.log('Unknown advanced recording process message:', message);
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'handle-message' },
    });
  }
}

// Device management IPC handlers
ipcMain.handle('get-devices', async () => {
  try {
    // This would typically get devices from the system
    // For now, return a mock list
    const devices = {
      audio: [
        { deviceId: 'default', label: 'Default Audio Device' },
        { deviceId: 'audio1', label: 'Microphone' },
        { deviceId: 'audio2', label: 'External Microphone' },
      ],
      video: [
        { deviceId: 'default', label: 'Default Camera' },
        { deviceId: 'video1', label: 'Webcam' },
        { deviceId: 'video2', label: 'External Camera' },
      ],
    };

    return { success: true, devices };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'main', action: 'get-devices' },
    });
    return { success: false, error: error.message };
  }
});

// Advanced recording IPC handlers
ipcMain.handle('initialize-devices', async (event, deviceIds) => {
  try {
    if (!advancedRecordingWorker) {
      initializeAdvancedRecordingProcess();
    }

    advancedRecordingWorker.postMessage({
      type: 'initialize-devices',
      deviceIds,
    });

    return { success: true, message: 'Devices initialized' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'initialize-devices' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-advanced-recording', async (event, options) => {
  try {
    if (!advancedRecordingWorker) {
      initializeAdvancedRecordingProcess();
    }

    advancedRecordingWorker.postMessage({
      type: 'start-recording',
      options,
    });

    return { success: true, message: 'Advanced recording started' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'start-recording' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pause-recording', async () => {
  try {
    if (advancedRecordingWorker) {
      advancedRecordingWorker.postMessage({ type: 'pause-recording' });
    }
    return { success: true, message: 'Recording paused' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'pause-recording' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('resume-recording', async () => {
  try {
    if (advancedRecordingWorker) {
      advancedRecordingWorker.postMessage({ type: 'resume-recording' });
    }
    return { success: true, message: 'Recording resumed' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'resume-recording' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-mute', async () => {
  try {
    if (advancedRecordingWorker) {
      advancedRecordingWorker.postMessage({ type: 'toggle-mute' });
    }
    return { success: true, message: 'Mute toggled' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'toggle-mute' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-advanced-recording', async () => {
  try {
    if (advancedRecordingWorker) {
      advancedRecordingWorker.postMessage({ type: 'stop-recording' });
    }
    return { success: true, message: 'Advanced recording stopped' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'stop-recording' },
    });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recording-status', async () => {
  try {
    if (advancedRecordingWorker) {
      advancedRecordingWorker.postMessage({ type: 'get-status' });
    }
    return { success: true, message: 'Status requested' };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { process: 'advanced-recording', action: 'get-status' },
    });
    return { success: false, error: error.message };
  }
});

// Auto-updater setup
function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. The app will update automatically.',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The app will restart to install the update.',
    });
    autoUpdater.quitAndInstall();
  });
}

// Cleanup function to properly close all windows and workers
function cleanup() {
  console.log('Cleaning up application...');

  // Close all windows
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  if (streamWindow) {
    streamWindow.close();
    streamWindow = null;
  }

  // Terminate workers
  if (recordingWorker) {
    recordingWorker.terminate();
    recordingWorker = null;
  }
  if (advancedRecordingWorker) {
    advancedRecordingWorker.terminate();
    advancedRecordingWorker = null;
  }

  console.log('Cleanup completed');
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Stream window control handlers

// Handle stream window close request from main window
ipcMain.handle('close-stream-window-from-main', async () => {
  try {
    if (streamWindow && !streamWindow.isDestroyed()) {
      streamWindow.close();
      streamWindow = null;
    }
    return {
      type: 'SUCCESS',
      payload: 'Stream window closed from main window',
    };
  } catch (error) {
    return { type: 'ERROR', error: error.message };
  }
});

// App event handlers
app.on('ready', () => {
  try {
    console.log('App ready event fired');

    // Initialize Sentry
    initializeSentry();

    // Create main window
    createMainWindow();

    // Create menu
    createMenu();

    // Initialize recording processes
    initializeRecordingProcess();
    initializeAdvancedRecordingProcess();

    // Setup auto updater
    setupAutoUpdater();

    console.log('App initialization completed');
  } catch (error) {
    console.error('Error during app initialization:', error);
    console.error('Error stack:', error.stack);

    if (ENV === 'development') {
      dialog.showErrorBox(
        'App Initialization Error',
        `Failed to initialize app: ${error.message}\n\nStack: ${error.stack}`
      );
    }
  }
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  console.log('App quitting, cleaning up...');

  // Ensure stream window is closed
  if (streamWindow && !streamWindow.isDestroyed()) {
    console.log('Closing stream window before app quit');
    try {
      streamWindow.close();
      streamWindow = null;
    } catch (error) {
      console.error('Error closing stream window before quit:', error);
      streamWindow = null;
    }
  }

  cleanup();
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  console.error('Error stack:', error.stack);

  if (ENV === 'development') {
    dialog.showErrorBox(
      'Uncaught Exception',
      `An uncaught exception occurred: ${error.message}\n\nStack: ${error.stack}`
    );
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);

  if (ENV === 'development') {
    dialog.showErrorBox(
      'Unhandled Rejection',
      `An unhandled rejection occurred: ${reason}`
    );
  }
});
