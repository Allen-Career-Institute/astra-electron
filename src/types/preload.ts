// Shared types for preload scripts
export interface DeepLinkData {
  action?: string;
  id?: string;
  type?: string;
  [key: string]: string | undefined;
}

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
  removeAllListeners: (channel: string) => void;
  onDeepLink: (
    callback: (event: any, deepLinkData: DeepLinkData) => void
  ) => void;
}

export interface MainElectronAPI extends BaseElectronAPI {
  sendMessage: (message: any) => Promise<any>;
  logout: () => void;
}

export interface StreamElectronAPI extends BaseElectronAPI {}

export interface WhiteboardElectronAPI extends BaseElectronAPI {}

// Unified interface for all preload scripts
export type ElectronAPI =
  | MainElectronAPI
  | StreamElectronAPI
  | WhiteboardElectronAPI;
