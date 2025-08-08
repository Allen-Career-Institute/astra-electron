const { parentPort } = require('worker_threads');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');

// Initialize Sentry for the recording process
function initializeRecordingSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    Sentry.init({
      dsn: dsn,
      environment: environment,
      debug: environment === 'development',
      integrations: [
        new Sentry.Integrations.GlobalHandlers({
          onerror: true,
          onunhandledrejection: true,
        }),
        new Sentry.Integrations.Process({
          onerror: true,
        }),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      attachStacktrace: true,
      includeLocalVariables: true,
      release: process.env.APP_VERSION || '1.0.0',
      dist: 'recording-process',
    });

    console.log(
      `Recording process Sentry initialized for environment: ${environment}`
    );
  }
}

// Initialize Sentry
initializeRecordingSentry();

// Video processing class
class VideoProcessor {
  constructor() {
    this.isProcessing = false;
    this.currentStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.outputPath = null;
  }

  async startRecording(streamData, options = {}) {
    try {
      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Starting video recording',
        level: 'info',
        data: { options },
      });

      this.isProcessing = true;
      this.outputPath = options.outputPath || this.generateOutputPath();

      // Create MediaRecorder with the stream
      this.mediaRecorder = new MediaRecorder(streamData, {
        mimeType: options.mimeType || 'video/webm;codecs=vp9',
        videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.saveRecording();
      };

      this.mediaRecorder.onerror = error => {
        Sentry.captureException(error, {
          tags: { process: 'recording', action: 'media-recorder-error' },
        });
        this.sendError('MediaRecorder error: ' + error.message);
      };

      this.mediaRecorder.start(options.timeslice || 1000);

      this.sendMessage('recording-started', { outputPath: this.outputPath });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'start-recording' },
      });
      this.sendError('Failed to start recording: ' + error.message);
    }
  }

  async stopRecording() {
    try {
      if (this.mediaRecorder && this.isProcessing) {
        this.mediaRecorder.stop();
        this.isProcessing = false;

        Sentry.addBreadcrumb({
          category: 'recording',
          message: 'Stopping video recording',
          level: 'info',
        });

        this.sendMessage('recording-stopped', { outputPath: this.outputPath });
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'stop-recording' },
      });
      this.sendError('Failed to stop recording: ' + error.message);
    }
  }

  async saveRecording() {
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Save to file
      fs.writeFileSync(this.outputPath, Buffer.from(uint8Array));

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Recording saved successfully',
        level: 'info',
        data: { outputPath: this.outputPath, size: uint8Array.length },
      });

      this.sendMessage('recording-saved', {
        outputPath: this.outputPath,
        size: uint8Array.length,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'save-recording' },
      });
      this.sendError('Failed to save recording: ' + error.message);
    }
  }

  generateOutputPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const recordingsDir = path.join(process.cwd(), 'recordings');

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    return path.join(recordingsDir, `recording-${timestamp}.webm`);
  }

  sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({ type, data });
    }
  }

  sendError(message) {
    if (parentPort) {
      parentPort.postMessage({ type: 'error', error: message });
    }
  }
}

// Audio processing class
class AudioProcessor {
  constructor() {
    this.isProcessing = false;
    this.currentStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.outputPath = null;
  }

  async startRecording(streamData, options = {}) {
    try {
      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Starting audio recording',
        level: 'info',
        data: { options },
      });

      this.isProcessing = true;
      this.outputPath = options.outputPath || this.generateOutputPath();

      // Create MediaRecorder for audio only
      this.mediaRecorder = new MediaRecorder(streamData, {
        mimeType: options.mimeType || 'audio/webm;codecs=opus',
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.saveRecording();
      };

      this.mediaRecorder.onerror = error => {
        Sentry.captureException(error, {
          tags: { process: 'recording', action: 'audio-recorder-error' },
        });
        this.sendError('Audio MediaRecorder error: ' + error.message);
      };

      this.mediaRecorder.start(options.timeslice || 1000);

      this.sendMessage('audio-recording-started', {
        outputPath: this.outputPath,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'start-audio-recording' },
      });
      this.sendError('Failed to start audio recording: ' + error.message);
    }
  }

  async stopRecording() {
    try {
      if (this.mediaRecorder && this.isProcessing) {
        this.mediaRecorder.stop();
        this.isProcessing = false;

        Sentry.addBreadcrumb({
          category: 'recording',
          message: 'Stopping audio recording',
          level: 'info',
        });

        this.sendMessage('audio-recording-stopped', {
          outputPath: this.outputPath,
        });
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'stop-audio-recording' },
      });
      this.sendError('Failed to stop audio recording: ' + error.message);
    }
  }

  async saveRecording() {
    try {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Save to file
      fs.writeFileSync(this.outputPath, Buffer.from(uint8Array));

      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Audio recording saved successfully',
        level: 'info',
        data: { outputPath: this.outputPath, size: uint8Array.length },
      });

      this.sendMessage('audio-recording-saved', {
        outputPath: this.outputPath,
        size: uint8Array.length,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'save-audio-recording' },
      });
      this.sendError('Failed to save audio recording: ' + error.message);
    }
  }

  generateOutputPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const recordingsDir = path.join(process.cwd(), 'recordings');

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    return path.join(recordingsDir, `audio-${timestamp}.webm`);
  }

  sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({ type, data });
    }
  }

  sendError(message) {
    if (parentPort) {
      parentPort.postMessage({ type: 'error', error: message });
    }
  }
}

// Initialize processors
const videoProcessor = new VideoProcessor();
const audioProcessor = new AudioProcessor();

// Handle messages from main process
if (parentPort) {
  parentPort.on('message', async message => {
    try {
      switch (message.type) {
        case 'start-video-recording':
          await videoProcessor.startRecording(
            message.streamData,
            message.options
          );
          break;

        case 'stop-video-recording':
          await videoProcessor.stopRecording();
          break;

        case 'start-audio-recording':
          await audioProcessor.startRecording(
            message.streamData,
            message.options
          );
          break;

        case 'stop-audio-recording':
          await audioProcessor.stopRecording();
          break;

        case 'ping':
          parentPort.postMessage({ type: 'pong' });
          break;

        default:
          Sentry.captureMessage('Unknown message type in recording process', {
            level: 'warning',
            tags: { process: 'recording', messageType: message.type },
          });
          break;
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { process: 'recording', action: 'handle-message' },
      });
      parentPort.postMessage({ type: 'error', error: error.message });
    }
  });
}

// Handle process errors
process.on('uncaughtException', error => {
  Sentry.captureException(error, {
    tags: { process: 'recording', error: 'uncaught-exception' },
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
    tags: { process: 'recording', error: 'unhandled-rejection' },
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
    category: 'recording',
    message: 'Recording process shutting down',
    level: 'info',
  });

  if (videoProcessor.isProcessing) {
    videoProcessor.stopRecording();
  }
  if (audioProcessor.isProcessing) {
    audioProcessor.stopRecording();
  }

  process.exit(0);
});

console.log('Recording process started');
