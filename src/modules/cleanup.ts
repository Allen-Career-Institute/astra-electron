import { dialog } from 'electron';
import { getMainWindow } from './windowManager';
import { safeCloseStreamWindow } from './streamWindow';
import { safeClosewhiteboardWindow } from './whiteboard-window';
import { isDev } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { stopProcessMonitoring } from './processMonitor';
import * as Sentry from '@sentry/electron/main';
import { rollingMergeManager } from './rollingMergeManager';
import { safeCloseScreenShareWindow } from './screenShareWindow';

// Track if cleanup is currently running
let isCleanupRunning = false;

function cleanup(): void {
  const mainWindow = getMainWindow();
  cleanupNonMainWindow();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
}

function cleanupNonMainWindow(): void {
  safeCloseStreamWindow();
  safeClosewhiteboardWindow();
  safeCloseScreenShareWindow();
  stopProcessMonitoring();
  rollingMergeManager.cleanup();
}

function handleUncaughtException(error: Error): void {
  console.error('Uncaught Exception:', error);

  if (isDev()) {
    dialog.showErrorBox(
      'Uncaught Exception',
      `An uncaught exception occurred: ${error.message}\n\nStack: ${error.stack}`
    );
  } else {
    Sentry.captureException(error);
  }
}

function handleUnhandledRejection(
  reason: unknown,
  promise: Promise<unknown>
): void {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);

  if (isDev()) {
    dialog.showErrorBox(
      'Unhandled Rejection',
      `An unhandled rejection occurred: ${reason}`
    );
  }
}

function setupCleanupHandlers(): void {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
}

/**
 * Clean up recording folders older than 3 days
 * Runs as a separate process and gets closed once done
 */
function cleanupOldRecordings(): void {
  // Check if cleanup is already running
  if (isCleanupRunning) {
    console.log('[Cleanup Process] Cleanup already in progress, skipping...');
    return;
  }

  try {
    isCleanupRunning = true;

    // Get the path to the cleanup script
    // Use dist directory for production, src for development
    const isProduction = !isDev();
    const baseDir = isProduction ? path.join(__dirname, '..') : __dirname;
    const cleanupScriptPath = path.join(baseDir, 'cleanup-worker.js');

    // Create the cleanup worker script if it doesn't exist
    createCleanupWorkerScript(cleanupScriptPath);

    // Spawn a separate process for cleanup
    const cleanupProcess = spawn('node', [cleanupScriptPath], {
      detached: true, // Detach from parent process
      stdio: 'pipe', // Pipe stdio for logging
      cwd: process.cwd(),
    });

    // Set a timeout to kill the process if it takes too long (5 minutes)
    const timeout = setTimeout(
      () => {
        if (!cleanupProcess.killed) {
          console.warn('[Cleanup Process] Timeout reached, killing process');
          cleanupProcess.kill('SIGTERM');

          // Clean up the worker script on timeout
          try {
            if (fs.existsSync(cleanupScriptPath)) {
              fs.unlinkSync(cleanupScriptPath);
            }
          } catch (error) {
            console.error('Failed to cleanup worker script on timeout:', error);
          }
        }

        // Reset running state
        isCleanupRunning = false;
      },
      5 * 60 * 1000
    ); // 5 minutes

    // Handle process output
    cleanupProcess.stdout?.on('data', data => {
      console.log(`[Cleanup Process] ${data.toString().trim()}`);
    });

    cleanupProcess.stderr?.on('data', data => {
      console.error(`[Cleanup Process Error] ${data.toString().trim()}`);
    });

    // Handle process completion
    cleanupProcess.on('close', (code: number) => {
      // Clear the timeout since process completed
      clearTimeout(timeout);

      if (code === 0) {
        console.log('[Cleanup Process] Completed successfully');
      } else {
        console.error(`[Cleanup Process] Exited with code ${code}`);
      }

      // Clean up the worker script
      try {
        if (fs.existsSync(cleanupScriptPath)) {
          fs.unlinkSync(cleanupScriptPath);
        }
      } catch (error) {
        console.error('Failed to cleanup worker script:', error);
      }

      // Reset running state
      isCleanupRunning = false;
    });

    // Handle process errors
    cleanupProcess.on('error', error => {
      // Clear the timeout since process failed
      clearTimeout(timeout);

      console.error('[Cleanup Process] Failed to start:', error);

      // Clean up the worker script on error
      try {
        if (fs.existsSync(cleanupScriptPath)) {
          fs.unlinkSync(cleanupScriptPath);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup worker script:', error);
      }

      // Reset running state
      isCleanupRunning = false;
    });

    // Unref the process so it doesn't keep the main process alive
    cleanupProcess.unref();

    console.log('[Cleanup Process] Started cleanup in separate process');
  } catch (error) {
    console.error('Error starting cleanup process:', error);
    // Reset running state on error
    isCleanupRunning = false;
  }
}

/**
 * Create the cleanup worker script
 */
function createCleanupWorkerScript(scriptPath: string): void {
  try {
    const workerScript = `
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Clean up recording folders older than 3 days
 */
function cleanupOldRecordings() {
  try {
    // Get user data path (equivalent to app.getPath('userData'))
    let userDataPath = path.join(os.homedir(), '.config', 'astra-electron');
    
    // For macOS, use the correct path
    if (process.platform === 'darwin') {
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'astra-electron');
    }
    
    const recordingsDir = path.join(userDataPath, 'recordings');
    
    // Check if recordings directory exists
    if (!fs.existsSync(recordingsDir)) {
      console.log('Recordings directory does not exist, skipping cleanup');
      return;
    }

    const currentTime = Date.now();
    const fiveDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    
    // Read all meeting folders in recordings directory
    const meetingFolders = fs.readdirSync(recordingsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let cleanedCount = 0;

    for (const meetingFolder of meetingFolders) {
      const meetingPath = path.join(recordingsDir, meetingFolder);
      
      try {
        const stats = fs.statSync(meetingPath);
        const folderAge = currentTime - stats.mtime.getTime();
        
        // Check if folder is older than 3 days
        if (folderAge > fiveDaysInMs) {
          // Remove the entire meeting folder and all its contents
          fs.rmSync(meetingPath, { recursive: true, force: true });
          
          cleanedCount++;
          console.log(\`Cleaned up old recording folder: \${meetingFolder} (age: \${Math.round(folderAge / (24 * 60 * 60 * 1000))} days)\`);
        }
      } catch (error) {
        console.error(\`Error processing meeting folder \${meetingFolder}:\`, error);
      }
    }

    if (cleanedCount > 0) {
      console.log(\`Recording cleanup completed: \${cleanedCount} folders removed\`);
    } else {
      console.log('No old recording folders found to clean up');
    }
  } catch (error) {
    console.error('Error during recording cleanup:', error);
    process.exit(1);
  }
}





// Run cleanup and exit
cleanupOldRecordings();
process.exit(0);
`;

    fs.writeFileSync(scriptPath, workerScript);
  } catch (error) {
    console.error('Failed to create cleanup worker script:', error);
    throw error;
  }
}

/**
 * Check if cleanup is currently running
 */
function isCleanupInProgress(): boolean {
  return isCleanupRunning;
}

/**
 * Manually trigger cleanup (useful for testing or manual cleanup)
 */
function triggerManualCleanup(): void {
  if (isCleanupRunning) {
    console.log(
      '[Cleanup Process] Cleanup already in progress, cannot trigger manual cleanup'
    );
    return;
  }

  console.log('[Cleanup Process] Manual cleanup triggered');
  cleanupOldRecordings();
}

/**
 * Set up periodic cleanup of old recordings (every 24 hours)
 */
function setupPeriodicCleanup(): void {
  // Clean up every 24 hours (24 * 60 * 60 * 1000 milliseconds)
  const cleanupInterval = 24 * 60 * 60 * 1000;

  setInterval(() => {
    try {
      console.log('Running periodic recording cleanup...');
      cleanupOldRecordings();
    } catch (error) {
      console.error('Error during periodic cleanup:', error);
    }
  }, cleanupInterval);

  console.log('Periodic recording cleanup scheduled (every 24 hours)');
}

export {
  cleanup,
  handleUncaughtException,
  handleUnhandledRejection,
  setupCleanupHandlers,
  cleanupOldRecordings,
  setupPeriodicCleanup,
  isCleanupInProgress,
  triggerManualCleanup,
  cleanupNonMainWindow,
};
