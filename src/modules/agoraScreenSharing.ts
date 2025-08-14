import { BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import { getStreamWindow } from './streamWindow';
import { agoraManager } from './agoraManager';

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail?: Electron.NativeImage;
  display_id?: string;
  appIcon?: Electron.NativeImage;
}

export interface ScreenSharingState {
  isSharing: boolean;
  sourceId: string | null;
  sourceName: string | null;
}

class AgoraScreenSharingManager {
  private currentState: ScreenSharingState = {
    isSharing: false,
    sourceId: null,
    sourceName: null,
  };

  private screenSharingActive: boolean = false;
  private useAgoraSDK: boolean = true; // Flag to control whether to use Agora SDK or fallback

  constructor() {
    this.setupIpcHandlers();
    this.checkAgoraSupport();
  }

  private checkAgoraSupport() {
    try {
      // Check if the centralized Agora manager is initialized and supports screen capture
      if (
        agoraManager.isEngineInitialized() &&
        agoraManager.isScreenCaptureSupported()
      ) {
        console.log('Agora screen capture is supported');
        this.useAgoraSDK = true;
      } else {
        console.log(
          'Agora screen capture not supported, using native fallback'
        );
        this.useAgoraSDK = false;
      }
    } catch (error) {
      console.error(
        'Failed to check Agora support, falling back to native screen sharing:',
        error
      );
      this.useAgoraSDK = false;
    }
  }

  private async getScreenSourcesNative(): Promise<ScreenSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 1040, height: 585 },
        fetchWindowIcons: true,
      });

      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail,
        display_id: source.display_id,
        appIcon: source.appIcon,
      }));
    } catch (error) {
      console.error('Error getting native screen sources:', error);
      return [];
    }
  }

  private setupIpcHandlers() {
    // Get available screen sources using Agora's screen sharing API
    ipcMain.handle('get-screen-sources', async () => {
      try {
        console.log('Requesting screen sources...');

        if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
          // Try Agora SDK first
          try {
            const sources = agoraManager.getScreenCaptureSources(
              { width: 1040, height: 585 } // Thumbnail size
            );

            console.log('Available Agora screen sources:', sources.length);

            // Transform Agora sources to our format
            const transformedSources = sources.map(
              (source: any, index: number) => ({
                id: String(source.sourceId || `source-${index}`),
                name: source.sourceName || `Screen ${index + 1}`,
                display_id: String(source.sourceId || ''),
                hasThumbnail: true,
                type: source.type,
                sourceId: source.sourceId,
              })
            );

            return transformedSources;
          } catch (agoraError) {
            console.error(
              'Agora SDK failed, falling back to native screen sharing:',
              agoraError
            );
            this.useAgoraSDK = false;
          }
        }

        // Fallback to native screen sharing
        console.log('Using native screen sharing fallback');
        return await this.getScreenSourcesNative();
      } catch (error) {
        console.error('Error getting screen sources:', error);
        return [];
      }
    });

    // Request screen sharing permission
    ipcMain.handle('request-screen-permission', async () => {
      try {
        // For native screen sharing, permissions are handled by the system
        return { granted: true };
      } catch (error) {
        console.error('Error requesting screen permission:', error);
        return {
          granted: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Start screen sharing with specific source
    ipcMain.handle('start-screen-sharing', async (event, sourceId: string) => {
      try {
        const streamWindow = getStreamWindow();
        if (!streamWindow || streamWindow.isDestroyed()) {
          throw new Error('Stream window not available');
        }

        if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
          // Try Agora SDK first
          try {
            const sources = agoraManager.getScreenCaptureSources({
              width: 1040,
              height: 585,
            });

            const targetSource = sources.find(
              (s: any) => String(s.sourceId) === sourceId
            );
            if (!targetSource) {
              throw new Error('Screen source not found');
            }

            // Start screen capture based on source type
            if (targetSource.type === 0) {
              // Screen type
              agoraManager.startScreenCaptureByDisplayId(
                targetSource.sourceId,
                {}, // Region
                {
                  dimensions: { width: 1920, height: 1080 },
                  frameRate: 30,
                  bitrate: 3000,
                  captureMouseCursor: true,
                  excludeWindowList: [],
                  excludeWindowCount: 0,
                  highLightWidth: 0,
                  highLightColor: 0xff8cbf26,
                  enableHighLight: false,
                }
              );
            } else {
              agoraManager.startScreenCaptureByWindowId(
                targetSource.sourceId,
                {}, // Region
                {
                  dimensions: { width: 1920, height: 1080 },
                  frameRate: 30,
                  bitrate: 3000,
                  windowFocus: false,
                  highLightWidth: 0,
                  highLightColor: 0xff8cbf26,
                  enableHighLight: false,
                }
              );
            }

            // Update state
            this.currentState = {
              isSharing: true,
              sourceId: sourceId,
              sourceName: targetSource.sourceName || `Screen ${sourceId}`,
            };

            this.screenSharingActive = true;

            // Send the source ID to the React component via IPC
            streamWindow.webContents.send(
              'stream-control',
              'start-screen-sharing',
              {
                sourceId: sourceId,
                sourceName: targetSource.sourceName || `Screen ${sourceId}`,
              }
            );

            // Disable video stream publishing when screen sharing is active
            streamWindow.webContents.send(
              'stream-control',
              'disable-video-stream'
            );

            console.log('Screen sharing started successfully with Agora');
            return {
              success: true,
              sourceId: sourceId,
              sourceName: targetSource.sourceName || `Screen ${sourceId}`,
            };
          } catch (agoraError) {
            console.error(
              'Agora SDK failed, falling back to native screen sharing:',
              agoraError
            );
            this.useAgoraSDK = false;
          }
        }

        // Fallback to native screen sharing
        console.log('Using native screen sharing fallback');

        // For native screen sharing, we just send the source ID to the renderer
        // The renderer will handle the actual screen capture using getUserMedia
        this.currentState = {
          isSharing: true,
          sourceId: sourceId,
          sourceName: `Screen ${sourceId}`,
        };

        this.screenSharingActive = true;

        // Send the source ID to the React component via IPC
        streamWindow.webContents.send(
          'stream-control',
          'start-screen-sharing',
          {
            sourceId: sourceId,
            sourceName: `Screen ${sourceId}`,
          }
        );

        // Disable video stream publishing when screen sharing is active
        streamWindow.webContents.send('stream-control', 'disable-video-stream');

        console.log('Native screen sharing started successfully');
        return {
          success: true,
          sourceId: sourceId,
          sourceName: `Screen ${sourceId}`,
        };
      } catch (error) {
        console.error('Error starting screen sharing:', error);
        throw error;
      }
    });

    // Stop screen sharing
    ipcMain.handle('stop-screen-sharing', async () => {
      try {
        const streamWindow = getStreamWindow();
        if (streamWindow && !streamWindow.isDestroyed()) {
          // Send stop command to stream window
          streamWindow.webContents.send(
            'stream-control',
            'stop-screen-sharing'
          );

          // Re-enable video stream publishing when screen sharing stops
          streamWindow.webContents.send(
            'stream-control',
            'enable-video-stream'
          );
        }

        // Stop the screen capture
        if (this.screenSharingActive) {
          if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
            try {
              agoraManager.stopScreenCapture();
            } catch (stopError) {
              console.error('Error stopping Agora screen capture:', stopError);
            }
          }
          this.screenSharingActive = false;
        }

        // Update state
        this.currentState = {
          isSharing: false,
          sourceId: null,
          sourceName: null,
        };

        console.log('Screen sharing stopped successfully');
        return { success: true };
      } catch (error) {
        console.error('Error stopping screen sharing:', error);
        throw error;
      }
    });

    // Get current screen sharing state
    ipcMain.handle('get-screen-sharing-state', () => {
      return this.currentState;
    });

    // Get screen sharing stream for specific source
    ipcMain.handle(
      'get-screen-sharing-stream',
      async (event, sourceId: string) => {
        try {
          console.log('Getting screen sharing stream for source ID:', sourceId);

          if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
            try {
              const sources = agoraManager.getScreenCaptureSources({
                width: 1040,
                height: 585,
              });

              const targetSource = sources.find(
                (s: any) => String(s.sourceId) === sourceId
              );
              if (!targetSource) {
                throw new Error('Screen source not found');
              }

              return {
                success: true,
                sourceId: sourceId,
                sourceName: targetSource.sourceName || `Screen ${sourceId}`,
                type: targetSource.type,
              };
            } catch (agoraError) {
              console.error('Agora SDK failed:', agoraError);
              this.useAgoraSDK = false;
            }
          }

          // Fallback to native screen sharing
          return {
            success: true,
            sourceId: sourceId,
            sourceName: `Screen ${sourceId}`,
            type: 'native',
          };
        } catch (error) {
          console.error('Error getting screen sharing stream:', error);
          throw error;
        }
      }
    );

    // Test screen sharing functionality
    ipcMain.handle('test-screen-sharing', async () => {
      try {
        console.log('Testing screen sharing functionality...');

        if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
          try {
            const sources = agoraManager.getScreenCaptureSources({
              width: 1040,
              height: 585,
            });

            const testResults = {
              totalSources: sources.length,
              hasAgoraEngine: agoraManager.isEngineInitialized(),
              hasScreenCaptureSupport: agoraManager.isScreenCaptureSupported(),
              usingAgoraSDK: true,
              sources: sources.map((s: any) => ({
                id: String(s.sourceId),
                name: s.sourceName,
                type: s.type,
              })),
            };

            console.log('Agora screen sharing test results:', testResults);

            return {
              success: true,
              results: testResults,
              message:
                sources.length > 0
                  ? 'Screen sources detected successfully via Agora'
                  : 'No screen sources found via Agora',
            };
          } catch (agoraError) {
            console.error(
              'Agora SDK test failed, testing native fallback:',
              agoraError
            );
            this.useAgoraSDK = false;
          }
        }

        // Test native screen sharing
        const nativeSources = await this.getScreenSourcesNative();
        const testResults = {
          totalSources: nativeSources.length,
          hasAgoraEngine: agoraManager.isEngineInitialized(),
          hasScreenCaptureSupport: true,
          usingAgoraSDK: false,
          sources: nativeSources.map(s => ({
            id: s.id,
            name: s.name,
            type: s.display_id ? 'screen' : 'window',
          })),
        };

        console.log('Native screen sharing test results:', testResults);

        return {
          success: true,
          results: testResults,
          message:
            nativeSources.length > 0
              ? 'Screen sources detected successfully via native API'
              : 'No screen sources found via native API',
        };
      } catch (error) {
        console.error('Error testing screen sharing:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to test screen sharing functionality',
        };
      }
    });
  }

  // Public methods for external use
  public async getScreenSources(): Promise<ScreenSource[]> {
    try {
      if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
        try {
          const sources = agoraManager.getScreenCaptureSources({
            width: 1040,
            height: 585,
          });

          return sources.map((source: any, index: number) => ({
            id: String(source.sourceId || `source-${index}`),
            name: source.sourceName || `Screen ${index + 1}`,
            display_id: String(source.sourceId || ''),
            hasThumbnail: true,
          }));
        } catch (agoraError) {
          console.error(
            'Agora SDK failed, falling back to native:',
            agoraError
          );
          this.useAgoraSDK = false;
        }
      }

      // Fallback to native screen sharing
      return await this.getScreenSourcesNative();
    } catch (error) {
      console.error('Error getting screen sources:', error);
      return [];
    }
  }

  public async showDesktopCapturer(): Promise<{
    success: boolean;
    sources: ScreenSource[];
  }> {
    try {
      const streamWindow = getStreamWindow();
      if (!streamWindow || streamWindow.isDestroyed()) {
        throw new Error('Stream window not available');
      }

      // Get available sources
      const sources = await this.getScreenSources();

      return { success: true, sources };
    } catch (error) {
      console.error('Error showing desktop capturer:', error);
      return { success: false, sources: [] };
    }
  }

  public async startScreenSharing(
    sourceId: string
  ): Promise<{ success: boolean; sourceId: string; sourceName: string }> {
    try {
      const streamWindow = getStreamWindow();
      if (!streamWindow || streamWindow.isDestroyed()) {
        throw new Error('Stream window not available');
      }

      if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
        try {
          const sources = agoraManager.getScreenCaptureSources({
            width: 1040,
            height: 585,
          });

          const targetSource = sources.find(
            (s: any) => String(s.sourceId) === sourceId
          );
          if (!targetSource) {
            throw new Error('Screen source not found');
          }

          // Start screen capture based on source type
          if (targetSource.type === 0) {
            // Screen type
            agoraManager.startScreenCaptureByDisplayId(
              targetSource.sourceId,
              {},
              {
                dimensions: { width: 1920, height: 1080 },
                frameRate: 30,
                bitrate: 3000,
                captureMouseCursor: true,
                excludeWindowList: [],
                excludeWindowCount: 0,
                highLightWidth: 0,
                highLightColor: 0xff8cbf26,
                enableHighLight: false,
              }
            );
          } else {
            agoraManager.startScreenCaptureByWindowId(
              targetSource.sourceId,
              {},
              {
                dimensions: { width: 1920, height: 1080 },
                frameRate: 30,
                bitrate: 3000,
                windowFocus: false,
                highLightWidth: 0,
                highLightColor: 0xff8cbf26,
                enableHighLight: false,
              }
            );
          }

          this.currentState = {
            isSharing: true,
            sourceId: sourceId,
            sourceName: targetSource.sourceName || `Screen ${sourceId}`,
          };

          this.screenSharingActive = true;

          // Send to stream window
          streamWindow.webContents.send('screen-source-selected', {
            sourceId: sourceId,
            sourceName: targetSource.sourceName || `Screen ${sourceId}`,
          });

          // Disable video stream publishing when screen sharing is active
          streamWindow.webContents.send(
            'stream-control',
            'disable-video-stream'
          );

          return {
            success: true,
            sourceId: sourceId,
            sourceName: targetSource.sourceName || `Screen ${sourceId}`,
          };
        } catch (agoraError) {
          console.error(
            'Agora SDK failed, falling back to native:',
            agoraError
          );
          this.useAgoraSDK = false;
        }
      }

      // Fallback to native screen sharing
      this.currentState = {
        isSharing: true,
        sourceId: sourceId,
        sourceName: `Screen ${sourceId}`,
      };

      this.screenSharingActive = true;

      // Send to stream window
      streamWindow.webContents.send('screen-source-selected', {
        sourceId: sourceId,
        sourceName: `Screen ${sourceId}`,
      });

      // Disable video stream publishing when screen sharing is active
      streamWindow.webContents.send('stream-control', 'disable-video-stream');

      return {
        success: true,
        sourceId: sourceId,
        sourceName: `Screen ${sourceId}`,
      };
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      throw error;
    }
  }

  public async stopScreenSharing(): Promise<{ success: boolean }> {
    try {
      const streamWindow = getStreamWindow();
      if (streamWindow && !streamWindow.isDestroyed()) {
        streamWindow.webContents.send('stream-control', 'stop-screen-sharing');

        // Re-enable video stream publishing when screen sharing stops
        streamWindow.webContents.send('stream-control', 'enable-video-stream');
      }

      // Stop the screen capture
      if (this.screenSharingActive) {
        if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
          try {
            agoraManager.stopScreenCapture();
          } catch (stopError) {
            console.error('Error stopping Agora screen capture:', stopError);
          }
        }
        this.screenSharingActive = false;
      }

      this.currentState = {
        isSharing: false,
        sourceId: null,
        sourceName: null,
      };

      return { success: true };
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      throw error;
    }
  }

  public getCurrentState(): ScreenSharingState {
    return { ...this.currentState };
  }

  // Check if screen sharing is currently active
  public isScreenSharingActive(): boolean {
    return this.screenSharingActive;
  }

  // Check if using Agora SDK or native fallback
  public isUsingAgoraSDK(): boolean {
    return this.useAgoraSDK;
  }

  // Cleanup method
  public cleanup() {
    if (this.screenSharingActive) {
      if (this.useAgoraSDK && agoraManager.isEngineInitialized()) {
        try {
          agoraManager.stopScreenCapture();
        } catch (error) {
          console.error('Error stopping screen capture during cleanup:', error);
        }
      }
      this.screenSharingActive = false;
    }
  }
}

// Create singleton instance
const agoraScreenSharingManager = new AgoraScreenSharingManager();

export { agoraScreenSharingManager };
export default agoraScreenSharingManager;
