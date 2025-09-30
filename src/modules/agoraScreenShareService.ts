import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngineEx,
  IRtcEngineEventHandler,
  RtcConnection,
  ConnectionStateType,
  ConnectionChangedReasonType,
  ScreenCaptureSourceInfo,
  ScreenCaptureSourceType,
  VideoSourceType,
  VideoStreamType,
  RenderModeType,
  VideoMirrorModeType,
} from 'agora-electron-sdk';
import { ScreenShareWindowConfig } from './screenShareWindow';
import { getThumbImageBufferToBase64 } from '../utils/agoraThumbnailUtil';
import { sendLogEvent } from '@/utils/logEventUtil';

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
  displayId?: string;
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
  isPreviewing: boolean;
  selectedSourceId: number | null;
  selectedSourceType: ScreenCaptureSourceType | null;
  selectedSourceName: string | null;
  config: ScreenShareWindowConfig | null;
  rtcStats: RTCStats | null;
}

class AgoraScreenShareService implements IRtcEngineEventHandler {
  private state: AgoraScreenShareState = {
    isInitialized: false,
    isJoined: false,
    isPublishing: false,
    isPreviewing: false,
    selectedSourceId: null,
    selectedSourceType: null,
    selectedSourceName: null,
    config: null,
    rtcStats: null,
  };

  private agoraEngine: IRtcEngineEx | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {}

  // IRtcEngineEventHandler implementation
  onConnectionStateChanged(
    connection: RtcConnection,
    state: ConnectionStateType,
    reason: ConnectionChangedReasonType
  ): void {
    console.log('Agora connection state changed:', state, reason);
    if (state === ConnectionStateType.ConnectionStateConnected) {
      console.log('Successfully connected to Agora channel');
    } else if (state === ConnectionStateType.ConnectionStateDisconnected) {
      console.log('Disconnected from Agora channel');
      this.state.isJoined = false;
      this.state.isPublishing = false;
    }
  }

  onError(err: number, msg: string): void {
    console.error('Agora error:', err, msg);
  }

  onWarning(warn: number, msg: string): void {
    console.warn('Agora warning:', warn, msg);
  }

  private async initializeAgoraEngine(
    config: ScreenShareWindowConfig
  ): Promise<void> {
    try {
      if (this.agoraEngine) {
        return;
      }
      this.agoraEngine = createAgoraRtcEngine();
      // Initialize with default settings
      const ret = this.agoraEngine.initialize({
        appId: config.app_id,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
      this.state.config = config;
      if (ret !== 0) {
        throw new Error(`Failed to initialize Agora engine: ${ret}`);
      }
      this.state.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Agora engine:', error);
      throw error;
    }
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

      // Join channel with screen sharing configuration
      const joinChannelRet = this.agoraEngine.joinChannelEx(
        this.state.config.user_token || '',
        {
          channelId: this.state.config.meetingId,
          localUid: parseInt(this.state.config.user_id),
        },
        {
          autoSubscribeAudio: false,
          autoSubscribeVideo: false,
          publishMicrophoneTrack: false,
          publishCameraTrack: false,
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishScreenTrack: true,
          publishCustomVideoTrack: false,
          publishEncodedVideoTrack: false,
          defaultVideoStreamType: VideoStreamType.VideoStreamHigh,
        }
      );
      console.log('joinChannelEx result:', joinChannelRet);

      if (joinChannelRet !== 0) {
        sendLogEvent('agora-ss-join-failed', {
          messagePayload: JSON.stringify({
            joinChannelRet,
          }),
        });
        throw new Error(`Failed to join channel: ${joinChannelRet}`);
      }

      sendLogEvent('agora-ss-join-success', {});
      this.state.isJoined = true;
      console.log('Successfully joined Agora channel for screen sharing');
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

      console.log('Leaving Agora channel...');

      // Stop screen sharing if currently publishing
      if (this.state.isPublishing) {
        await this.unpublishScreenShare();
      }

      // Leave the channel
      const ret = this.agoraEngine.leaveChannel();
      console.log('Leave channel result:', ret);

      if (ret !== 0) {
        console.warn(`Warning: Failed to leave channel: ${ret}`);
      }

      this.state.isJoined = false;
      this.state.isPublishing = false;
      this.stopStatsMonitoring();

      console.log('Successfully left Agora channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  }

  public async getScreenSources(): Promise<ScreenSource[]> {
    try {
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
        return {
          id: source.sourceId?.toString() || '',
          type:
            source.type ??
            ScreenCaptureSourceType.ScreencapturesourcetypeUnknown,
          name: source.sourceName || 'Unknown Source',
          title: source.sourceTitle || '',
          thumbnail: getThumbImageBufferToBase64(source.thumbImage),
          displayId: source.sourceDisplayId?.toString() || '',
          appIcon: undefined, // Agora doesn't provide app icons
        };
      });
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

  public async stopPreview(): Promise<void> {
    try {
      if (!this.agoraEngine) {
        return;
      }

      console.log('Stopping screen share preview...');

      // Stop preview
      const stopPreviewRet = this.agoraEngine.stopPreview(
        VideoSourceType.VideoSourceScreen
      );
      console.log('Stop preview result:', stopPreviewRet);

      if (stopPreviewRet !== 0) {
        console.warn(`Warning: Failed to stop preview: ${stopPreviewRet}`);
      }

      // Stop screen capture
      const stopCaptureRet = this.agoraEngine.stopScreenCapture();
      console.log('Stop screen capture result:', stopCaptureRet);

      if (stopCaptureRet !== 0) {
        console.warn(
          `Warning: Failed to stop screen capture: ${stopCaptureRet}`
        );
      }

      // Disable local video
      const disableVideoRet = this.agoraEngine.enableLocalVideo(false);
      console.log('Disable local video result:', disableVideoRet);

      if (disableVideoRet !== 0) {
        console.warn(
          `Warning: Failed to disable local video: ${disableVideoRet}`
        );
      }

      this.state.isPreviewing = false;
      console.log('Screen share preview stopped successfully');
    } catch (error) {
      console.error('Error stopping screen share preview:', error);
      throw error;
    }
  }

  public async publishScreenShare(): Promise<void> {
    try {
      console.log('publishScreenShare - State:', {
        isJoined: this.state.isJoined,
        selectedSourceId: this.state.selectedSourceId,
        selectedSourceType: this.state.selectedSourceType,
      });

      if (!this.agoraEngine) {
        throw new Error('Agora engine not ready');
      }

      if (!this.state.selectedSourceId) {
        throw new Error('Screen source not selected');
      }

      // Start screen capture based on source type
      let startCaptureRet = 0;

      if (
        this.state.selectedSourceType ===
        ScreenCaptureSourceType.ScreencapturesourcetypeWindow
      ) {
        console.log(
          'Starting window capture for source ID:',
          this.state.selectedSourceId
        );
        startCaptureRet = this.agoraEngine.startScreenCaptureByWindowId(
          this.state.selectedSourceId,
          {},
          {
            dimensions: this.state.config?.agoraConfig?.dimensions ?? {
              width: 1280,
              height: 720,
            },
            frameRate: this.state.config?.agoraConfig?.frameRate ?? 25,
            windowFocus: this.state.config?.agoraConfig?.windowFocus ?? true,
            captureMouseCursor:
              this.state.config?.agoraConfig?.captureMouseCursor ?? true,
            highLightWidth: this.state.config?.agoraConfig?.highLightWidth ?? 5,
            highLightColor:
              this.state.config?.agoraConfig?.highLightColor ?? 4287414054,
            enableHighLight:
              this.state.config?.agoraConfig?.enableHighLight ?? true,
          }
        );
      } else if (
        this.state.selectedSourceType ===
        ScreenCaptureSourceType.ScreencapturesourcetypeScreen
      ) {
        console.log(
          'Starting screen capture for display ID:',
          this.state.selectedSourceId
        );
        startCaptureRet = this.agoraEngine.startScreenCaptureByDisplayId(
          this.state.selectedSourceId,
          {},
          {
            dimensions: this.state.config?.agoraConfig?.dimensions ?? {
              width: 1280,
              height: 720,
            },
            frameRate: this.state.config?.agoraConfig?.frameRate ?? 25,
            windowFocus: this.state.config?.agoraConfig?.windowFocus ?? true,
            captureMouseCursor:
              this.state.config?.agoraConfig?.captureMouseCursor ?? true,
            highLightWidth: this.state.config?.agoraConfig?.highLightWidth ?? 5,
            excludeWindowList: [],
            excludeWindowCount: 0,
            highLightColor:
              this.state.config?.agoraConfig?.highLightColor ?? 4287414054,
            enableHighLight:
              this.state.config?.agoraConfig?.enableHighLight ?? true,
          }
        );
      } else {
        throw new Error(
          `Unsupported screen source type: ${this.state.selectedSourceType}`
        );
      }

      console.log('Screen capture start result:', startCaptureRet);

      if (startCaptureRet !== 0) {
        sendLogEvent('agora-ss-start-capture-failed', {
          messagePayload: JSON.stringify({
            startCaptureRet,
          }),
        });
        throw new Error(`Failed to start screen capture: ${startCaptureRet}`);
      }

      sendLogEvent('agora-ss-start-capture-success', {
        messagePayload: JSON.stringify({
          startCaptureRet,
          selectedSourceId: this.state.selectedSourceId,
          selectedSourceType: this.state.selectedSourceType,
        }),
      });
      const enableVideoRet = this.agoraEngine.enableLocalVideo(true);
      console.log('Enable local video for preview result:', enableVideoRet);

      if (enableVideoRet !== 0) {
        sendLogEvent('agora-ss-enable-local-video-failed', {
          messagePayload: JSON.stringify({
            enableVideoRet,
          }),
        });
        console.warn(
          `Warning: Failed to enable local video for preview: ${enableVideoRet}`
        );
      }

      sendLogEvent('agora-ss-enable-local-video-success', {
        messagePayload: JSON.stringify({
          enableVideoRet,
          selectedSourceId: this.state.selectedSourceId,
          selectedSourceType: this.state.selectedSourceType,
        }),
      });

      // Start preview
      const startPreviewRet = this.agoraEngine.startPreview(
        VideoSourceType.VideoSourceScreen
      );
      console.log('Start preview result:', startPreviewRet);

      if (startPreviewRet !== 0) {
        sendLogEvent('agora-ss-start-preview-failed', {
          messagePayload: JSON.stringify({
            startPreviewRet,
          }),
        });
        this.agoraEngine.stopScreenCapture();
        throw new Error(`Failed to start preview: ${startPreviewRet}`);
      }

      sendLogEvent('agora-ss-start-preview-success', {
        messagePayload: JSON.stringify({
          startPreviewRet,
          selectedSourceId: this.state.selectedSourceId,
          selectedSourceType: this.state.selectedSourceType,
        }),
      });
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

      console.log('Unpublishing screen share...');

      // Stop screen capture
      const stopCaptureRet = this.agoraEngine.stopScreenCapture();
      console.log('Stop screen capture result:', stopCaptureRet);

      if (stopCaptureRet !== 0) {
        console.warn(
          `Warning: Failed to stop screen capture: ${stopCaptureRet}`
        );
      }

      // Disable local video
      const disableVideoRet = this.agoraEngine.enableLocalVideo(false);
      console.log('Disable local video result:', disableVideoRet);

      if (disableVideoRet !== 0) {
        console.warn(
          `Warning: Failed to disable local video: ${disableVideoRet}`
        );
      }

      // Stop preview
      const stopPreviewRet = this.agoraEngine.stopPreview(
        VideoSourceType.VideoSourceScreen
      );
      console.log('Stop preview result:', stopPreviewRet);

      this.state.isPublishing = false;
      this.stopStatsMonitoring();

      console.log('Screen share unpublished successfully');
    } catch (error) {
      console.error('Error unpublishing screen share:', error);
      throw error;
    }
  }

  public setupLocalVideoView(element: HTMLElement): void {
    try {
      if (!this.agoraEngine) {
        console.warn('Agora engine not ready for video setup');
        return;
      }

      // Setup local video view for screen sharing with RenderModeHidden first
      let setupRet = this.agoraEngine.setupLocalVideo({
        uid: 0,
        sourceType: VideoSourceType.VideoSourceScreen,
        view: element,
        renderMode: RenderModeType.RenderModeHidden,
        mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled,
      });

      console.log(
        'Setup local video view with RenderModeHidden result:',
        setupRet
      );

      // If RenderModeHidden fails, fallback to RenderModeFit
      if (setupRet !== 0) {
        console.warn(
          `RenderModeHidden failed (${setupRet}), trying RenderModeFit as fallback`
        );
        setupRet = this.agoraEngine.setupLocalVideo({
          uid: 0,
          sourceType: VideoSourceType.VideoSourceScreen,
          view: element,
          renderMode: RenderModeType.RenderModeFit,
          mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled,
        });
        console.log(
          'Setup local video view with RenderModeFit result:',
          setupRet
        );
      }

      if (setupRet !== 0) {
        console.warn(`Warning: Failed to setup local video view: ${setupRet}`);
      }
    } catch (error) {
      console.error('Error setting up local video view:', error);
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

  public isPreviewing(): boolean {
    return this.state.isPreviewing;
  }

  public async cleanup(): Promise<void> {
    try {
      this.stopStatsMonitoring();

      if (this.state.isPublishing) {
        await this.unpublishScreenShare();
      }

      if (this.state.isPreviewing) {
        await this.stopPreview();
      }

      if (this.state.isJoined) {
        await this.leaveChannel();
      }

      if (this.agoraEngine) {
        // Unregister event handler before releasing
        this.agoraEngine.unregisterEventHandler(this);
        this.agoraEngine.release();
        this.agoraEngine = null;
      }

      this.state = {
        isInitialized: false,
        isJoined: false,
        isPublishing: false,
        isPreviewing: false,
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
