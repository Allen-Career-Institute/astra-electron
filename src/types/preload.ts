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
    isLastChunk?: boolean,
    doRecording?: boolean
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

// Storage management types
export interface RecordingFolderInfo {
  meetingId: string;
  folderPath: string;
  sizeBytes: number;
  sizeMB: number;
  fileCount: number;
  createdAt: Date;
  modifiedAt: Date;
  ageInDays: number;
}

export interface StorageInfo {
  success: boolean;
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  folderCount: number;
  totalFileCount: number;
  folders: RecordingFolderInfo[];
  recordingsPath: string;
  error?: string;
}

export interface StorageCleanupResult {
  success: boolean;
  freedBytes: number;
  freedMB: number;
  deletedFolders: string[];
  deletedCount: number;
  remainingStorage?: StorageInfo;
  error?: string;
}

export interface DeleteRecordingResult {
  success: boolean;
  deletedMeetingId?: string;
  freedBytes?: number;
  freedMB?: number;
  remainingStorage?: StorageInfo;
  error?: string;
}

export interface DeleteAllRecordingsResult {
  success: boolean;
  freedBytes?: number;
  freedMB?: number;
  freedGB?: number;
  deletedCount?: number;
  deletedFileCount?: number;
  message?: string;
  error?: string;
}

export interface DeletionLogEntry {
  timestamp: string;
  meetingId: string;
  folderPath: string;
  sizeMB: number;
  sizeBytes: number;
  fileCount?: number;
  ageInDays: number;
  reason: 'age_limit' | 'size_limit' | 'manual' | 'manual_all';
  deletedBy: 'cleanup_task' | 'user_request';
}

export interface DeletionLogResult {
  success: boolean;
  lastUpdated?: string;
  totalDeleted?: number;
  totalFreedMB?: number;
  entries?: DeletionLogEntry[];
  logPath?: string;
  error?: string;
}

export interface ClearDeletionLogResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface RecordingFile {
  name: string;
  path: string;
  size: number;
  sizeMB: number;
  extension: string;
  createdAt: string;
  modifiedAt: string;
}

export interface RecordingFolder {
  meetingId: string;
  path: string;
  files: RecordingFile[];
  totalSize: number;
  totalSizeMB: number;
  fileCount: number;
  createdAt: string;
  modifiedAt: string;
  ageInDays: number;
}

export interface RecordingsFolderStructure {
  success: boolean;
  recordingsPath?: string;
  exists?: boolean;
  folders?: RecordingFolder[];
  folderCount?: number;
  totalSize?: number;
  totalSizeMB?: number;
  totalSizeGB?: number;
  totalFiles?: number;
  error?: string;
}

export interface OpenPathResult {
  success: boolean;
  message?: string;
  error?: string;
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

  // Recordings APIs
  getRecordings: () => Promise<{
    success: boolean;
    recordings: string[];
    recordingsPath?: string;
    count?: number;
    error?: string;
  }>;

  getRecordingFiles: (folderId: string) => Promise<{
    success: boolean;
    files: Array<{ name: string; path: string; size: number }>;
    folderPath?: string;
    error?: string;
  }>;

  uploadFileToPresignedUrl: (
    filePath: string,
    presignedUrl: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Storage management APIs
  checkRecordingsStorage: () => Promise<StorageInfo>;
  cleanupRecordingsBySize: (
    maxSizeGB?: number
  ) => Promise<StorageCleanupResult>;
  cleanupRecordingsByAge: (
    maxAgeDays?: number
  ) => Promise<StorageCleanupResult>;
  deleteRecording: (meetingId: string) => Promise<DeleteRecordingResult>;
  deleteAllRecordings: () => Promise<DeleteAllRecordingsResult>;

  // Deletion log APIs
  getDeletionLog: () => Promise<DeletionLogResult>;
  clearDeletionLog: () => Promise<ClearDeletionLogResult>;

  // Folder structure APIs
  getRecordingsFolderStructure: () => Promise<RecordingsFolderStructure>;
  openPathInExplorer: (targetPath: string) => Promise<OpenPathResult>;
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
