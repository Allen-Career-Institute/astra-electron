import { ScreenShareWindowConfig } from '@/modules/screenShareWindow';

// Shared types for preload scripts
/** Raw Agora local-video stats, scored into the teacher header's quality pill by the main window. */
export interface ElectronSenderVideoStats {
  totalDuration?: number;
  totalFreezeTime?: number;
  sendBitrate?: number;
  sendFrameRate?: number;
  /** Not scored — carried for the teacher-side developer readout. */
  sendRttMs?: number;
}

/** Publish-side telemetry from the teacher stream window, which owns the only publishing client. */
export interface ElectronStreamQualityStats {
  senderStats?: ElectronSenderVideoStats | null;
  /** Whether the *stream window* is publishing video — the main window's own camera is idle. */
  isVideoEnabled?: boolean;
  /** The publishing client's Agora connection state. */
  connectionState?: string | null;
}

/**
 * Payload of the `NETWORK_QUALITY` message / `electron-network-quality` event. Two producers in the
 * stream window share it — the Agora quality callback (uplink/downlink indicators) and the quality
 * sampler (`streamQuality`) — so every field is optional and the renderer merges rather than
 * replaces. The main process forwards this untouched, so extending it needs no handler change.
 */
export interface ElectronNetworkQualityStats {
  uplinkNetworkQuality?: number;
  downlinkNetworkQuality?: number;
  streamQuality?: ElectronStreamQualityStats;
}

export interface BaseElectronAPI {
  isElectron: boolean;
  requestStreamConfig: () => Promise<any>;
  sendNetworkQuality?: (
    stats: ElectronNetworkQualityStats
  ) => Promise<{ success: boolean; error?: string }>;
  onStreamControl: (callback: (event: any, ...args: any[]) => void) => void;
  onCleanupResources: (callback: (event: any, ...args: any[]) => void) => void;
  sendMediaChunk: (
    meetingId: string,
    chunkData: any,
    chunkIndex: number,
    isLastChunk?: boolean
  ) => Promise<any>;
  sendMediaChunkV2: (
    meetingId: string,
    chunkData: ArrayBuffer,
    chunkIndex: number,
    isLastChunk?: boolean,
    doRecording?: boolean
  ) => Promise<any>;
  removeAllListeners: (channel: string) => void;
}

export interface MainElectronAPI extends BaseElectronAPI {
  sendMessage: (message: any) => Promise<any>;
  logout: () => void;
  getDesktopSources: (options: any) => Promise<any>;
  onMetrics: (callback: (event: any, metrics: any) => void) => void;
  writeImageToClipboard: (dataUrl: string) => Promise<boolean>;
  getAppVersion: () => string;
  onElectronScreenShareWindowClosed: (
    callback: (event: any, ...args: any[]) => void
  ) => void;
  onElectronScreenShareWindowOpened: (
    callback: (event: any, ...args: any[]) => void
  ) => void;
  onElectronLogEvent: (
    callback: (event: any, eventName: string, eventData: any) => void
  ) => void;
  onElectronTracksPublishedSuccess: (
    callback: (event: any, ...args: any[]) => void
  ) => void;
  onElectronNetworkQuality?: (
    callback: (event: any, stats: ElectronNetworkQualityStats) => void
  ) => void;
}

export interface StreamElectronAPI extends BaseElectronAPI {}

export interface WhiteboardElectronAPI extends BaseElectronAPI {}

export interface ScreenShareElectronAPI extends BaseElectronAPI {
  getScreenShareConfig: () => Promise<{
    type: 'SUCCESS' | 'ERROR';
    error?: string;
    payload?: ScreenShareWindowConfig;
  }>;
  getAppDataPath: () => Promise<string>;
}

// Unified interface for all preload scripts
export type ElectronAPI =
  | MainElectronAPI
  | StreamElectronAPI
  | WhiteboardElectronAPI
  | ScreenShareElectronAPI;
