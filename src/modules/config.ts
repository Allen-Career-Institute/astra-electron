import { RecordingConfig } from '../types/electron';

// Environment configuration
const ENV: string = process.env.NODE_ENV || 'development';

const URLS: Record<string, string> = {
  development: 'http://localhost:3000/',
  stage: 'https://console.allen-stage.in/',
  production: 'https://astra.allen.in/',
};

const DEFAULT_URL: string = URLS[ENV] || URLS.development;

// Recording configuration
const RECORDING_CONFIG: RecordingConfig = {
  // Default recording settings
  enabled: process.env.RECORDING_ENABLED !== 'false',
  chunkDuration: parseInt(process.env.RECORDING_CHUNK_DURATION || '30000'), // 30 seconds
  maxChunks: parseInt(process.env.RECORDING_MAX_CHUNKS || '50'),
  videoCodec: process.env.RECORDING_VIDEO_CODEC || 'libx264',
  audioCodec: process.env.RECORDING_AUDIO_CODEC || 'aac',
  videoBitrate: process.env.RECORDING_VIDEO_BITRATE || '1500k',
  audioBitrate: process.env.RECORDING_AUDIO_BITRATE || '96k',
  fps: parseInt(process.env.RECORDING_FPS || '25'),
  resolution: process.env.RECORDING_RESOLUTION || '1280x720',
  preset: process.env.RECORDING_PRESET || 'ultrafast',
  tune: process.env.RECORDING_TUNE || 'zerolatency',
  memoryLimit: parseInt(process.env.RECORDING_MEMORY_LIMIT || '500'), // MB
  autoRestart: process.env.RECORDING_AUTO_RESTART !== 'false',
  maxRestartAttempts: parseInt(
    process.env.RECORDING_MAX_RESTART_ATTEMPTS || '3'
  ),
  restartDelay: parseInt(process.env.RECORDING_RESTART_DELAY || '2000'),

  // Storage settings
  storagePath: process.env.RECORDING_STORAGE_PATH || 'recordings',
  retentionHours: parseInt(process.env.RECORDING_RETENTION_HOURS || '24'),

  // Quality settings
  quality: process.env.RECORDING_QUALITY || 'balanced', // low, balanced, high
};

// Quality presets
const QUALITY_PRESETS: Record<string, Partial<RecordingConfig>> = {
  low: {
    videoBitrate: '800k',
    audioBitrate: '64k',
    fps: 20,
    resolution: '854x480',
  },
  balanced: {
    videoBitrate: '1500k',
    audioBitrate: '96k',
    fps: 25,
    resolution: '1280x720',
  },
  high: {
    videoBitrate: '2500k',
    audioBitrate: '128k',
    fps: 30,
    resolution: '1920x1080',
  },
};

// Apply quality preset if specified
if (RECORDING_CONFIG.quality && QUALITY_PRESETS[RECORDING_CONFIG.quality]) {
  const preset = QUALITY_PRESETS[RECORDING_CONFIG.quality];
  Object.assign(RECORDING_CONFIG, preset);
}

export { ENV, URLS, DEFAULT_URL, RECORDING_CONFIG, QUALITY_PRESETS };
