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
 * Clean up recording folders older than 10 minutes
 * Runs as a separate process that automatically exits when done
 */
function cleanupOldRecordings(): void {
  // Check if cleanup is already running
  if (isCleanupRunning) {
    console.log('[Cleanup Process] Cleanup already in progress, skipping...');
    return;
  }

  try {
    isCleanupRunning = true;

    // Get the path to the cleanup task script (always in dist/scripts after build)
    const cleanupScriptPath = path.join(
      __dirname,
      '..',
      'scripts',
      'cleanup-task.js'
    );

    // Check if the script exists
    if (!fs.existsSync(cleanupScriptPath)) {
      console.error(
        '[Cleanup Process] Cleanup script not found:',
        cleanupScriptPath
      );
      isCleanupRunning = false;
      return;
    }

    console.log(
      '[Cleanup Process] Starting cleanup task in separate process...'
    );

    // Spawn a separate Node.js process for cleanup
    const cleanupProcess = spawn('node', [cleanupScriptPath], {
      detached: true,
      stdio: 'pipe',
    });

    // Set a timeout to kill the process if it takes too long (5 minutes)
    const timeout = setTimeout(
      () => {
        if (!cleanupProcess.killed) {
          console.warn('[Cleanup Process] Timeout reached, killing process');
          cleanupProcess.kill('SIGTERM');
        }
        isCleanupRunning = false;
      },
      5 * 60 * 1000
    );

    // Handle process output
    cleanupProcess.stdout?.on('data', data => {
      console.log(`[Cleanup Process] ${data.toString().trim()}`);
    });

    cleanupProcess.stderr?.on('data', data => {
      console.error(`[Cleanup Process Error] ${data.toString().trim()}`);
    });

    // Handle process completion (process will exit automatically)
    cleanupProcess.on('close', (code: number | null) => {
      clearTimeout(timeout);

      if (code === 0) {
        console.log('[Cleanup Process] Completed successfully and exited');
      } else {
        console.error(`[Cleanup Process] Exited with code ${code}`);
      }

      isCleanupRunning = false;
    });

    // Handle process errors
    cleanupProcess.on('error', error => {
      clearTimeout(timeout);
      console.error('[Cleanup Process] Failed to start:', error);
      isCleanupRunning = false;
    });

    // Unref the process so it doesn't keep the main process alive
    cleanupProcess.unref();
  } catch (error) {
    console.error('[Cleanup Process] Error starting cleanup process:', error);
    isCleanupRunning = false;
  }
}

/**
 * Set up periodic cleanup of old recordings (every 10 minutes)
 * Each cleanup runs as a separate process that automatically exits when done
 */
function setupPeriodicCleanup(): void {
  const cleanupInterval = 1 * 60 * 1000; // 1 minutes
  // const cleanupInterval = 30 * 60 * 1000; // 30 minutes

  // Schedule periodic cleanup
  setInterval(() => {
    try {
      console.log('[Cleanup Scheduler] Running periodic recording cleanup...');
      cleanupOldRecordings();
    } catch (error) {
      Sentry.captureException(error);
    }
  }, cleanupInterval);

  console.log(
    `[Cleanup Scheduler] Periodic recording cleanup scheduled (every ${cleanupInterval / 60000} minutes)`
  );
}

export {
  cleanup,
  handleUncaughtException,
  handleUnhandledRejection,
  setupCleanupHandlers,
  cleanupOldRecordings,
  setupPeriodicCleanup,
  cleanupNonMainWindow,
};
