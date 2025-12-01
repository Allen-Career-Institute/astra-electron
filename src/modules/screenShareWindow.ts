import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { getSharedSession } from './windowManager';
import { isDev } from './config';

export interface ScreenShareWindowConfig {
  meetingId: string;
  app_id: string;
  user_id: string;
  user_token: string;
  isWhiteboard: boolean;

  agoraConfig?: {
    dimensions: { width: number; height: number };
    frameRate: number;
    bitrate: number;
    windowFocus: boolean;
    captureMouseCursor: boolean;
    highLightWidth: number;
    highLightColor: number;
    enableHighLight: boolean;
  };
}

let screenShareWindow: BrowserWindow | null = null;
let screenShareWindowConfig: ScreenShareWindowConfig | null = null;
let screenShareWindowSettingUp: boolean = false;
let screenShareWindowPid: number | null = null;

// Enhanced cleanup function
function cleanupScreenShareWindowResources(): void {
  try {
    if (
      screenShareWindow &&
      !screenShareWindow.isDestroyed() &&
      screenShareWindow.webContents
    ) {
      try {
        screenShareWindow.webContents.send('cleanup-resources');
      } catch (error) {
        console.error('Error during screen share window cleanup:', error);
      }
    }
  } catch (error) {
    console.error('Error during screen share window cleanup:', error);
  }
}

async function safeCloseScreenShareWindow(
  reason: string = 'unknown'
): Promise<boolean> {
  try {
    cleanupScreenShareWindowResources();
    if (screenShareWindow && !screenShareWindow.isDestroyed()) {
      if (
        screenShareWindow.webContents &&
        screenShareWindow.webContents.isLoading()
      ) {
        let loadTimeout = setTimeout(() => {
          Promise.resolve(proceedWithClose());
        }, 2000);

        screenShareWindow.webContents.once('did-finish-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });

        screenShareWindow.webContents.once('did-fail-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });
      } else {
        const result = await proceedWithClose();
        return Promise.resolve(result);
      }

      async function proceedWithClose(): Promise<boolean> {
        try {
          screenShareWindow?.close();
          await new Promise(resolve => setTimeout(resolve, 200));
          if (screenShareWindow && !screenShareWindow.isDestroyed()) {
            try {
              screenShareWindow.destroy();
            } catch (destroyError) {
              console.error(
                'Error destroying screen share window:',
                destroyError
              );
            }
          }

          const { getMainWindow } = require('./windowManager');
          const mainWindow = getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            try {
              mainWindow.webContents.send('screen-share-window-closed');
            } catch (error) {
              console.error(
                'Error sending screen share window closed event:',
                error
              );
            }
          }

          screenShareWindow = null;
          screenShareWindowSettingUp = false;
          screenShareWindowConfig = null;
          screenShareWindowPid = null;
          return Promise.resolve(true);
        } catch (error) {
          console.error('Error during screen share window close:', error);
          return Promise.resolve(false);
        }
      }
    }
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error in safeCloseScreenShareWindow:', error);
    return Promise.resolve(false);
  }
}

async function createScreenShareWindow(
  screenShareConfig: ScreenShareWindowConfig
): Promise<BrowserWindow> {
  try {
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

    await new Promise(resolve => setTimeout(resolve, 1000));
    const { getMainWindow } = require('./windowManager');
    const mainWindow = getMainWindow();

    screenShareWindowSettingUp = true;
    screenShareWindowConfig = { ...screenShareConfig };

    let x: number, y: number;

    // Center the window on screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;
    x = Math.floor((screenWidth - 600) / 3);
    y = Math.floor((screenHeight - 338) / 2);

    // Create the screen share window
    screenShareWindow = new BrowserWindow({
      width: 600,
      height: 338,
      x,
      y,
      title: 'Astra - Screen Share',
      show: false,
      fullscreen: false, // Explicitly prevent fullscreen
      webPreferences: {
        backgroundThrottling: false,
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
        preload: path.join(
          app.isPackaged ? app.getAppPath() : process.cwd(),
          'dist',
          'screen-share-preload.js'
        ),
        webSecurity: false, // Disable for screen sharing to work
        allowRunningInsecureContent: true,
        // Enable experimental features for better screen sharing
        experimentalFeatures: true,
        // Enable WebRTC features
        enableBlinkFeatures:
          'WebCodecs,WebRTC,GetDisplayMedia,ScreenCaptureKit,DesktopCaptureKit,WebRTCPipeWireCapturer,MediaCapture,ScreenCapture',
        // Use shared session for localStorage/cookies persistence
        session: getSharedSession(),
      },
      resizable: true,
      minimizable: true,
      maximizable: true,
      closable: false,
      alwaysOnTop: true, // Keep on top of main window
      skipTaskbar: false,
      autoHideMenuBar: true,
      frame: true,
      transparent: false,
      hasShadow: true,
      thickFrame: true,
      titleBarStyle: 'default',
      movable: true,
      focusable: true,
      // Remove parent window relationship on Windows to allow proper resizing
      parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
      minWidth: 600,
      minHeight: 338,
      maxWidth: 1200,
      maxHeight: 720,
    });

    // Apply performance optimizations for screen share window
    try {
      // Optimize web contents for screen sharing
      screenShareWindow.webContents.setBackgroundThrottling(false);
      // Set high frame rate for smooth screen sharing
      screenShareWindow.webContents.setFrameRate(60);
      console.log('Screen share window performance optimizations applied');
    } catch (error) {
      console.warn('Failed to apply some performance optimizations:', error);
    }
    // Load the screen share window content
    const screenShareHtmlPath = path.join(
      app.isPackaged ? app.getAppPath() : process.cwd(),
      'dist',
      'renderer',
      'screen-share.html'
    );
    screenShareWindow.loadFile(screenShareHtmlPath);

    // Inject JavaScript to prevent fullscreen requests from web content
    screenShareWindow.webContents.on('did-finish-load', () => {
      if (screenShareWindow) {
        screenShareWindow.webContents.executeJavaScript(`
          // Prevent fullscreen API usage
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen = function() {
              console.log('Fullscreen request blocked');
              return Promise.reject(new Error('Fullscreen not allowed'));
            };
          }
          if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen = function() {
              console.log('Webkit fullscreen request blocked');
              return Promise.reject(new Error('Fullscreen not allowed'));
            };
          }
          if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen = function() {
              console.log('Mozilla fullscreen request blocked');
              return Promise.reject(new Error('Fullscreen not allowed'));
            };
          }
          if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen = function() {
              console.log('MS fullscreen request blocked');
              return Promise.reject(new Error('Fullscreen not allowed'));
            };
          }
          
          // Prevent screen orientation changes
          if (screen && screen.orientation && screen.orientation.lock) {
            screen.orientation.lock = function() {
              console.log('Screen orientation lock blocked');
              return Promise.reject(new Error('Orientation lock not allowed'));
            };
          }
          
          console.log('Fullscreen prevention script injected');
        `);
      }
    });

    // Initialize dev tools if in development
    if (isDev()) {
      screenShareWindow.webContents.openDevTools();
    }

    // Handle window events
    screenShareWindow.once('ready-to-show', () => {
      if (screenShareWindow && !screenShareWindow.isDestroyed()) {
        screenShareWindow.show();
        // Ensure window is not fullscreen and has correct size
        screenShareWindow.setFullScreen(false);
        screenShareWindow.setSize(600, 338);
        screenShareWindow.setPosition(x, y);
        // Don't set fullscreen or maximize - keep it as floating window
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          try {
            mainWindow.webContents.send('screen-share-window-opened');
          } catch (error) {
            console.error(
              'Error sending screen share window opened event:',
              error
            );
          }
        }
        screenShareWindowPid = screenShareWindow.webContents.getOSProcessId();
        screenShareWindowSettingUp = false;
        console.log('Screen share window ready and shown as floating window');
      }
    });

    // Handle window movement to keep it on top
    screenShareWindow.on('move', () => {
      if (screenShareWindow && !screenShareWindow.isDestroyed()) {
        // Ensure it stays on top
        screenShareWindow.setAlwaysOnTop(true);
      }
    });

    // Handle window resize start to ensure proper resizing
    screenShareWindow.on('will-resize', (event, newBounds) => {
      // Allow the resize to proceed
      event.preventDefault = () => {}; // Don't prevent the resize
    });

    // Handle window resize end to maintain proper state
    screenShareWindow.on('resized', () => {
      if (screenShareWindow && !screenShareWindow.isDestroyed()) {
        // Ensure window stays on top after resize
        screenShareWindow.setAlwaysOnTop(true);
        // Ensure window is properly focused and visible
        screenShareWindow.show();
      }
    });

    // // Handle window resize to maintain 16:9 aspect ratio and keep it on top
    // screenShareWindow.on('resize', () => {
    //   if (screenShareWindow && !screenShareWindow.isDestroyed()) {
    //     // Ensure it stays on top
    //     screenShareWindow.setAlwaysOnTop(true);

    //     // Maintain 16:9 aspect ratio
    //     const [width, height] = screenShareWindow.getSize();
    //     const targetAspectRatio = 16 / 9;
    //     const currentAspectRatio = width / height;

    //     if (Math.abs(currentAspectRatio - targetAspectRatio) > 0.1) {
    //       // If aspect ratio is significantly off, adjust height based on width
    //       const newHeight = Math.round(width / targetAspectRatio);
    //       screenShareWindow.setSize(width, newHeight);
    //     }
    //   }
    // });

    console.log('Screen share window created');
    return screenShareWindow;
  } catch (error) {
    console.error('Error creating screen share window:', error);
    screenShareWindowSettingUp = false;
    throw error;
  }
}

// Getter functions
function getScreenShareWindow(): BrowserWindow | null {
  return screenShareWindow;
}

function getScreenShareWindowConfig(): ScreenShareWindowConfig | null {
  return screenShareWindowConfig;
}

function isScreenShareWindowSettingUp(): boolean {
  return screenShareWindowSettingUp;
}

function closeScreenShareWindow(): void {
  if (screenShareWindow && !screenShareWindow.isDestroyed()) {
    safeCloseScreenShareWindow('manual close');
  }
}
function getScreenShareWindowPid(): number | null {
  return screenShareWindowPid;
}

// Export all functions
export {
  cleanupScreenShareWindowResources,
  safeCloseScreenShareWindow,
  createScreenShareWindow,
  getScreenShareWindow,
  getScreenShareWindowConfig,
  isScreenShareWindowSettingUp,
  closeScreenShareWindow,
  getScreenShareWindowPid,
};
