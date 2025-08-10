#!/usr/bin/env node

/**
 * Combining Worker Process
 * Combines video chunks into a final video file with improved error handling
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Get command line arguments
const meetingId = process.argv[2];
const metadataStr = process.argv[3];

if (!meetingId || !metadataStr) {
  console.error('Usage: node combiningWorker.js <meetingId> <metadata>');
  process.exit(1);
}

let metadata;
try {
  metadata = JSON.parse(metadataStr);
} catch (error) {
  console.error('Invalid metadata JSON:', error);
  process.exit(1);
}

// Paths
const recordingsDir = path.join(process.cwd(), 'recordings', meetingId);
const chunksDir = path.join(recordingsDir, 'chunks');
const outputFile = path.join(recordingsDir, `final_${meetingId}.mp4`);
const concatFile = path.join(recordingsDir, 'concat.txt');
const tempOutputFile = path.join(recordingsDir, `temp_final_${meetingId}.mp4`);

// Ensure directories exist
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Enhanced chunk validation with ordering
function validateChunks() {
  try {
    const chunks = metadata.chunks || [];
    if (chunks.length === 0) {
      console.error('No chunks found to combine');
      return false;
    }

    // Sort chunks by number to ensure correct order
    chunks.sort((a, b) => a.number - b.number);

    // Check if all chunk files exist and have content
    const validChunks = [];
    for (const chunk of chunks) {
      const chunkPath = path.join(chunksDir, chunk.filename);
      if (fs.existsSync(chunkPath)) {
        const stats = fs.statSync(chunkPath);
        if (stats.size > 0) {
          validChunks.push(chunk);
        } else {
          console.warn(`Chunk file is empty: ${chunkPath}`);
        }
      } else {
        console.warn(`Chunk file not found: ${chunkPath}`);
      }
    }

    if (validChunks.length === 0) {
      console.error('No valid chunks found to combine');
      return false;
    }

    if (validChunks.length !== chunks.length) {
      console.warn(
        `Some chunks are invalid. Valid: ${validChunks.length}, Total: ${chunks.length}`
      );
      // Update metadata with only valid chunks
      metadata.chunks = validChunks;
    }

    console.log(`Found ${validChunks.length} valid chunks to combine`);
    return true;
  } catch (error) {
    console.error('Error validating chunks:', error);
    return false;
  }
}

// Create concat file for FFmpeg with better error handling
function createConcatFile() {
  try {
    const chunks = metadata.chunks || [];
    const concatLines = [];

    // Sort chunks by number to ensure correct order
    chunks.sort((a, b) => a.number - b.number);

    for (const chunk of chunks) {
      const chunkPath = path.join(chunksDir, chunk.filename);
      if (fs.existsSync(chunkPath)) {
        // Escape single quotes in file path
        const escapedPath = chunkPath.replace(/'/g, "'\"'\"'");
        concatLines.push(`file '${escapedPath}'`);
      }
    }

    if (concatLines.length === 0) {
      throw new Error('No valid chunk paths found');
    }

    const concatContent = concatLines.join('\n');
    fs.writeFileSync(concatFile, concatContent);

    console.log(`Created concat file with ${concatLines.length} entries`);
    return true;
  } catch (error) {
    console.error('Error creating concat file:', error);
    return false;
  }
}

// Enhanced chunk combining with retry logic
function combineChunks() {
  return new Promise((resolve, reject) => {
    try {
      // Use temporary output file first
      const finalOutputFile = tempOutputFile;

      // Enhanced FFmpeg command for better combining
      const ffmpegArgs = [
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatFile,
        '-c',
        'copy', // Copy streams without re-encoding for speed
        '-avoid_negative_ts',
        'make_zero', // Handle timestamp issues
        '-fflags',
        '+genpts', // Generate presentation timestamps
        '-y', // Overwrite output file
        finalOutputFile,
      ];

      console.log('Starting FFmpeg combining process with args:', ffmpegArgs);

      // Use ffmpeg-static binary
      const ffmpegPath = require('ffmpeg-static');
      const combiningProcess = spawn(ffmpegPath, ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      let stdout = '';
      let stderr = '';
      let hasError = false;

      combiningProcess.stdout.on('data', data => {
        stdout += data.toString();
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`FFmpeg stdout: ${data}`);
        }
      });

      combiningProcess.stderr.on('data', data => {
        stderr += data.toString();
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

      combiningProcess.on('error', error => {
        console.error(`FFmpeg process error: ${error}`);
        hasError = true;
        reject(error);
      });

      combiningProcess.on('exit', (code, signal) => {
        if (code === 0 && !hasError) {
          console.log('FFmpeg combining process completed successfully');

          // Verify output file
          if (fs.existsSync(finalOutputFile)) {
            const stats = fs.statSync(finalOutputFile);
            if (stats.size > 0) {
              // Move temporary file to final location
              try {
                fs.renameSync(finalOutputFile, outputFile);
                console.log(
                  `Final video created: ${outputFile} (${Math.round(stats.size / 1024 / 1024)} MB)`
                );

                // Update metadata
                updateFinalMetadata(stats);

                resolve({
                  success: true,
                  outputFile,
                  size: stats.size,
                  chunks: metadata.chunks.length,
                });
              } catch (renameError) {
                console.error('Error renaming temporary file:', renameError);
                reject(renameError);
              }
            } else {
              reject(new Error('Output file is empty after combining'));
            }
          } else {
            reject(new Error('Output file not found after combining'));
          }
        } else {
          console.error(
            `FFmpeg process exited with code ${code}, signal ${signal}`
          );
          if (stderr) {
            console.error('FFmpeg stderr output:', stderr);
          }
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    } catch (error) {
      console.error('Error starting combining process:', error);
      reject(error);
    }
  });
}

// Update metadata with final video info and chunk details
function updateFinalMetadata(stats) {
  try {
    const metadataPath = path.join(recordingsDir, 'metadata.json');

    if (fs.existsSync(metadataPath)) {
      const currentMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      currentMetadata.finalVideo = {
        filepath: outputFile,
        filename: path.basename(outputFile),
        size: stats.size,
        createdAt: Date.now(),
        duration: calculateTotalDuration(),
        chunks: currentMetadata.chunks.length,
        chunkDetails: currentMetadata.chunks.map(chunk => ({
          number: chunk.number,
          filename: chunk.filename,
          size: chunk.size,
          duration: chunk.duration,
        })),
      };

      currentMetadata.status = 'completed';
      currentMetadata.endTime = Date.now();
      currentMetadata.processingTime =
        currentMetadata.endTime - currentMetadata.startTime;

      fs.writeFileSync(metadataPath, JSON.stringify(currentMetadata, null, 2));
      console.log('Updated metadata with final video information');
    }
  } catch (error) {
    console.error('Error updating metadata:', error);
  }
}

// Calculate total duration from chunks with validation
function calculateTotalDuration() {
  try {
    const chunks = metadata.chunks || [];
    let totalDuration = 0;
    let validChunks = 0;

    for (const chunk of chunks) {
      if (chunk.duration && chunk.duration > 0) {
        totalDuration += chunk.duration;
        validChunks++;
      }
    }

    if (validChunks === 0) {
      console.warn(
        'No valid chunk durations found, using timestamp difference'
      );
      if (chunks.length > 0) {
        const firstChunk = chunks[0];
        const lastChunk = chunks[chunks.length - 1];
        if (firstChunk.startTime && lastChunk.endTime) {
          totalDuration = lastChunk.endTime - firstChunk.startTime;
        }
      }
    }

    return totalDuration;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
}

// Enhanced cleanup with better error handling
function cleanup() {
  try {
    // Remove concat file
    if (fs.existsSync(concatFile)) {
      fs.unlinkSync(concatFile);
      console.log('Removed temporary concat file');
    }

    // Remove temporary output file if it exists
    if (fs.existsSync(tempOutputFile)) {
      fs.unlinkSync(tempOutputFile);
      console.log('Removed temporary output file');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Main combining process with retry logic
async function main() {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log(
        `Starting combining process for meeting: ${meetingId} (attempt ${retryCount + 1}/${maxRetries})`
      );
      console.log('Metadata:', metadata);

      // Validate chunks
      if (!validateChunks()) {
        throw new Error('Chunk validation failed');
      }

      // Create concat file
      if (!createConcatFile()) {
        throw new Error('Failed to create concat file');
      }

      // Combine chunks
      const result = await combineChunks();
      console.log('Combining completed successfully:', result);

      // Clean up
      cleanup();

      // Exit successfully
      process.exit(0);
    } catch (error) {
      console.error(
        `Error in combining process (attempt ${retryCount + 1}):`,
        error
      );
      retryCount++;

      if (retryCount < maxRetries) {
        console.log(`Retrying in 5 seconds... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('Maximum retry attempts reached, exiting with error');

        // Clean up on final error
        cleanup();

        // Exit with error
        process.exit(1);
      }
    }
  }
}

// Enhanced signal handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  cleanup();
  process.exit(1);
});

// Start the combining process
main();
