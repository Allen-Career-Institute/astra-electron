import 'agora-electron-sdk/js/Private/ipc/main.js';
import { app, BrowserWindow, ipcMain, WebContents } from 'electron';

// Load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('No .env.local file found, using default environment variables');
}

// Import modules
import { initializeSentry } from './modules/sentry';
import { createMenu } from './modules/menu';
import { setupIpcHandlers } from './modules/ipcHandlers';
import { setupAutoUpdater } from './modules/autoUpdater';
import { cleanup, setupCleanupHandlers } from './modules/cleanup';
import { createMainWindow } from './modules/windowManager';
import { getStreamWindow } from './modules/streamWindow';
import { agoraManager } from './modules/agoraManager';

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

// Additional flags to ensure all window types can be captured
app.commandLine.appendSwitch('--enable-features', 'WebRTCDesktopCapture');
app.commandLine.appendSwitch('--enable-features', 'WebRTCScreenCapture');
app.commandLine.appendSwitch('--enable-features', 'WebRTCWindowCapture');
app.commandLine.appendSwitch('--enable-features', 'WebRTCDesktopCaptureKit');
app.commandLine.appendSwitch('--enable-features', 'WebRTCScreenCaptureKit');
app.commandLine.appendSwitch('--enable-features', 'WebRTCWindowCaptureKit');
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCDesktopCapturePipeWire'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCScreenCapturePipeWire'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCWindowCapturePipeWire'
);

// Chrome-specific flags for window capture
app.commandLine.appendSwitch('--enable-features', 'WebRTCChromeWindowCapture');
app.commandLine.appendSwitch('--enable-features', 'WebRTCChromeDesktopCapture');
app.commandLine.appendSwitch('--enable-features', 'WebRTCChromeScreenCapture');
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeWindowCaptureKit'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeDesktopCaptureKit'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeScreenCaptureKit'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeWindowCapturePipeWire'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeDesktopCapturePipeWire'
);
app.commandLine.appendSwitch(
  '--enable-features',
  'WebRTCChromeScreenCapturePipeWire'
);

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
    initializeSentry();
    createMainWindow();
    createMenu();
    setupAutoUpdater();

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
  // Release Agora engine
  try {
    agoraManager.release();
    console.log('Agora engine released on app quit');
  } catch (error) {
    console.error('Error releasing Agora engine on quit:', error);
  }

  const streamWindow = getStreamWindow();
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
  }
  cleanup();
});
