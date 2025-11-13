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
    sampleRate: 0.1,
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

// https://peter.sh/experiments/chromium-command-line-switches/

// GPU Hardware Acceleration flags
app.commandLine.appendArgument('--ignore-gpu-blocklist');
app.commandLine.appendArgument('--enable-gpu-rasterization');
app.commandLine.appendArgument('--enable-gpu-service-logging');
app.commandLine.appendArgument('--enable-webgpu-developer-features');
app.commandLine.appendArgument('--enable-zero-copy');
app.commandLine.appendArgument('--enable-accelerated-video-decode');
app.commandLine.appendArgument('--enable-accelerated-video-encode');
app.commandLine.appendArgument('--enable-accelerated-2d-canvas');
app.commandLine.appendArgument('--enable-native-gpu-memory-buffers');
app.commandLine.appendArgument('--enable-hardware-overlays');
app.commandLine.appendArgument('--enable-webcodecs');
app.commandLine.appendArgument('--enable-webrtc');

// Enable screen sharing permissions
app.commandLine.appendArgument('--enable-usermedia-screen-capturing');
app.commandLine.appendArgument('--allow-running-insecure-content');
app.commandLine.appendArgument('--disable-web-security');
app.commandLine.appendArgument('--disable-renderer-backgrounding');
app.commandLine.appendArgument('--force_high_performance_gpu');
app.commandLine.appendArgument('--disable-volume-adjust-sound');
app.commandLine.appendArgument(
  '--disable-webrtc-allow-input-volume-adjustment'
);
app.commandLine.appendArgument('--enable-experimental-web-platform-features');

// Enable features with proper comma-separated values
const enabledFeatures = [
  'WebNNCoreMLExplicitGPUOrNPU',
  'GetDisplayMedia',
  'WebRTC',
  'WebCodecs',
  'VaapiVideoEncoder',
  'VaapiVideoDecoder',
  'WebRTCPipeWireCapturer',
  'ScreenCaptureKit',
  'DesktopCaptureKit',
  'HardwareEncodeDecodeAccelerator',
  'WebGPU',
  'MediaCapabilities',
  'HardwareMediaKeyHandling',
  'PlatformHEVCEncoderSupport',
  'PlatformHEVCDecoderSupport',
].join(',');
app.commandLine.appendSwitch('enable-features', enabledFeatures);

// Additional WebRTC flags to resolve SDP codec collision issues
app.commandLine.appendSwitch(
  'force-fieldtrials',
  'WebRTC-Audio-MinimizeResamplingOnMobile/Enabled/'
);
app.commandLine.appendSwitch(
  'force-fieldtrials',
  'WebRTC-Video-QualityScaling/Enabled/'
);
app.commandLine.appendSwitch(
  'force-fieldtrials',
  'WebRTC-Audio-OpusMaxAverageBitrate/Enabled/'
);
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '80');
app.commandLine.appendArgument('--webrtc-cpu-overuse-detection');

// Additional performance optimizations for streaming
app.commandLine.appendSwitch('disable-background-timer-throttling', 'true');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch(
  'disable-features',
  'WebRtcAllowInputVolumeAdjustment,TranslateUI'
);
app.commandLine.appendSwitch('disable-ipc-flooding-protection', 'true');
app.commandLine.appendSwitch('max-active-webgl-contexts', '16');

// Memory and performance flags
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=6196');
app.commandLine.appendSwitch('disable-dev-shm-usage', 'true');

import 'agora-electron-sdk/js/Private/ipc/main.js';
import { askMediaAccess } from './utils/permissionUtil';

setupIpcHandlers(ipcMain);

// App event handlers
app.on('ready', async () => {
  try {
    await askMediaAccess(['screen', 'microphone', 'camera']);
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
