import { desktopCapturer, BrowserWindow, ipcMain } from 'electron';
import { getStreamWindow } from './streamWindow';

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: Electron.NativeImage;
  display_id: string;
  appIcon?: Electron.NativeImage;
}

export interface ScreenSharingState {
  isSharing: boolean;
  sourceId: string | null;
  sourceName: string | null;
}

class ScreenSharingManager {
  private currentState: ScreenSharingState = {
    isSharing: false,
    sourceId: null,
    sourceName: null,
  };

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    // Get available screen sources
    ipcMain.handle('get-screen-sources', async () => {
      try {
        console.log('Requesting screen sources with comprehensive options...');

        // Get both screens and windows with comprehensive options
        // Include all possible source types to capture Chrome browser windows
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 300, height: 200 },
          fetchWindowIcons: true,
        });

        console.log('Available sources:', sources.length);
        console.log('Source types found:', [
          ...new Set(sources.map(s => (s.display_id ? 'screen' : 'window'))),
        ]);

        sources.forEach((source, index) => {
          console.log(`Source ${index + 1}:`, {
            id: source.id,
            name: source.name,
            display_id: source.display_id,
            hasThumbnail: !!source.thumbnail,
            type: source.display_id ? 'Screen' : 'Window',
            // Check if it's a Chrome window
            isChrome:
              source.name.toLowerCase().includes('chrome') ||
              source.name.toLowerCase().includes('google'),
          });
        });

        // Log Chrome-specific sources
        const chromeSources = sources.filter(
          s =>
            s.name.toLowerCase().includes('chrome') ||
            s.name.toLowerCase().includes('google')
        );
        console.log('Chrome-related sources found:', chromeSources.length);
        chromeSources.forEach(source => {
          console.log('Chrome source:', source.name, source.id);
        });

        return sources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail,
          display_id: source.display_id,
          appIcon: source.appIcon,
        }));
      } catch (error) {
        console.error('Error getting screen sources:', error);
        throw error;
      }
    });

    // Request screen sharing permission
    ipcMain.handle('request-screen-permission', async () => {
      try {
        // On macOS, this will trigger the system permission dialog
        // The actual permission check happens when trying to capture
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

        // Find the source details
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 150, height: 150 },
          fetchWindowIcons: true,
        });

        const source = sources.find(s => s.id === sourceId);
        if (!source) {
          throw new Error('Screen source not found');
        }

        // Update state
        this.currentState = {
          isSharing: true,
          sourceId: source.id,
          sourceName: source.name,
        };

        // Send the source ID directly to the React component via IPC
        streamWindow.webContents.send(
          'stream-control',
          'start-screen-sharing',
          {
            sourceId: source.id,
            sourceName: source.name,
          }
        );

        return { success: true, sourceId: source.id, sourceName: source.name };
      } catch (error) {
        console.error('Error starting screen sharing:', error);
        throw error;
      }
    });

    // Show desktop capturer dialog and get user selection
    ipcMain.handle('show-desktop-capturer', async event => {
      try {
        const streamWindow = getStreamWindow();
        if (!streamWindow || streamWindow.isDestroyed()) {
          throw new Error('Stream window not available');
        }

        // Get available sources
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 150, height: 150 },
          fetchWindowIcons: true,
        });

        // Return sources directly - no need to send IPC event for custom dialog
        return { success: true, sources };
      } catch (error) {
        console.error('Error showing desktop capturer:', error);
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
        }

        // Update state
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
          console.log('Getting stream for source ID:', sourceId);

          // Get the source details to verify it exists
          const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 300, height: 200 },
            fetchWindowIcons: true,
          });

          const source = sources.find(s => s.id === sourceId);
          if (!source) {
            throw new Error('Screen source not found');
          }

          console.log('Found source:', source.name);

          // Return the source ID - the actual stream will be created in the renderer
          return {
            success: true,
            sourceId: source.id,
            sourceName: source.name,
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

        // Get all available sources
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 300, height: 200 },
          fetchWindowIcons: true,
        });

        // Analyze the sources
        const screenSources = sources.filter(s => s.display_id);
        const windowSources = sources.filter(s => !s.display_id);
        const chromeSources = sources.filter(
          s =>
            s.name.toLowerCase().includes('chrome') ||
            s.name.toLowerCase().includes('google')
        );

        const testResults = {
          totalSources: sources.length,
          screenSources: screenSources.length,
          windowSources: windowSources.length,
          chromeSources: chromeSources.length,
          chromeSourceNames: chromeSources.map(s => s.name),
          allSourceNames: sources.map(s => s.name),
          hasChromeWindows: chromeSources.length > 0,
        };

        console.log('Screen sharing test results:', testResults);

        return {
          success: true,
          results: testResults,
          message:
            chromeSources.length > 0
              ? 'Chrome windows detected successfully'
              : 'No Chrome windows found - this might be a permission or configuration issue',
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
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 150, height: 150 },
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
      console.error('Error getting screen sources:', error);
      throw error;
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

      // Return sources directly - no need to send IPC event for custom dialog
      return { success: true, sources };
    } catch (error) {
      console.error('Error showing desktop capturer:', error);
      throw error;
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

      const sources = await this.getScreenSources();
      const source = sources.find(s => s.id === sourceId);
      if (!source) {
        throw new Error('Screen source not found');
      }

      this.currentState = {
        isSharing: true,
        sourceId: source.id,
        sourceName: source.name,
      };

      // Send to stream window
      streamWindow.webContents.send('screen-source-selected', {
        sourceId: source.id,
        sourceName: source.name,
      });

      return { success: true, sourceId: source.id, sourceName: source.name };
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
}

// Create singleton instance
const screenSharingManager = new ScreenSharingManager();

export { screenSharingManager };
export default screenSharingManager;
