import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  dialog,
  crashReporter,
} from 'electron';
import * as Sentry from '@sentry/electron/main';
import { loadEnv, getLoadEnvError } from './modules/loadEnv';
import { getSentryDsn, getSentryEndpoint, isDev } from './modules/config';

loadEnv();

if (getSentryEndpoint()) {
  crashReporter.start({
    companyName: 'Allen Career Institute',
    productName: 'Astra',
    submitURL: getSentryEndpoint(),
    uploadToServer: true,
  });
}

if (getSentryDsn()) {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: process.env.ENV,
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    getSessions: () => [
      session.defaultSession,
      session.fromPartition('persist:shared'),
    ],
    transportOptions: {
      maxAgeDays: 30,
      maxQueueSize: 30,
      flushAtStartup: true,
    },
    // Add process identification to Sentry
    beforeSend: event => {
      event.tags = {
        ...event.tags,
        process_type: 'main',
        process_name: 'Main Process',
        app_component: 'Astra Console',
      };
      return event;
    },
  });
}

// Import modules
import { createMenu } from './modules/menu';
import { setupIpcHandlers } from './utils/ipcHandlers';
import { setupAutoUpdater } from './modules/autoUpdater';
import {
  cleanup,
  cleanupNonMainWindow,
  cleanupOldRecordings,
  setupPeriodicCleanup,
} from './modules/cleanup';
import { createMainWindow } from './modules/windowManager';
import { setupAutomaticProcessNaming } from './modules/processMonitor';

// Enable hardware acceleration and WebRTC optimizations for better video quality
app.commandLine.appendSwitch(
  '--enable-features',
  'VaapiVideoDecoder,VaapiVideoEncoder,WebCodecs,WebRTCPipeWireCapturer'
);
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');
app.commandLine.appendSwitch('--enable-accelerated-video-encode');
app.commandLine.appendSwitch('--enable-webcodecs');
app.commandLine.appendSwitch('--enable-webrtc');

// Enable screen sharing permissions
app.commandLine.appendSwitch('--enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('--allow-running-insecure-content');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--force_high_performance_gpu');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--enable-experimental-web-platform-features');
app.commandLine.appendSwitch('--enable-features', 'GetDisplayMedia');
app.commandLine.appendSwitch('--enable-features', 'WebRTC');
app.commandLine.appendSwitch('--enable-features', 'WebCodecs');
app.commandLine.appendSwitch('--enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('--enable-features', 'ScreenCaptureKit');
app.commandLine.appendSwitch('--enable-features', 'DesktopCaptureKit');

// Additional WebRTC flags to resolve SDP codec collision issues
app.commandLine.appendSwitch(
  '--force-fieldtrials',
  'WebRTC-Audio-MinimizeResamplingOnMobile/Enabled/'
);
app.commandLine.appendSwitch(
  '--force-fieldtrials',
  'WebRTC-Video-QualityScaling/Enabled/'
);
app.commandLine.appendSwitch(
  '--force-fieldtrials',
  'WebRTC-Audio-OpusMaxAverageBitrate/Enabled/'
);
app.commandLine.appendSwitch('--webrtc-max-cpu-consumption-percentage', '100');
app.commandLine.appendSwitch('--webrtc-cpu-overuse-detection', 'false');

// Additional performance optimizations for streaming
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--max-active-webgl-contexts', '16');

import 'agora-electron-sdk/js/Private/ipc/main.js';

setupIpcHandlers(ipcMain);

// App event handlers
app.on('ready', () => {
  try {
    createMainWindow();
    createMenu();

    process.title = 'Astra-Main';
    // Set up automatic process naming for Electron processes
    setupAutomaticProcessNaming();

    // Clean up old recording folders on app start
    try {
      cleanupOldRecordings();
    } catch (cleanupError) {
      console.error('Failed to cleanup old recordings:', cleanupError);
      // Continue with app initialization even if cleanup fails
    }

    // Set up periodic cleanup of old recordings
    try {
      setupPeriodicCleanup();
    } catch (periodicCleanupError) {
      console.error('Failed to setup periodic cleanup:', periodicCleanupError);
      // Continue with app initialization even if periodic cleanup fails
    }

    // Show error dialog if environment variables failed to load
    if (getLoadEnvError()) {
      dialog
        .showMessageBox({
          type: 'error',
          title: 'Environment Variables Error',
          message: 'Environment variables not loaded',
          detail: getLoadEnvError()?.message || 'Unknown error',
          buttons: ['OK'],
        })
        .catch(err => {
          console.error('Failed to show environment error dialog:', err);
        });
    }
    // logEnv();

    // Setup auto-updater with error handling
    try {
      setupAutoUpdater();
    } catch (autoUpdaterError) {
      console.error('Failed to setup auto-updater:', autoUpdaterError);
      // Continue with app initialization even if auto-updater fails
    }

    // Start cleanup worker from main window
    // startCleanupWorker();
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  } else {
    cleanupNonMainWindow();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  cleanup();
});
