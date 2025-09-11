import createAgoraRtcEngine, {
  ChannelProfileType,
  IRtcEngineEx,
  ScreenCaptureSourceInfo,
  ScreenCaptureSourceType,
} from 'agora-electron-sdk';
import { ScreenShareWindowConfig } from '../../modules/screenShareWindow';

export interface AgoraConfig {
  config: {
    appId: string;
    channel: string;
    token?: string;
    uid: number;
  };
  meetingId: string;
}

export interface ScreenSource {
  id: string;
  name: string;
  title: string;
  type: ScreenCaptureSourceType;
  thumbnail: string; // Data URL string
  displayId: string;
  appIcon?: string; // Data URL string
}

export interface RTCStats {
  timestamp: number;
  audioLevel: number;
  videoBitrate: number;
  audioBitrate: number;
  videoResolution: { width: number; height: number };
  frameRate: number;
  packetLossRate: number;
  rtt: number;
  jitter: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface AgoraScreenShareState {
  isInitialized: boolean;
  isJoined: boolean;
  isPublishing: boolean;
  selectedSourceId: number | null;
  selectedSourceType: ScreenCaptureSourceType | null;
  selectedSourceName: string | null;
  config: ScreenShareWindowConfig | null;
  rtcStats: RTCStats | null;
}

class AgoraScreenShareService {
  private state: AgoraScreenShareState = {
    isInitialized: false,
    isJoined: false,
    isPublishing: false,
    selectedSourceId: null,
    selectedSourceType: null,
    selectedSourceName: null,
    config: null,
    rtcStats: null,
  };

  private agoraEngine: IRtcEngineEx | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {}

  private async initializeAgoraEngine(
    config: ScreenShareWindowConfig
  ): Promise<void> {
    try {
      if (this.agoraEngine) {
        return;
      }

      this.agoraEngine = createAgoraRtcEngine();

      console.log('createAgoraRtcEngine', this.agoraEngine);

      // Initialize with default settings
      const ret = this.agoraEngine.initialize({
        appId: config.app_id,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
      console.log('initialize', ret);

      if (ret !== 0) {
        throw new Error(`Failed to initialize Agora engine: ${ret}`);
      }

      // Set up event listeners
      this.setupEventListeners();

      this.state.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Agora engine:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.agoraEngine) return;

    // Connection state change
  }

  private updateRTCStats(type: 'video' | 'audio', stats: any): void {
    if (!this.state.rtcStats) {
      this.state.rtcStats = {
        timestamp: Date.now(),
        audioLevel: 0,
        videoBitrate: 0,
        audioBitrate: 0,
        videoResolution: { width: 0, height: 0 },
        frameRate: 0,
        packetLossRate: 0,
        rtt: 0,
        jitter: 0,
        cpuUsage: 0,
        memoryUsage: 0,
      };
    }

    if (type === 'video') {
      this.state.rtcStats.videoBitrate = stats.sentBitrate || 0;
      this.state.rtcStats.videoResolution = {
        width: stats.encodedFrameWidth || 0,
        height: stats.encodedFrameHeight || 0,
      };
      this.state.rtcStats.frameRate = stats.sentFrameRate || 0;
    } else if (type === 'audio') {
      this.state.rtcStats.audioBitrate = stats.sentBitrate || 0;
      this.state.rtcStats.audioLevel = stats.audioLevel || 0;
    }

    this.state.rtcStats.timestamp = Date.now();
  }

  public async initialize(config: ScreenShareWindowConfig): Promise<void> {
    try {
      await this.initializeAgoraEngine(config);
      this.state.config = config;
    } catch (error) {
      console.error('Error initializing Agora service:', error);
      throw error;
    }
  }

  public async joinChannel(): Promise<void> {
    try {
      if (!this.agoraEngine || !this.state.config) {
        throw new Error('Agora engine not initialized or config not set');
      }

      const ret = this.agoraEngine.joinChannel(
        this.state.config.user_token || '',
        this.state.config.meetingId,
        parseInt(this.state.config.user_id),
        {
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        }
      );

      if (ret !== 0) {
        throw new Error(`Failed to join channel: ${ret}`);
      }

      this.state.isJoined = true;
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  public async leaveChannel(): Promise<void> {
    try {
      if (!this.agoraEngine || !this.state.isJoined) {
        return;
      }

      const ret = this.agoraEngine.leaveChannel();
      if (ret !== 0) {
        throw new Error(`Failed to leave channel: ${ret}`);
      }

      this.state.isJoined = false;
      this.state.isPublishing = false;
      this.stopStatsMonitoring();
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  }

  public async getScreenSources(): Promise<ScreenSource[]> {
    try {
      console.log('getScreenSources', this.agoraEngine);
      const agoraSources = this.agoraEngine?.getScreenCaptureSources(
        {
          width: 800,
          height: 800,
        },
        {
          width: 400,
          height: 400,
        },
        true
      );
      if (!agoraSources) {
        return [];
      }

      // Convert Agora ScreenCaptureSourceInfo to ScreenSource format
      const convertedSources: ScreenSource[] = agoraSources.map(source => {
        let thumbnailDataUrl = '';

        // Convert thumbnail from ThumbImageBuffer to data URL
        if (
          source.thumbImage?.buffer &&
          source.thumbImage?.width &&
          source.thumbImage?.height
        ) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Set canvas dimensions to match the thumbnail
            canvas.width = source.thumbImage.width;
            canvas.height = source.thumbImage.height;

            // Convert Uint8Array to ImageData
            // The buffer is in ARGB format according to Agora docs
            const imageData = new ImageData(
              new Uint8ClampedArray(source.thumbImage.buffer),
              source.thumbImage.width,
              source.thumbImage.height
            );
            ctx.putImageData(imageData, 0, 0);
            thumbnailDataUrl = canvas.toDataURL();
          }
        }

        return {
          id: source.sourceId?.toString() || '',
          type:
            source.type ||
            ScreenCaptureSourceType.ScreencapturesourcetypeUnknown,
          name: source.sourceName || 'Unknown Source',
          title: source.sourceTitle || '',
          thumbnail: thumbnailDataUrl,
          displayId: source.sourceDisplayId?.toString() || '', // Using sourceId as display_id
          appIcon: undefined, // Agora doesn't provide app icons
        };
      });

      console.log('getScreenSources converted', convertedSources);
      return convertedSources;
    } catch (error) {
      console.error('Error getting screen sources:', error);
      throw error;
    }
  }

  public async selectScreenSource(
    sourceId: string,
    autoSelect: boolean = false
  ): Promise<void> {
    try {
      const sources = (await this.getScreenSources()) ?? [];
      const source = sources.find(s => s.id === sourceId);

      if (!source) {
        throw new Error('Screen source not found');
      }

      this.state.selectedSourceId = parseInt(sourceId);
      this.state.selectedSourceType = source.type;
      this.state.selectedSourceName = source.name || '';
    } catch (error) {
      console.error('Error selecting screen source:', error);
      throw error;
    }
  }

  public async autoSelectScreenSource(): Promise<string | null> {
    try {
      const sources = (await this.getScreenSources()) ?? [];

      // Prefer screen sources over window sources
      const screenSources = sources.filter(s => s?.name?.includes('Screen'));
      const windowSources = sources.filter(s => !s?.name?.includes('Screen'));

      const preferredSources = [...screenSources, ...windowSources];

      if (preferredSources.length === 0) {
        throw new Error('No screen sources available');
      }

      const selectedSource = preferredSources[0];
      await this.selectScreenSource(selectedSource.id || '', true);

      console.log('Auto-selected screen source:', selectedSource.name);
      return selectedSource.id || null;
    } catch (error) {
      console.error('Error auto-selecting screen source:', error);
      return null;
    }
  }

  public async publishScreenShare(): Promise<void> {
    try {
      if (
        !this.agoraEngine ||
        !this.state.isJoined ||
        !this.state.selectedSourceId
      ) {
        throw new Error('Agora engine not ready or screen source not selected');
      }

      // Enable local video for screen sharing
      const enableVideoRet = this.agoraEngine.enableLocalVideo(true);
      if (enableVideoRet !== 0) {
        throw new Error(`Failed to enable local video: ${enableVideoRet}`);
      }

      // Start screen capture
      let startCaptureRet = 0;
      if (
        this.state.selectedSourceType ===
        ScreenCaptureSourceType.ScreencapturesourcetypeWindow
      ) {
        startCaptureRet = this.agoraEngine.startScreenCaptureByWindowId(
          this.state.selectedSourceId!,
          {},
          {
            dimensions: { width: 800, height: 800 },
            frameRate: 30,
            bitrate: 1000000,
            captureMouseCursor: false,
            excludeWindowList: [],
            excludeWindowCount: 0,
            highLightWidth: 2,
            highLightColor: 0x000000,
            enableHighLight: true,
          }
        );
      } else if (
        this.state.selectedSourceType ===
        ScreenCaptureSourceType.ScreencapturesourcetypeScreen
      ) {
        startCaptureRet = this.agoraEngine.startScreenCaptureByWindowId(
          this.state.selectedSourceId!,
          {},
          {
            dimensions: { width: 800, height: 800 },
            frameRate: 30,
            bitrate: 1000000,
            windowFocus: false,
            highLightWidth: 2,
            highLightColor: 0x000000,
            enableHighLight: true,
          }
        );
      }

      if (startCaptureRet !== 0) {
        throw new Error(`Failed to start screen capture: ${startCaptureRet}`);
      }

      this.state.isPublishing = true;
      this.startStatsMonitoring();

      console.log('Screen share published successfully');
    } catch (error) {
      console.error('Error publishing screen share:', error);
      throw error;
    }
  }

  public async unpublishScreenShare(): Promise<void> {
    try {
      if (!this.agoraEngine || !this.state.isPublishing) {
        return;
      }

      // Stop screen capture
      const stopCaptureRet = this.agoraEngine.stopScreenCapture();
      if (stopCaptureRet !== 0) {
        throw new Error(`Failed to stop screen capture: ${stopCaptureRet}`);
      }

      // Disable local video
      const disableVideoRet = this.agoraEngine.enableLocalVideo(false);
      if (disableVideoRet !== 0) {
        console.warn(`Failed to disable local video: ${disableVideoRet}`);
      }

      this.state.isPublishing = false;
      this.stopStatsMonitoring();
    } catch (error) {
      console.error('Error unpublishing screen share:', error);
      throw error;
    }
  }

  private startStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(() => {
      this.collectRTCStats();
    }, 1000); // Collect stats every second
  }

  private stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async collectRTCStats(): Promise<void> {
    try {
      if (!this.agoraEngine || !this.state.isPublishing) {
        return;
      }

      // Get system stats
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();

      // Update RTC stats
      if (this.state.rtcStats) {
        this.state.rtcStats.cpuUsage = cpuUsage.user + cpuUsage.system;
        this.state.rtcStats.memoryUsage = memoryUsage.heapUsed;
      }
    } catch (error) {
      console.error('Error collecting RTC stats:', error);
    }
  }

  public getCurrentState(): AgoraScreenShareState {
    return { ...this.state };
  }

  public getRTCStats(): RTCStats | null {
    return this.state.rtcStats;
  }

  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  public isJoined(): boolean {
    return this.state.isJoined;
  }

  public isPublishing(): boolean {
    return this.state.isPublishing;
  }

  public async cleanup(): Promise<void> {
    try {
      this.stopStatsMonitoring();

      if (this.state.isPublishing) {
        await this.unpublishScreenShare();
      }

      if (this.state.isJoined) {
        await this.leaveChannel();
      }

      if (this.agoraEngine) {
        this.agoraEngine.release();
        this.agoraEngine = null;
      }

      this.state = {
        isInitialized: false,
        isJoined: false,
        isPublishing: false,
        selectedSourceId: null,
        selectedSourceType: null,
        selectedSourceName: null,
        config: null,
        rtcStats: null,
      };
    } catch (error) {
      console.error('Error cleaning up Agora service:', error);
    }
  }
}

// Create singleton instance
const agoraScreenShareService = new AgoraScreenShareService();

export { agoraScreenShareService };
export default agoraScreenShareService;
