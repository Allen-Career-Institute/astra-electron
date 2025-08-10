# Teacher Control Interface for Recording

This document explains how the teacher interface should control the recording functionality through
IPC calls to the stream window.

## Overview

The stream window is now a hidden background window that handles recording processes. The teacher
interface controls recording through IPC calls, and the stream window only shows briefly to indicate
status changes.

## IPC Methods Available

### 1. Start Recording

```javascript
// In teacher interface
const success = await window.electronAPI.teacherStartRecording(meetingId, recordingConfig);
if (success) {
  console.log('Recording started successfully');
} else {
  console.log('Failed to start recording');
}
```

### 2. Stop Recording

```javascript
// In teacher interface
const success = await window.electronAPI.teacherStopRecording(meetingId);
if (success) {
  console.log('Recording stopped successfully');
} else {
  console.log('Failed to stop recording');
}
```

### 3. Show/Hide Recording Window

```javascript
// Show recording window (useful for debugging or monitoring)
await window.electronAPI.teacherShowRecordingWindow();

// Hide recording window
await window.electronAPI.teacherHideRecordingWindow();
```

### 4. Get Recording Status

```javascript
// Check if recording is active
const status = await window.electronAPI.teacherGetRecordingStatus(meetingId);
if (status.isRecording) {
  console.log('Recording is active');
} else {
  console.log('Recording is not active');
}
```

## Recording Configuration

```javascript
const recordingConfig = {
  quality: 'balanced', // 'balanced', 'high', 'low'
  fps: 25,
  resolution: '1280x720',
  audio: true,
  video: true,
  // ... other options
};
```

## Example Teacher Interface Implementation

```javascript
class TeacherRecordingController {
  constructor() {
    this.currentMeetingId = null;
    this.isRecording = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Start recording button
    document.getElementById('startRecordingBtn').addEventListener('click', () => {
      this.startRecording();
    });

    // Stop recording button
    document.getElementById('stopRecordingBtn').addEventListener('click', () => {
      this.stopRecording();
    });

    // Show recording window button (for debugging)
    document.getElementById('showRecordingWindowBtn').addEventListener('click', () => {
      this.showRecordingWindow();
    });
  }

  async startRecording() {
    if (!this.currentMeetingId) {
      alert('No meeting ID available');
      return;
    }

    try {
      const recordingConfig = {
        quality: 'balanced',
        fps: 25,
        resolution: '1280x720',
      };

      const success = await window.electronAPI.teacherStartRecording(
        this.currentMeetingId,
        recordingConfig
      );

      if (success) {
        this.isRecording = true;
        this.updateUI();
        console.log('Recording started successfully');
      } else {
        alert('Failed to start recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording: ' + error.message);
    }
  }

  async stopRecording() {
    if (!this.currentMeetingId) {
      alert('No meeting ID available');
      return;
    }

    try {
      const success = await window.electronAPI.teacherStopRecording(this.currentMeetingId);

      if (success) {
        this.isRecording = false;
        this.updateUI();
        console.log('Recording stopped successfully');
      } else {
        alert('Failed to stop recording');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('Error stopping recording: ' + error.message);
    }
  }

  async showRecordingWindow() {
    try {
      await window.electronAPI.teacherShowRecordingWindow();
    } catch (error) {
      console.error('Error showing recording window:', error);
    }
  }

  updateUI() {
    const startBtn = document.getElementById('startRecordingBtn');
    const stopBtn = document.getElementById('stopRecordingBtn');
    const statusText = document.getElementById('recordingStatus');

    if (this.isRecording) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusText.textContent = 'Recording...';
      statusText.className = 'status recording';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusText.textContent = 'Not Recording';
      statusText.className = 'status stopped';
    }
  }

  setMeetingId(meetingId) {
    this.currentMeetingId = meetingId;
  }
}

// Initialize the controller
const recordingController = new TeacherRecordingController();
```

## Benefits of This Architecture

1. **Separation of Concerns**: Teacher interface handles UI, stream window handles recording
2. **Hidden Recording**: Recording processes run in background without interfering with teacher
   interface
3. **Centralized Control**: All recording control goes through the teacher interface
4. **Better UX**: Teacher doesn't need to manage multiple windows
5. **Debugging**: Recording window can be shown when needed for troubleshooting

## Notes

- The stream window will briefly show (2 seconds) when recording starts/stops to provide visual
  feedback
- The recording window is hidden from the taskbar by default
- All recording processes are automatically cleaned up when the stream window is closed
- The teacher interface should handle all user interactions and display recording status
