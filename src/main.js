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
const { Worker } = require('worker_threads');

// Initialize Sentry
const Sentry = require('@sentry/electron');

// Initialize Sentry with environment-based configuration
function initializeSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    Sentry.init({
      dsn: dsn,
      environment: environment,
      debug: environment === 'development',
      integrations: [
        new Sentry.Integrations.GlobalHandlers({
          onerror: true,
          onunhandledrejection: true,
        }),
        new Sentry.Integrations.Process({
          onerror: true,
        }),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      attachStacktrace: true,
      includeLocalVariables: true,
      // Enable source maps
      release: process.env.APP_VERSION || '1.0.0',
      dist: process.env.NODE_ENV || 'development',
    });

    console.log(`Sentry initialized for environment: ${environment}`);
  } else {
    console.log('Sentry DSN not provided, skipping initialization');
  }
}

// Initialize store for configuration
const store = new Store();

// Global window references
let mainWindow;
let secondWindow;
let thirdWindow;

// Recording process management
let recordingWorker = null;
let advancedRecordingWorker = null;
// let recordingCallbacks = new Map();

// Environment configuration
const ENV = process.env.NODE_ENV || 'development';
const URLS = {
  development: 'https://console.allen-stage.in/',
  stage: 'https://console.allen-stage.in/',
  production: 'https://astra.allen.in',
};

const DEFAULT_URL = URLS[ENV] || URLS.development;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSecondWindow() {
  if (secondWindow) {
    secondWindow.focus();
    return;
  }

  secondWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Allen UI Console - Second Window',
  });

  secondWindow.loadFile(
    path.join(__dirname, '../dist/renderer/second-window.html')
  );

  if (ENV === 'development') {
    secondWindow.webContents.openDevTools();
  }

  secondWindow.on('closed', () => {
    secondWindow = null;
  });
}

function createThirdWindow() {
  if (thirdWindow) {
    thirdWindow.focus();
    return;
  }

  thirdWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Allen UI Console - Video Stream',
  });

  thirdWindow.loadFile(
    path.join(__dirname, '../dist/renderer/third-window.html')
  );

  if (ENV === 'development') {
    thirdWindow.webContents.openDevTools();
  }

  thirdWindow.on('closed', () => {
    thirdWindow = null;
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
      label: 'Window',
      submenu: [
        {
          label: 'Open Second Window',
          accelerator: 'CmdOrCtrl+Shift+2',
          click: () => createSecondWindow(),
        },
        {
          label: 'Open Third Window',
          accelerator: 'CmdOrCtrl+Shift+3',
          click: () => createThirdWindow(),
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

// IPC Handlers
ipcMain.handle('get-environment', () => {
  return ENV;
});

ipcMain.handle('get-default-url', () => {
  return store.get('customUrl', DEFAULT_URL);
});

ipcMain.handle('open-second-window', () => {
  createSecondWindow();
  return true;
});

ipcMain.handle('open-third-window', () => {
  createThirdWindow();
  return true;
});

ipcMain.handle('send-to-second-window', (event, data) => {
  if (secondWindow) {
    secondWindow.webContents.send('message-from-main', data);
  }
  return true;
});

ipcMain.handle('send-to-third-window', (event, data) => {
  if (thirdWindow) {
    thirdWindow.webContents.send('message-from-main', data);
  }
  return true;
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

// Agora integration handlers
ipcMain.handle('initialize-agora', async (event, config) => {
  console.log('initialize-agora', config, event);
  try {
    // Agora initialization will be handled in renderer
    return { success: true, message: 'Agora initialized' };
  } catch (error) {
    console.error('Failed to initialize Agora:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('join-channel', async (event, channelName, uid) => {
  try {
    console.log('join-channel', channelName, uid, event);
    // Channel joining will be handled in renderer
    return { success: true, message: 'Joined channel' };
  } catch (error) {
    console.error('Failed to join channel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leave-channel', async () => {
  try {
    // Channel leaving will be handled in renderer
    return { success: true, message: 'Left channel' };
  } catch (error) {
    console.error('Failed to leave channel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('publish-stream', async () => {
  try {
    // Stream publishing will be handled in renderer
    return { success: true, message: 'Stream published' };
  } catch (error) {
    console.error('Failed to publish stream:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unpublish-stream', async () => {
  try {
    // Stream unpublishing will be handled in renderer
    return { success: true, message: 'Stream unpublished' };
  } catch (error) {
    console.error('Failed to unpublish stream:', error);
    return { success: false, error: error.message };
  }
});

// Audio/Video control handlers
ipcMain.handle('mute-audio', async (event, mute) => {
  try {
    if (thirdWindow) {
      thirdWindow.webContents.send('audio-control', { mute });
    }
    return { success: true, message: `Audio ${mute ? 'muted' : 'unmuted'}` };
  } catch (error) {
    console.error('Failed to control audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mute-video', async (event, mute) => {
  try {
    if (thirdWindow) {
      thirdWindow.webContents.send('video-control', { mute });
    }
    return { success: true, message: `Video ${mute ? 'muted' : 'unmuted'}` };
  } catch (error) {
    console.error('Failed to control video:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-audio', async () => {
  try {
    if (thirdWindow) {
      thirdWindow.webContents.send('audio-control', { stop: true });
    }
    return { success: true, message: 'Audio stopped' };
  } catch (error) {
    console.error('Failed to stop audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-video', async () => {
  try {
    if (thirdWindow) {
      thirdWindow.webContents.send('video-control', { stop: true });
    }
    return { success: true, message: 'Video stopped' };
  } catch (error) {
    console.error('Failed to stop video:', error);
    return { success: false, error: error.message };
  }
});

// Window URL management handlers
ipcMain.handle('set-second-window-url', async (event, url) => {
  try {
    if (secondWindow) {
      secondWindow.webContents.send('load-url', url);
    }
    return { success: true, message: 'URL set for second window' };
  } catch (error) {
    console.error('Failed to set second window URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-third-window-url', async (event, url) => {
  try {
    if (thirdWindow) {
      thirdWindow.webContents.send('load-url', url);
    }
    return { success: true, message: 'URL set for third window' };
  } catch (error) {
    console.error('Failed to set third window URL:', error);
    return { success: false, error: error.message };
  }
});

// Get window status
ipcMain.handle('get-window-status', async () => {
  return {
    mainWindow: !!mainWindow,
    secondWindow: !!secondWindow,
    thirdWindow: !!thirdWindow,
  };
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
        // Forward to appropriate window
        if (thirdWindow) {
          thirdWindow.webContents.send('recording-process-message', message);
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
        // Forward to appropriate window
        if (thirdWindow) {
          thirdWindow.webContents.send('advanced-recording-message', message);
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
  if (secondWindow) {
    secondWindow.close();
    secondWindow = null;
  }
  if (thirdWindow) {
    thirdWindow.close();
    thirdWindow = null;
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

// App event handlers
app.whenReady().then(() => {
  // Initialize Sentry first
  initializeSentry();

  // Initialize recording processes
  initializeRecordingProcess();
  initializeAdvancedRecordingProcess();

  createMainWindow();
  createMenu();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  cleanup();
});

// Handle process termination
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  console.log('web-contents-created', event, contents);
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
