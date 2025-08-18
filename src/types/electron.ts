// Type definitions for Allen UI Console Electron application

export interface StreamWindowConfig {
  /** URL to load in the stream window */
  url?: string;
  /** Window width in pixels */
  width?: number;
  /** Window height in pixels */
  height?: number;
  /** Window x position in pixels */
  x?: number;
  /** Window y position in pixels */
  y?: number;
  /** Window title */
  title?: string;
  /** Whether to force close the window */
  forceClose?: boolean;
  /** Agora app ID for streaming */
  appId?: string;
  /** Agora channel name */
  channel?: string;
  /** Agora authentication token */
  token?: string;
  /** User ID for the stream */
  uid?: number;
  /** Meeting ID */
  meetingId?: string;
  /** Device IDs for audio/video devices */
  deviceIds?: {
    audioInput?: string;
    videoInput?: string;
  };
  /** Host information */
  hosts?: string[];
  /** Additional configuration options */
  configuration?: Record<string, any>;
}

export interface WhiteboardWindowConfig {
  /** URL to load in the whiteboard window */
  url?: string;
  /** Whether to force close the window */
  forceClose?: boolean;
  /** Window positioning features (currently commented out in implementation) */
  features?: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  };
}

// Note: RecordingConfig is currently not used in the codebase
// but imported in config.ts - keeping for future use
export interface RecordingConfig {
  /** Recording output directory */
  outputDir?: string;
  /** Recording quality settings */
  quality?: 'low' | 'medium' | 'high';
  /** Recording format */
  format?: string;
  /** Frame rate for recording */
  frameRate?: number;
}
