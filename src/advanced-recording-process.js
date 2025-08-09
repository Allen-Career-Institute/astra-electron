const { parentPort } = require('worker_threads');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Initialize Sentry for the advanced recording process
function initializeAdvancedRecordingSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    try {
      // Check if Sentry integrations are available
      const integrations = [];

      // Only add integrations if they exist
      if (Sentry.Integrations && Sentry.Integrations.Process) {
        try {
          integrations.push(new Sentry.Integrations.Process());
        } catch (e) {
          console.warn('Process integration not available:', e.message);
        }
      }

      Sentry.init({
        dsn: dsn,
        environment: environment,
        debug: environment === 'development',
        integrations: integrations,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        attachStacktrace: true,
        includeLocalVariables: true,
        release: process.env.APP_VERSION || '1.0.0',
        dist: 'advanced-recording-process',
      });

      console.log(
        `Advanced recording process Sentry initialized for environment: ${environment}`
      );
    } catch (error) {
      console.error(
        'Failed to initialize Sentry in advanced recording process:',
        error
      );
      console.log('Continuing without Sentry...');
    }
  } else {
    console.log('Sentry DSN not provided, skipping initialization');
  }
}

// Initialize Sentry
initializeAdvancedRecordingSentry();

// Advanced recording session class
class AdvancedRecordingSession {
  constructor() {
    this.sessionId = uuidv4();
    this.isRecording = false;
    this.isPaused = false;
    this.isMuted = false;
    this.devices = {
      audio: null,
      video: null,
    };
    this.recordings = {
      audio: null,
      video: null,
    };
    this.tempFiles = {
      audio: null,
      video: null,
      combined: null,
    };
    this.ffmpegProcess = null;
    this.startTime = null;
    this.pauseTime = 0;
    this.recordingStats = {
      duration: 0,
      fileSize: 0,
      fps: 0,
      bitrate: 0,
    };
  }

  // Initialize devices from React WebView
  async initializeDevices(deviceIds) {
    try {
      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Initializing devices for recording',
        level: 'info',
        data: { deviceIds, sessionId: this.sessionId },
      });

      this.devices = {
        audio: deviceIds.audioDeviceId || null,
        video: deviceIds.videoDeviceId || null,
      };

      // Validate devices
      if (!this.devices.audio && !this.devices.video) {
        throw new Error('No audio or video devices specified');
      }

      this.sendMessage('devices-initialized', {
        sessionId: this.sessionId,
        devices: this.devices,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'initialize-devices' },
      });
      this.sendError('Failed to initialize devices: ' + error.message);
    }
  }

  // Start recording with device management
  async startRecording(options = {}) {
    try {
      if (this.isRecording) {
        throw new Error('Recording already in progress');
      }

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Starting advanced recording session',
        level: 'info',
        data: { options, sessionId: this.sessionId },
      });

      this.isRecording = true;
      this.isPaused = false;
      this.isMuted = false;
      this.startTime = Date.now();
      this.pauseTime = 0;

      // Create temp files
      this.tempFiles = {
        audio: this.generateTempFile('audio', 'wav'),
        video: this.generateTempFile('video', 'mp4'),
        combined: this.generateTempFile('combined', 'mp4'),
      };

      // Start separate audio and video recordings
      await this.startAudioRecording(options);
      await this.startVideoRecording(options);

      this.sendMessage('recording-started', {
        sessionId: this.sessionId,
        startTime: this.startTime,
        devices: this.devices,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'start-recording' },
      });
      this.sendError('Failed to start recording: ' + error.message);
    }
  }

  // Start audio recording
  async startAudioRecording(options) {
    console.log('startAudioRecording', options);
    if (!this.devices.audio) return;

    try {
      const audioCommand = ffmpeg()
        .input(`audio=${this.devices.audio}`)
        .audioCodec('pcm_s16le')
        .audioChannels(2)
        .audioFrequency(48000)
        .output(this.tempFiles.audio)
        .on('start', () => {
          console.log('Audio recording started');
        })
        .on('error', error => {
          Sentry.captureException(error, {
            tags: {
              process: 'advanced-recording',
              action: 'audio-recording-error',
            },
          });
          this.sendError('Audio recording error: ' + error.message);
        });

      this.recordings.audio = audioCommand;
      audioCommand.run();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          process: 'advanced-recording',
          action: 'start-audio-recording',
        },
      });
      throw error;
    }
  }

  // Start video recording
  async startVideoRecording(options) {
    if (!this.devices.video) return;

    try {
      const videoCommand = ffmpeg()
        .input(`video=${this.devices.video}`)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(options.videoBitrate || '2500k')
        .audioBitrate(options.audioBitrate || '128k')
        .fps(options.fps || 30)
        .output(this.tempFiles.video)
        .on('start', () => {
          console.log('Video recording started');
        })
        .on('error', error => {
          Sentry.captureException(error, {
            tags: {
              process: 'advanced-recording',
              action: 'video-recording-error',
            },
          });
          this.sendError('Video recording error: ' + error.message);
        });

      this.recordings.video = videoCommand;
      videoCommand.run();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          process: 'advanced-recording',
          action: 'start-video-recording',
        },
      });
      throw error;
    }
  }

  // Pause recording
  async pauseRecording() {
    try {
      if (!this.isRecording || this.isPaused) return;

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Pausing recording',
        level: 'info',
        data: { sessionId: this.sessionId },
      });

      this.isPaused = true;
      this.pauseTime += Date.now() - this.startTime;

      // Pause FFmpeg processes
      if (this.recordings.audio) {
        this.recordings.audio.kill('SIGSTOP');
      }
      if (this.recordings.video) {
        this.recordings.video.kill('SIGSTOP');
      }

      this.sendMessage('recording-paused', {
        sessionId: this.sessionId,
        pauseTime: this.pauseTime,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'pause-recording' },
      });
      this.sendError('Failed to pause recording: ' + error.message);
    }
  }

  // Resume recording
  async resumeRecording() {
    try {
      if (!this.isRecording || !this.isPaused) return;

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Resuming recording',
        level: 'info',
        data: { sessionId: this.sessionId },
      });

      this.isPaused = false;
      this.startTime = Date.now() - this.pauseTime;

      // Resume FFmpeg processes
      if (this.recordings.audio) {
        this.recordings.audio.kill('SIGCONT');
      }
      if (this.recordings.video) {
        this.recordings.video.kill('SIGCONT');
      }

      this.sendMessage('recording-resumed', {
        sessionId: this.sessionId,
        startTime: this.startTime,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'resume-recording' },
      });
      this.sendError('Failed to resume recording: ' + error.message);
    }
  }

  // Mute/unmute audio
  async toggleMute() {
    try {
      this.isMuted = !this.isMuted;

      Sentry.addBreadcrumb({
        category: 'recording',
        message: this.isMuted ? 'Muting audio' : 'Unmuting audio',
        level: 'info',
        data: { sessionId: this.sessionId, isMuted: this.isMuted },
      });

      if (this.recordings.audio) {
        if (this.isMuted) {
          // Mute by setting volume to 0
          this.recordings.audio.audioFilters('volume=0');
        } else {
          // Unmute by removing volume filter
          this.recordings.audio.audioFilters('');
        }
      }

      this.sendMessage('audio-mute-toggled', {
        sessionId: this.sessionId,
        isMuted: this.isMuted,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'toggle-mute' },
      });
      this.sendError('Failed to toggle mute: ' + error.message);
    }
  }

  // Stop recording and combine files
  async stopRecording() {
    try {
      if (!this.isRecording) return;

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Stopping recording and combining files',
        level: 'info',
        data: { sessionId: this.sessionId },
      });

      this.isRecording = false;
      const duration = Date.now() - this.startTime - this.pauseTime;

      // Stop FFmpeg processes
      if (this.recordings.audio) {
        this.recordings.audio.kill('SIGTERM');
      }
      if (this.recordings.video) {
        this.recordings.video.kill('SIGTERM');
      }

      // Wait for processes to finish
      await this.waitForProcesses();

      // Combine audio and video files
      await this.combineAudioVideo();

      // Get recording stats
      await this.getRecordingStats();

      this.sendMessage('recording-stopped', {
        sessionId: this.sessionId,
        duration,
        stats: this.recordingStats,
        outputFile: this.tempFiles.combined,
      });

      // Cleanup temp files
      this.cleanupTempFiles();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'stop-recording' },
      });
      this.sendError('Failed to stop recording: ' + error.message);
    }
  }

  // Wait for FFmpeg processes to finish
  async waitForProcesses() {
    return new Promise(resolve => {
      let completedProcesses = 0;
      const totalProcesses =
        (this.recordings.audio ? 1 : 0) + (this.recordings.video ? 1 : 0);

      if (totalProcesses === 0) {
        resolve();
        return;
      }

      const checkCompletion = () => {
        completedProcesses++;
        if (completedProcesses >= totalProcesses) {
          resolve();
        }
      };

      if (this.recordings.audio) {
        this.recordings.audio.on('end', checkCompletion);
      }
      if (this.recordings.video) {
        this.recordings.video.on('end', checkCompletion);
      }
    });
  }

  // Combine audio and video files using FFmpeg
  async combineAudioVideo() {
    return new Promise((resolve, reject) => {
      try {
        const hasAudio = fs.existsSync(this.tempFiles.audio);
        const hasVideo = fs.existsSync(this.tempFiles.video);

        if (!hasAudio && !hasVideo) {
          throw new Error('No audio or video files to combine');
        }

        let command = ffmpeg();

        if (hasVideo) {
          command = command.input(this.tempFiles.video);
        }
        if (hasAudio) {
          command = command.input(this.tempFiles.audio);
        }

        command
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate('2500k')
          .audioBitrate('128k')
          .fps(30)
          .output(this.tempFiles.combined)
          .on('start', () => {
            console.log('Combining audio and video files...');
          })
          .on('progress', progress => {
            this.sendMessage('combine-progress', {
              sessionId: this.sessionId,
              progress: progress.percent,
            });
          })
          .on('end', () => {
            console.log('Audio and video combined successfully');
            resolve();
          })
          .on('error', error => {
            Sentry.captureException(error, {
              tags: { process: 'advanced-recording', action: 'combine-files' },
            });
            reject(error);
          })
          .run();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get recording statistics
  async getRecordingStats() {
    try {
      if (fs.existsSync(this.tempFiles.combined)) {
        const stats = fs.statSync(this.tempFiles.combined);
        this.recordingStats = {
          duration: this.recordingStats.duration,
          fileSize: stats.size,
          fps: 30,
          bitrate: Math.round(
            (stats.size * 8) / (this.recordingStats.duration / 1000)
          ),
        };
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'get-stats' },
      });
    }
  }

  // Generate temp file path
  generateTempFile(type, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const recordingsDir = path.join(process.cwd(), 'recordings', 'temp');

    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    return path.join(
      recordingsDir,
      `${this.sessionId}-${type}-${timestamp}.${extension}`
    );
  }

  // Cleanup temp files
  cleanupTempFiles() {
    try {
      Object.values(this.tempFiles).forEach(file => {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'cleanup' },
      });
    }
  }

  // Get recording status
  getStatus() {
    return {
      sessionId: this.sessionId,
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      isMuted: this.isMuted,
      devices: this.devices,
      stats: this.recordingStats,
    };
  }

  // Send message to main process
  sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({ type, data });
    }
  }

  // Send error to main process
  sendError(message) {
    if (parentPort) {
      parentPort.postMessage({ type: 'error', error: message });
    }
  }
}

// Global recording session
let currentSession = null;

// Handle messages from main process
if (parentPort) {
  parentPort.on('message', async message => {
    try {
      switch (message.type) {
        case 'initialize-devices':
          if (!currentSession) {
            currentSession = new AdvancedRecordingSession();
          }
          await currentSession.initializeDevices(message.deviceIds);
          break;

        case 'start-recording':
          if (!currentSession) {
            currentSession = new AdvancedRecordingSession();
          }
          await currentSession.startRecording(message.options);
          break;

        case 'pause-recording':
          if (currentSession) {
            await currentSession.pauseRecording();
          }
          break;

        case 'resume-recording':
          if (currentSession) {
            await currentSession.resumeRecording();
          }
          break;

        case 'toggle-mute':
          if (currentSession) {
            await currentSession.toggleMute();
          }
          break;

        case 'stop-recording':
          if (currentSession) {
            await currentSession.stopRecording();
            currentSession = null;
          }
          break;

        case 'get-status':
          const status = currentSession ? currentSession.getStatus() : null;
          parentPort.postMessage({ type: 'status', data: status });
          break;

        case 'ping':
          parentPort.postMessage({ type: 'pong' });
          break;

        default:
          Sentry.captureMessage(
            'Unknown message type in advanced recording process',
            {
              level: 'warning',
              tags: {
                process: 'advanced-recording',
                messageType: message.type,
              },
            }
          );
          break;
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'advanced-recording', action: 'handle-message' },
      });
      parentPort.postMessage({ type: 'error', error: error.message });
    }
  });
}

// Handle process errors
process.on('uncaughtException', error => {
  Sentry.captureException(error, {
    tags: { process: 'advanced-recording', error: 'uncaught-exception' },
  });
  if (parentPort) {
    parentPort.postMessage({
      type: 'error',
      error: 'Uncaught exception: ' + error.message,
    });
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Sentry.captureException(new Error('Unhandled rejection'), {
    tags: { process: 'advanced-recording', error: 'unhandled-rejection' },
    extra: { reason, promise },
  });
  if (parentPort) {
    parentPort.postMessage({
      type: 'error',
      error: 'Unhandled rejection: ' + reason,
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Sentry.addBreadcrumb({
    category: 'advanced-recording',
    message: 'Advanced recording process shutting down',
    level: 'info',
  });

  if (currentSession && currentSession.isRecording) {
    currentSession.stopRecording();
  }

  process.exit(0);
});

console.log('Advanced recording process started');
