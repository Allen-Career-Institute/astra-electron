// User Configuration File
// Modify these settings to control the behavior of the application

export const USER_CONFIG = {
  // Rolling Merge Settings
  rollingMerge: {
    // Set to false to enable automatic merging of webm chunks
    // Set to true to disable merging and keep chunks as individual files
    disabled: true,

    // When disabled, chunks will be saved as individual files:
    // - {timestamp}.webm
    // etc.

    // When enabled, chunks will be automatically merged into:
    // - merged_output.webm (during recording)
    // - final_recording_{meetingId}.webm (when recording stops)
  },

  // Recording Settings
  recording: {
    // Directory where recordings are stored
    // This is relative to the user data directory
    recordingsPath: 'recordings',

    // Chunk file naming pattern (timestamp-based to prevent conflicts on page reload)
    chunkFileNamePattern: '{timestamp}.webm',
  },

  // Logging Settings
  logging: {
    // Enable detailed logging for rolling merge operations
    verboseRollingMerge: false,

    // Log chunk processing details
    logChunkProcessing: true,
  },
};

// Helper function to get rolling merge disabled state
export const isRollingMergeDisabled = (): boolean => {
  return USER_CONFIG.rollingMerge.disabled;
};

// Helper function to get verbose logging state
export const isVerboseLoggingEnabled = (): boolean => {
  return USER_CONFIG.logging.verboseRollingMerge;
};

// Helper function to get chunk logging state
export const isChunkLoggingEnabled = (): boolean => {
  return USER_CONFIG.logging.logChunkProcessing;
};
