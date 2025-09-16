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
        console.log(
          'Could not send cleanup signal to screen share window:',
          (error as Error).message
        );
      }
    }
  } catch (error) {
    console.error('Error during screen share window cleanup:', error);
  }
}

function safeCloseScreenShareWindow(reason: string = 'unknown'): boolean {
  try {
    if (screenShareWindow && !screenShareWindow.isDestroyed()) {
      cleanupScreenShareWindowResources();

      if (
        screenShareWindow.webContents &&
        screenShareWindow.webContents.isLoading()
      ) {
        let loadTimeout = setTimeout(() => {
          proceedWithClose();
        }, 2000);

        screenShareWindow.webContents.once('did-finish-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });

        screenShareWindow.webContents.once('did-fail-load', () => {
          clearTimeout(loadTimeout);
          proceedWithClose();
        });

        return true;
      } else {
        return proceedWithClose();
      }

      function proceedWithClose(): boolean {
        try {
          screenShareWindow?.close();

          setTimeout(() => {
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

            screenShareWindow = null;
            screenShareWindowSettingUp = false;
            screenShareWindowConfig = null;
            screenShareWindowPid = null;
          }, 100);
          return true;
        } catch (error) {
          console.error('Error during screen share window close:', error);
          return false;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error in safeCloseScreenShareWindow:', error);
    return false;
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
      safeCloseScreenShareWindow('recreating');
    }

    screenShareWindowSettingUp = true;
    screenShareWindowConfig = { ...screenShareConfig };

    // Get main window bounds for positioning
    const { getMainWindow } = require('./windowManager');
    const mainWindow = getMainWindow();

    // Calculate window dimensions and position for 16:9 aspect ratio with larger default size
    const baseWidth = 1200; // Larger base width for screen share window
    const windowWidth = baseWidth;
    const windowHeight = Math.round((baseWidth * 9) / 16); // 16:9 aspect ratio

    let x: number, y: number;

    // Center the window on screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;
    x = Math.floor((screenWidth - windowWidth) / 2);
    y = Math.floor((screenHeight - windowHeight) / 2);

    // Create the screen share window
    screenShareWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      title: 'Astra - Screen Share',
      show: false,
      fullscreen: false, // Explicitly prevent fullscreen
      webPreferences: {
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
      thickFrame: process.platform === 'win32' ? true : false, // Enable thickFrame on Windows for proper resizing
      titleBarStyle: 'default',
      movable: true,
      focusable: true,
      // Remove parent window relationship on Windows to allow proper resizing
      parent:
        process.platform === 'win32'
          ? undefined
          : mainWindow && !mainWindow.isDestroyed()
            ? mainWindow
            : undefined,
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
        screenShareWindow.setSize(windowWidth, windowHeight);
        screenShareWindow.setPosition(x, y);
        // Don't set fullscreen or maximize - keep it as floating window
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
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
