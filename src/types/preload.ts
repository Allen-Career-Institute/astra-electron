import { ScreenShareWindowConfig } from '@/modules/screenShareWindow';

// Shared types for preload scripts
export interface BaseElectronAPI {
  isElectron: boolean;
  requestStreamConfig: () => Promise<any>;
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
