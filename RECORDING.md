# Allen UI Console Electron - Recording System

## Overview

The Allen UI Console Electron app includes a robust recording system that captures audio/video
streams with optimal memory usage, automatic chunking, and crash recovery. The system is designed to
handle long-running recordings efficiently while maintaining system stability.

## Features

### 🎥 **Independent Stream Window**

- **Full-screen, non-closeable window** - Stream window runs independently and cannot be closed by
  users
- **Always on top** - Stays visible above other applications
- **Fixed position** - Cannot be moved or resized
- **Persistent** - Remains open until explicitly force-closed

### 🔄 **Robust Recording Process**

- **Child process architecture** - Recording runs in separate processes for stability
- **Automatic crash recovery** - Processes restart automatically on failure
- **Configurable restart attempts** - Limit restart attempts to prevent infinite loops
- **Memory monitoring** - Tracks memory usage and warns when limits are exceeded

### 📹 **Smart Chunking System**

- **Configurable chunk duration** - Default 30 seconds per chunk
- **Memory optimization** - Smaller chunks reduce memory footprint
- **Ordered processing** - Maintains strict chunk order for final video
- **Automatic cleanup** - Removes temporary files after processing

### 🎬 **Video Processing**

- **FFmpeg integration** - Uses industry-standard FFmpeg for video processing
- **Multiple codec support** - H.264 video, AAC audio
- **Quality presets** - Low, balanced, and high quality options
- **Platform optimization** - Platform-specific capture methods

### ⚙️ **Configuration Management**

- **Environment variables** - Configure via environment variables
- **Runtime updates** - Change settings without restarting
- **Quality presets** - Pre-configured quality levels
- **Storage management** - Configurable storage paths and retention

## Configuration

### Environment Variables

```bash
# Enable/disable recording
RECORDING_ENABLED=true

# Chunk settings
RECORDING_CHUNK_DURATION=30000
RECORDING_MAX_CHUNKS=50

# Video settings
RECORDING_VIDEO_CODEC=libx264
RECORDING_VIDEO_BITRATE=1500k
RECORDING_FPS=25
RECORDING_RESOLUTION=1280x720

# Audio settings
RECORDING_AUDIO_CODEC=aac
RECORDING_AUDIO_BITRATE=96k

# Quality preset (low, balanced, high)
RECORDING_QUALITY=balanced

# Memory and performance
RECORDING_MEMORY_LIMIT=500
RECORDING_PRESET=ultrafast
RECORDING_TUNE=zerolatency

# Crash recovery
RECORDING_AUTO_RESTART=true
RECORDING_MAX_RESTART_ATTEMPTS=3
RECORDING_RESTART_DELAY=2000

# Storage
RECORDING_STORAGE_PATH=recordings
RECORDING_RETENTION_HOURS=24
```

### Quality Presets

| Preset   | Video Bitrate | Audio Bitrate | FPS | Resolution |
| -------- | ------------- | ------------- | --- | ---------- |
| Low      | 800k          | 64k           | 20  | 854x480    |
| Balanced | 1500k         | 96k           | 25  | 1280x720   |
| High     | 2500k         | 128k          | 30  | 1920x1080  |

## Architecture

### Process Structure

```
Main Electron Process
├── Stream Window
├── Recording Manager
└── IPC Handlers
    ├── start-recording
    ├── stop-recording
    ├── get-recording-status
    └── update-recording-config

Recording Worker Process (Child)
├── FFmpeg Process
├── Memory Monitor
└── Chunk Manager

Combining Worker Process (Child)
├── FFmpeg Process
├── Chunk Validator
└── Final Video Generator
```

### Data Flow

1. **Stream Window** → **Recording Manager** → **Recording Worker**
2. **Recording Worker** → **Chunk Files** → **Metadata Updates**
3. **Recording Complete** → **Combining Worker** → **Final Video**
4. **Cleanup** → **Remove Chunks** → **Update Status**

## File Structure

```
recordings/
└── {meetingId}/
    ├── chunks/
    │   ├── chunk_000000_1234567890.mp4
    │   ├── chunk_000001_1234567920.mp4
    │   └── ...
    ├── metadata.json
    ├── concat.txt (temporary)
    ├── temp_final_{meetingId}.mp4 (temporary)
    └── final_{meetingId}.mp4
```

### Metadata Structure

```json
{
  "meetingId": "meeting_123",
  "startTime": 1234567890,
  "endTime": 1234567890,
  "status": "completed",
  "config": { ... },
  "chunks": [
    {
      "number": 0,
      "filename": "chunk_000000_1234567890.mp4",
      "filepath": "/path/to/chunk",
      "startTime": 1234567890,
      "endTime": 1234567920,
      "size": 1024000,
      "duration": 30000
    }
  ],
  "finalVideo": {
    "filepath": "/path/to/final_video.mp4",
    "size": 51200000,
    "duration": 300000,
    "chunks": 10
  },
  "restartAttempts": 0,
  "lastRestart": null
}
```

## API Reference

### IPC Handlers

#### `start-recording`

Start recording for a specific meeting.

```typescript
ipcRenderer.invoke('start-recording', meetingId: string, config?: RecordingConfig): Promise<boolean>
```

#### `stop-recording`

Stop recording for a specific meeting.

```typescript
ipcRenderer.invoke('stop-recording', meetingId: string): Promise<boolean>
```

#### `get-recording-status`

Get current recording status for a meeting.

```typescript
ipcRenderer.invoke('get-recording-status', meetingId: string): Promise<RecordingStatus>
```

#### `get-recording-config`

Get current recording configuration.

```typescript
ipcRenderer.invoke('get-recording-config'): Promise<RecordingConfig>
```

#### `update-recording-config`

Update recording configuration.

```typescript
ipcRenderer.invoke('update-recording-config', config: Partial<RecordingConfig>): Promise<boolean>
```

#### `force-close-stream-window`

Force close the stream window (admin only).

```typescript
ipcRenderer.invoke('force-close-stream-window'): Promise<boolean>
```

### Types

```typescript
interface RecordingConfig {
  enabled: boolean;
  chunkDuration: number;
  maxChunks: number;
  videoCodec: string;
  audioCodec: string;
  videoBitrate: string;
  audioBitrate: string;
  fps: number;
  resolution: string;
  preset: string;
  tune: string;
  memoryLimit: number;
  autoRestart: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
  quality: 'low' | 'balanced' | 'high';
}

interface RecordingStatus {
  isRecording: boolean;
  startTime: number | null;
  chunks: ChunkInfo[];
  config: RecordingConfig | null;
  restartAttempts: number;
  lastRestart: number | null;
  pid: number | null;
}

interface ChunkInfo {
  number: number;
  filename: string;
  filepath: string;
  startTime: number;
  endTime: number;
  size: number;
  duration: number;
  memoryUsage: MemoryUsage;
}
```

## Error Handling

### Automatic Recovery

- **Process crashes** → Automatic restart (configurable attempts)
- **Memory issues** → Warning and monitoring
- **FFmpeg failures** → Retry with exponential backoff
- **File corruption** → Skip invalid chunks and continue

### Error Types

- **Recording errors** - FFmpeg process failures
- **Memory warnings** - High memory usage detected
- **Chunk errors** - Invalid or empty chunk files
- **Combining errors** - Video combination failures

## Performance Optimization

### Memory Management

- **Chunk-based recording** - Limits memory usage per chunk
- **Configurable limits** - Set memory thresholds
- **Garbage collection** - Force GC when memory is high
- **Process isolation** - Separate processes prevent memory leaks

### Video Optimization

- **Fast presets** - Use ultrafast encoding for real-time
- **Keyframe optimization** - Proper keyframe intervals for chunking
- **Stream optimization** - Faststart flags for better playback
- **Platform-specific** - Optimized capture methods per OS

## Troubleshooting

### Common Issues

1. **Recording not starting**
   - Check FFmpeg installation
   - Verify device permissions
   - Check configuration values

2. **High memory usage**
   - Reduce chunk duration
   - Lower video quality
   - Increase memory limit

3. **Chunk ordering issues**
   - Check metadata.json
   - Verify chunk numbering
   - Restart recording process

4. **FFmpeg errors**
   - Check device availability
   - Verify codec support
   - Check file permissions

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development electron .
```

### Log Files

Check console output for:

- Recording process logs
- Memory usage information
- Chunk creation details
- Error messages and stack traces

## Security Considerations

- **File permissions** - Recordings stored in app directory
- **Process isolation** - Recording processes run separately
- **Input validation** - All IPC calls validated
- **Resource limits** - Configurable memory and process limits

## Future Enhancements

- **Cloud storage** - Upload recordings to cloud services
- **Compression** - Additional video compression options
- **Streaming** - Real-time streaming capabilities
- **Analytics** - Recording quality metrics and analytics
- **Multi-format** - Support for additional video formats
