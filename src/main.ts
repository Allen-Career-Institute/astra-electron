import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  WebContents,
  dialog,
  crashReporter,
} from 'electron';
import path from 'path';

// Load environment variables using hybrid approach
let envLoadError: Error | null = null;

// Function to load runtime environment variables from .env.local
function loadRuntimeEnv() {
  try {
    const fs = require('fs');
    const envPath = app.isPackaged
      ? path.join(process.resourcesPath, '.env.local')
      : path.resolve(process.cwd(), '.env.local');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('#'))
        .reduce(
          (acc: Record<string, string>, line: string) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts
                .join('=')
                .trim()
                .replace(/^["']|["']$/g, '');
              acc[key.trim()] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

      // Override webpack-defined variables with runtime values
      Object.entries(envVars).forEach(([key, value]) => {
        process.env[key] = value as string;
      });

      console.log('✅ Runtime environment variables loaded from:', envPath);
      console.log('📋 Loaded variables:', Object.keys(envVars).join(', '));
      return true;
    } else {
      console.log(
        'ℹ️  Runtime .env.local file not found, using webpack defaults'
      );
      throw new Error('Runtime .env.local file not found');
    }
  } catch (error) {
    console.warn('⚠️  Failed to load runtime environment variables:', error);
    throw error;
  }
}

// Try to load runtime environment variables
try {
  loadRuntimeEnv();
} catch (error) {
  envLoadError =
    error instanceof Error
      ? error
      : new Error('Unknown error loading runtime environment variables');
  console.error('Failed to load runtime environment variables:', error);
}

if (process.env.ASTRA_ELECTRON_SENTRY_ENDPOINT) {
  crashReporter.start({
    companyName: 'Allen Digital',
    productName: 'Astra',
    submitURL: process.env.ASTRA_ELECTRON_SENTRY_ENDPOINT,
    uploadToServer: true,
  });
}

// Import modules
import { createMenu } from './modules/menu';
import { setupIpcHandlers } from './modules/ipcHandlers';
import { setupAutoUpdater } from './modules/autoUpdater';
import { cleanup } from './modules/cleanup';
import { createMainWindow } from './modules/windowManager';
import { getStreamWindow } from './modules/streamWindow';

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

setupIpcHandlers(ipcMain);

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents: WebContents) => {
  // contents.on('new-window-for-tab', (event: any, navigationUrl: string) => {
  //   event.preventDefault();
  //   shell.openExternal(navigationUrl);
  // });
});

// App event handlers
app.on('ready', () => {
  try {
    createMainWindow();
    createMenu();

    // Show error dialog if environment variables failed to load
    if (envLoadError) {
      dialog
        .showMessageBox({
          type: 'error',
          title: 'Environment Variables Error',
          message: 'Environment variables not loaded',
          detail: envLoadError.message,
          buttons: ['OK'],
        })
        .catch(err => {
          console.error('Failed to show environment error dialog:', err);
        });
    }

    if (!envLoadError) {
      // Log environment variables from webpack in native dialog
      const envVars = {
        ENV: process.env.ENV,
        STAGE_URL: process.env.STAGE_URL,
        PROD_URL: process.env.PROD_URL,
        CUSTOM_URL: process.env.CUSTOM_URL,
        DEV_URL: process.env.DEV_URL,
        ASTRA_ELECTRON_SENTRY_DSN: process.env.ASTRA_ELECTRON_SENTRY_DSN,
        ASTRA_ELECTRON_SENTRY_ENDPOINT:
          process.env.ASTRA_ELECTRON_SENTRY_ENDPOINT,
        // Add any other environment variables you want to log
      };

      const envString = Object.entries(envVars)
        .map(([key, value]) => `${key}: ${value || 'undefined'}`)
        .join('\n');

      dialog
        .showMessageBox({
          type: 'info',
          title: 'Environment Variables from Webpack',
          message: 'Environment variables loaded from webpack configuration:',
          detail: envString,
          buttons: ['OK'],
        })
        .catch(err => {
          console.error('Failed to show environment dialog:', err);
        });
    }

    // Setup auto-updater with error handling
    try {
      setupAutoUpdater();
    } catch (autoUpdaterError) {
      console.error('Failed to setup auto-updater:', autoUpdaterError);
      // Continue with app initialization even if auto-updater fails
    }

    // Start cleanup worker from main window
    // startCleanupWorker();

    // Stream window will only open on CONFIG_UPDATE action, not automatically on startup
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  const streamWindow = getStreamWindow();
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
  }
  cleanup();
});
