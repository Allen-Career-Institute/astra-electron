import {
  createAgoraRtcEngine,
  IRtcEngineEx,
  ChannelProfileType,
} from 'agora-electron-sdk';

class AgoraManager {
  private static instance: AgoraManager;
  private engine: IRtcEngineEx | null = null;
  private isInitialized: boolean = false;
  private appId: string | null = null;

  private constructor() {}

  public static getInstance(): AgoraManager {
    if (!AgoraManager.instance) {
      AgoraManager.instance = new AgoraManager();
    }
    return AgoraManager.instance;
  }

  public initialize(appId: string): IRtcEngineEx {
    if (this.isInitialized && this.engine) {
      console.log('Agora engine already initialized');
      return this.engine;
    }

    try {
      console.log('Initializing Agora engine...');

      // Create the engine instance
      this.engine = createAgoraRtcEngine() as IRtcEngineEx;

      // Initialize with proper configuration
      this.engine.initialize({
        appId,
        logConfig: {
          filePath: '',
          level: 0x0000, // INFO level
        },
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      this.appId = appId;
      this.isInitialized = true;

      console.log('Agora engine initialized successfully');
      return this.engine;
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
      throw error;
    }
  }

  public getEngine(): IRtcEngineEx | null {
    return this.engine;
  }

  public isEngineInitialized(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  public getAppId(): string | null {
    return this.appId;
  }

  public release(): void {
    if (this.engine) {
      try {
        this.engine.release();
        console.log('Agora engine released successfully');
      } catch (error) {
        console.error('Error releasing Agora engine:', error);
      }
      this.engine = null;
      this.isInitialized = false;
      this.appId = null;
    }
  }

  // Method to check if screen capture is supported
  public isScreenCaptureSupported(): boolean {
    if (!this.engine) {
      return false;
    }

    try {
      // Check if screen capture methods are available
      return (
        typeof this.engine.getScreenCaptureSources === 'function' &&
        typeof this.engine.startScreenCaptureByDisplayId === 'function' &&
        typeof this.engine.startScreenCaptureByWindowId === 'function'
      );
    } catch (error) {
      console.error('Error checking screen capture support:', error);
      return false;
    }
  }

  // Method to get screen capture sources
  public getScreenCaptureSources(
    thumbnailSize: { width: number; height: number } = {
      width: 1040,
      height: 585,
    }
  ) {
    if (!this.engine || !this.isScreenCaptureSupported()) {
      throw new Error('Screen capture not supported or engine not initialized');
    }

    try {
      return this.engine.getScreenCaptureSources(
        thumbnailSize,
        { width: 64, height: 64 }, // Icon size
        true // Include icon
      );
    } catch (error) {
      console.error('Error getting screen capture sources:', error);
      throw error;
    }
  }

  // Method to start screen capture by display ID
  public startScreenCaptureByDisplayId(
    displayId: number | undefined,
    regionRect: any = {},
    captureParams: any = {}
  ) {
    if (!this.engine || !this.isScreenCaptureSupported()) {
      throw new Error('Screen capture not supported or engine not initialized');
    }

    if (displayId === undefined) {
      throw new Error('Display ID is undefined');
    }

    try {
      const defaultParams = {
        dimensions: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 3000,
        captureMouseCursor: true,
        excludeWindowList: [],
        excludeWindowCount: 0,
        highLightWidth: 0,
        highLightColor: 0xff8cbf26,
        enableHighLight: false,
      };

      const finalParams = { ...defaultParams, ...captureParams };

      return this.engine.startScreenCaptureByDisplayId(
        displayId,
        regionRect,
        finalParams
      );
    } catch (error) {
      console.error('Error starting screen capture by display ID:', error);
      throw error;
    }
  }

  // Method to start screen capture by window ID
  public startScreenCaptureByWindowId(
    windowId: number | undefined,
    regionRect: any = {},
    captureParams: any = {}
  ) {
    if (!this.engine || !this.isScreenCaptureSupported()) {
      throw new Error('Screen capture not supported or engine not initialized');
    }

    if (windowId === undefined) {
      throw new Error('Window ID is undefined');
    }

    try {
      const defaultParams = {
        dimensions: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 3000,
        windowFocus: false,
        highLightWidth: 0,
        highLightColor: 0xff8cbf26,
        enableHighLight: false,
      };

      const finalParams = { ...defaultParams, ...captureParams };

      return this.engine.startScreenCaptureByWindowId(
        windowId,
        regionRect,
        finalParams
      );
    } catch (error) {
      console.error('Error starting screen capture by window ID:', error);
      throw error;
    }
  }

  // Method to stop screen capture
  public stopScreenCapture() {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    try {
      return this.engine.stopScreenCapture();
    } catch (error) {
      console.error('Error stopping screen capture:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const agoraManager = AgoraManager.getInstance();
export default agoraManager;
