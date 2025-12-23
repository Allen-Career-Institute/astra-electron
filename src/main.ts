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
import {
  getSentryDsn,
  getSentryEndpoint,
  getUrlByEnv,
  isDev,
} from './modules/config';
import { setLaunchArgs } from './utils/relaunchUtil';
import settings from 'electron-settings';

loadEnv();

// To do incase to avoid profile selection window to open again and again add fallback value as non null value
const selectedProfile =
  process.argv.find(a => a.startsWith('--profile='))?.split('=')[1] ?? null;

setLaunchArgs(process.argv);

if (selectedProfile) {
  setActiveProfile(selectedProfile);
} else {
  clearActiveProfile();
}

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
    tracesSampleRate: 0.2,
    sampleRate: 0.2,
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
// Incase of any issues, please use chrome://version in the browser to check the flags in commandline
//  and compare with the ones you are using here.

// GPU Hardware Acceleration flags
app.commandLine.appendArgument('--ignore-gpu-blocklist');
app.commandLine.appendArgument('--enable-gpu-rasterization');
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
  'TreesInViz',
  'ThrottleMainFrameTo60Hz',
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

app.commandLine.appendArgument('--disable-background-timer-throttling');
// app.commandLine.appendArgument('--disable-renderer-backgrounding');
app.commandLine.appendArgument('--disable-backgrounding-occluded-windows');
// app.commandLine.appendSwitch('disable-frame-rate-limit');
// app.commandLine.appendSwitch('disable-gpu-vsync');
// CalculateNativeWinOcclusion
app.commandLine.appendSwitch(
  'disable-features',
  'WebRtcAllowInputVolumeAdjustment,'
);
app.commandLine.appendArgument('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('max-active-webgl-contexts', '16');

// Memory and performance flags
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=6196');
app.commandLine.appendArgument('--disable-dev-shm-usage');

import 'agora-electron-sdk/js/Private/ipc/main.js';
import { askMediaAccess } from './utils/permissionUtil';
import {
  clearActiveProfile,
  clearActiveProfileStorage,
  setActiveProfile,
} from './utils/profileUtils';

setupIpcHandlers(ipcMain);

// App event handlers
app.on('ready', async () => {
  try {
    await askMediaAccess(['screen', 'microphone', 'camera']);
    settings.configure({
      atomicSave: true,
      fileName: 'settings.json',
      prettify: true,
      numSpaces: 2,
    });
    createMainWindow();
    createMenu();
    process.title = 'Astra-Main';
    // Set up automatic process naming for Electron processes
    setupAutomaticProcessNaming();

    // Clean up old recording folders on app start
    try {
      cleanupOldRecordings();
    } catch (cleanupError) {
      Sentry.captureException(cleanupError);
    }

    // Set up periodic cleanup of old recordings
    try {
      setupPeriodicCleanup();
    } catch (periodicCleanupError) {
      Sentry.captureException(periodicCleanupError);
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

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', async () => {
  await clearActiveProfile();
  cleanup();
});
