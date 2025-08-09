# Stream Window Migration: Native Agora SDK to Web-Based Streaming

## Overview

This document outlines the migration from using the native Agora Electron SDK in the stream window
to a web-based streaming approach that opens a URL from allen-ui-live with injected tokens.

## Changes Made

### 1. Removed Native Agora SDK Dependencies

**Files Removed:**

- `src/renderer/components/AgoraStream.tsx`
- `src/renderer/components/AgoraStream.css`
- `src/renderer/components/AgoraVideo.tsx`
- `src/renderer/stream-window.tsx`
- `src/renderer/stream-window.html`

**Dependencies Removed:**

- `agora-electron-sdk`
- `agora-rtc-sdk-ng`
- `mediasoup-client`
- `webrtc-adapter`

### 2. Updated Electron Configuration

**Modified Files:**

- `src/main.js` - Updated stream window creation to load URL instead of local HTML
- `src/stream-preload.js` - Simplified to use contextBridge for secure IPC
- `webpack.config.js` - Removed stream window entry point and Agora externals

**Key Changes:**

- Stream window now loads `http://localhost:3000/teacher-liveclass-stream` instead of local HTML
- Removed `nodeIntegration: true` for better security
- Added proper contextBridge for IPC communication
- Updated webPreferences for better security

### 3. Created New Streaming Route in allen-ui-live

**New Files:**

- `allen-ui-live/apps/live-web-app/app/teacher-liveclass-stream/page.tsx`
- `allen-ui-live/apps/live-web-app/app/teacher-liveclass-stream/stream.css`
- `allen-ui-live/apps/live-web-app/app/teacher-liveclass-stream/types.d.ts`

**Features:**

- Web-based video/audio streaming using WebRTC
- Device selection support (audio/video device IDs)
- Audio/video mute/unmute controls
- IPC communication with Electron for configuration
- Responsive design with modern UI

### 4. Updated IPC Communication

**New IPC Handlers:**

- `request-stream-config` - Provides stream configuration to web page
- `stream-control` - Handles audio/video control actions
- `minimize-stream-window` - Window control
- `close-stream-window` - Window control

**Updated Message Flow:**

1. Main window sends `CONFIG_UPDATE` with stream configuration
2. Electron creates stream window and loads allen-ui-live URL
3. Stream window requests configuration via IPC
4. Electron sends configuration to stream window
5. Stream window initializes WebRTC streaming
6. Audio/video controls are forwarded via IPC

## Benefits

### Security

- Removed native SDK dependencies that had broad system access
- Enabled proper context isolation in Electron
- Web-based approach provides better sandboxing

### Maintainability

- Simplified codebase by removing complex native SDK integration
- Web-based streaming is easier to debug and maintain
- Better separation of concerns between Electron and web app

### Performance

- Reduced bundle size by removing native dependencies
- Web-based streaming can leverage browser optimizations
- Faster development and testing cycles

### Flexibility

- Easier to update streaming logic without Electron rebuilds
- Can leverage existing web-based streaming libraries
- Better cross-platform compatibility

## Configuration

The stream window now receives configuration via IPC with the following structure:

```typescript
interface StreamConfig {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  meetingId: string;
  deviceIds?: {
    audioDeviceId?: string;
    videoDeviceId?: string;
    speakerDeviceId?: string;
  };
}
```

## Usage

1. Start the allen-ui-live development server: `npm run dev`
2. Start the Electron app: `npm run dev`
3. The stream window will automatically load the streaming URL when configuration is provided
4. Audio/video controls from the main window will be forwarded to the stream window

## Future Enhancements

- Add support for screen sharing
- Implement recording functionality
- Add more advanced WebRTC features
- Improve error handling and recovery
- Add analytics and monitoring
