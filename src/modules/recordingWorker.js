#!/usr/bin/env node

/**
 * Recording Worker Process
 * Handles audio/video recording with chunking and optimal memory usage
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Get command line arguments
const meetingId = process.argv[2];
const configStr = process.argv[3];

if (!meetingId || !configStr) {
  console.error('Usage: node recordingWorker.js <meetingId> <config>');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(configStr);
} catch (error) {
  console.error('Invalid config JSON:', error);
  process.exit(1);
}

// Recording state
let currentChunk = 0;
let isRecording = false;
let recordingProcess = null;
let chunkTimer = null;
let memoryUsage = {};
let chunkStartTime = null;

// Paths
const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);
const chunksDir = path.join(recordingsDir, 'chunks');

// Ensure directories exist
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

// Enhanced memory monitoring with configurable limits
function monitorMemoryUsage() {
  const memUsage = process.memoryUsage();
  memoryUsage = {
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
    timestamp: Date.now(),
  };

  // Log memory usage every 15 seconds (reduced frequency)
  if (currentChunk % 3 === 0) {
    console.log('Memory usage:', memoryUsage);
  }

  // Check if memory usage is too high
  const memoryLimit = config.memoryLimit || 500; // MB
  if (memoryUsage.heapUsed > memoryLimit) {
    console.warn(
      `High memory usage detected (${memoryUsage.heapUsed}MB > ${memoryLimit}MB), considering restart`
    );
    process.send({
      type: 'warning',
      message: `High memory usage: ${memoryUsage.heapUsed}MB`,
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }
}

// Start memory monitoring with configurable interval
const memoryMonitor = setInterval(monitorMemoryUsage, 15000);

// Create chunk filename with better naming convention
function getChunkFilename(chunkNumber) {
  const timestamp = Date.now();
  return path.join(
    chunksDir,
    `chunk_${chunkNumber.toString().padStart(6, '0')}_${timestamp}.mp4`
  );
}

// Start recording a new chunk with improved error handling
function startNewChunk() {
  try {
    if (recordingProcess && !recordingProcess.killed) {
      recordingProcess.kill('SIGTERM');

      // Wait a bit for process to terminate
      setTimeout(() => {
        if (recordingProcess && !recordingProcess.killed) {
          recordingProcess.kill('SIGKILL');
        }
      }, 2000);
    }

    const chunkFile = getChunkFilename(currentChunk);
    chunkStartTime = Date.now();

    // Enhanced FFmpeg command for better performance and memory usage
    const ffmpegArgs = [
      '-f',
      'avfoundation', // macOS audio/video capture
      '-i',
      '0:0', // Capture from default camera and microphone
      '-c:v',
      config.videoCodec || 'libx264',
      '-c:a',
      config.audioCodec || 'aac',
      '-b:v',
      config.videoBitrate || '1500k',
      '-b:a',
      config.audioBitrate || '96k',
      '-r',
      (config.fps || 25).toString(),
      '-s',
      config.resolution || '1280x720',
      '-preset',
      config.preset || 'ultrafast',
      '-tune',
      config.tune || 'zerolatency',
      '-g',
      '30', // Keyframe interval for better chunking
      '-sc_threshold',
      '0', // Disable scene change detection
      '-f',
      'mp4',
      '-movflags',
      '+faststart', // Optimize for streaming
      '-y', // Overwrite output files
      chunkFile,
    ];

    // Platform-specific adjustments
    if (process.platform === 'win32') {
      ffmpegArgs[1] = 'dshow'; // DirectShow for Windows
    } else if (process.platform === 'linux') {
      ffmpegArgs[1] = 'v4l2'; // Video4Linux2 for Linux
    }

    console.log(`Starting chunk ${currentChunk} with FFmpeg args:`, ffmpegArgs);

    // Use ffmpeg-static binary
    const ffmpegPath = require('ffmpeg-static');
    recordingProcess = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    recordingProcess.stdout.on('data', data => {
      // Only log in development or for errors
      if (process.env.NODE_ENV === 'development') {
        console.log(`FFmpeg stdout: ${data}`);
      }
    });

    recordingProcess.stderr.on('data', data => {
      const dataStr = data.toString();
      // Only log errors and important warnings
      if (
        dataStr.includes('error') ||
        dataStr.includes('Error') ||
        dataStr.includes('WARNING')
      ) {
        console.log(`FFmpeg stderr: ${dataStr}`);
      }
    });

    recordingProcess.on('error', error => {
      console.error(`FFmpeg process error: ${error}`);
      process.send({ type: 'error', error: error.message });
    });

    recordingProcess.on('exit', (code, signal) => {
      if (code === 0 || code === null) {
        console.log(`Chunk ${currentChunk} completed successfully`);

        // Verify chunk file exists and has content
        if (fs.existsSync(chunkFile)) {
          const stats = fs.statSync(chunkFile);
          if (stats.size > 0) {
            // Send chunk info to parent process
            const chunkInfo = {
              number: currentChunk,
              filename: path.basename(chunkFile),
              filepath: chunkFile,
              startTime: chunkStartTime,
              endTime: Date.now(),
              size: stats.size,
              duration: Date.now() - chunkStartTime,
              memoryUsage: { ...memoryUsage },
            };

            process.send({ type: 'chunk_created', chunk: chunkInfo });

            // Move to next chunk
            currentChunk++;

            // Check if we've reached max chunks
            if (currentChunk >= (config.maxChunks || 50)) {
              console.log('Maximum chunks reached, stopping recording');
              stopRecording();
              return;
            }

            // Schedule next chunk
            scheduleNextChunk();
          } else {
            console.error(`Chunk file is empty: ${chunkFile}`);
            process.send({ type: 'error', error: 'Chunk file is empty' });
          }
        } else {
          console.error(`Chunk file not found: ${chunkFile}`);
          process.send({ type: 'error', error: 'Chunk file not found' });
        }
      } else {
        console.error(
          `FFmpeg process exited with code ${code}, signal ${signal}`
        );
        process.send({
          type: 'error',
          error: `FFmpeg exited with code ${code}`,
        });
      }
    });

    isRecording = true;
  } catch (error) {
    console.error('Error starting new chunk:', error);
    process.send({ type: 'error', error: error.message });
  }
}

// Schedule next chunk with configurable duration
function scheduleNextChunk() {
  if (chunkTimer) {
    clearTimeout(chunkTimer);
  }

  const chunkDuration = config.chunkDuration || 30000;
  chunkTimer = setTimeout(() => {
    if (isRecording) {
      startNewChunk();
    }
  }, chunkDuration);
}

// Enhanced stop recording function
function stopRecording() {
  try {
    isRecording = false;

    if (chunkTimer) {
      clearTimeout(chunkTimer);
      chunkTimer = null;
    }

    if (recordingProcess && !recordingProcess.killed) {
      recordingProcess.kill('SIGTERM');

      // Force kill if needed
      setTimeout(() => {
        if (recordingProcess && !recordingProcess.killed) {
          recordingProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    console.log('Recording stopped');
    process.send({ type: 'recording_stopped', chunks: currentChunk });

    // Clean up and exit
    setTimeout(() => {
      clearInterval(memoryMonitor);
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error stopping recording:', error);
    process.exit(1);
  }
}

// Enhanced signal handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping recording');
  stopRecording();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping recording');
  stopRecording();
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  process.send({ type: 'error', error: error.message });
  stopRecording();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.send({ type: 'error', error: `Unhandled rejection: ${reason}` });
  stopRecording();
});

// Process monitoring
process.on('exit', code => {
  console.log(`Recording worker process exiting with code: ${code}`);
  clearInterval(memoryMonitor);
});

// Start recording
console.log(`Starting recording for meeting: ${meetingId}`);
console.log('Recording config:', config);

// Send ready signal
process.send({ type: 'ready', meetingId, config });

// Start first chunk
startNewChunk();

// Keep process alive
process.stdin.resume();
