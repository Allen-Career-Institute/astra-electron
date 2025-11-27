import { dialog } from 'electron';
import { getMainWindow } from './windowManager';
import { safeCloseStreamWindow } from './streamWindow';
import { safeClosewhiteboardWindow } from './whiteboard-window';
import { isDev } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { fork } from 'child_process';
import { stopProcessMonitoring } from './processMonitor';
import * as Sentry from '@sentry/electron/main';
import { rollingMergeManager } from './rollingMergeManager';
import { safeCloseScreenShareWindow } from './screenShareWindow';

// Track if cleanup is currently running
let isCleanupRunning = false;
let cleanupIntervalTimer: NodeJS.Timeout | null = null;

function cleanup(): void {
  try {
    cleanupIntervalTimer && clearInterval(cleanupIntervalTimer);
    cleanupNonMainWindow();
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}

function cleanupNonMainWindow(): void {
  stopProcessMonitoring();
  rollingMergeManager.cleanup();
  safeCloseStreamWindow();
  safeClosewhiteboardWindow();
  safeCloseScreenShareWindow();
}

function handleUncaughtException(error: Error): void {
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
  if (isDev()) {
    dialog.showErrorBox(
      'Unhandled Rejection',
      `An unhandled rejection occurred: ${reason}`
    );
  } else {
    Sentry.captureException(new Error(`Unhandled Rejection reason: ${reason}`));
  }
}

function setupCleanupHandlers(): void {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
}

/**
 * Runs as a separate Node.js child process using fork()
 */
function cleanupOldRecordings(): void {
  // Check if cleanup is already running
  if (isCleanupRunning) {
    console.log('[Cleanup Process] Cleanup already in progress, skipping...');
    return;
  }

  try {
    isCleanupRunning = true;

    // Get the path to the cleanup task script (in dist/scripts after build)
    const cleanupScriptPath = isDev()
      ? path.join(__dirname, '..', 'scripts', 'cleanup-task.js')
      : path.join(__dirname, 'scripts', 'cleanup-task.js');

    Sentry.addBreadcrumb({
      message: `[Cleanup Process] Cleanup script path: ${cleanupScriptPath}`,
      level: 'log',
    });
    console.log(`[Cleanup Process] Cleanup script path: ${cleanupScriptPath}`);

    // Check if the script exists
    if (!fs.existsSync(cleanupScriptPath)) {
      Sentry.captureException(
        new Error(
          `[Cleanup Process] Cleanup script not found: ${cleanupScriptPath}`
        )
      );
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

    // Use fork() instead of spawn() for Node.js scripts
    // fork() properly handles Node.js execution in both dev and packaged apps
    const cleanupProcess = fork(cleanupScriptPath, [], {
      detached: true,
      stdio: 'ignore', // Prevents EPIPE errors when process is detached and unref'd
      // fork() automatically uses the correct Node.js executable
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

    // Handle process completion (process will exit automatically)
    cleanupProcess.on('close', (code: number | null) => {
      clearTimeout(timeout);

      if (code === 0) {
        console.log('[Cleanup Process] Completed successfully and exited');
      } else {
        console.error(`[Cleanup Process] Exited with code ${code}`);
        Sentry.captureException(
          new Error(`[Cleanup Process] Exited with code ${code}`)
        );
      }

      isCleanupRunning = false;
    });

    // Handle process errors
    cleanupProcess.on('error', error => {
      clearTimeout(timeout);
      console.error('[Cleanup Process] Failed to start:', error);
      Sentry.captureException(error);
      isCleanupRunning = false;
    });

    // Unref the process so it doesn't keep the main process alive
    cleanupProcess.unref();
  } catch (error) {
    Sentry.captureException(error);
    console.error('[Cleanup Process] Error starting cleanup process:', error);
    isCleanupRunning = false;
  }
}

/**
 * Set up periodic cleanup of old recordings (every 30 minute)
 * Each cleanup runs as a separate child process that automatically exits when done
 */
function setupPeriodicCleanup(): void {
  // const cleanupInterval = 1 * 60 * 1000; // 1 minute
  const cleanupInterval = 30 * 60 * 1000; // 30 minutes

  cleanupIntervalTimer && clearInterval(cleanupIntervalTimer);

  // Schedule periodic cleanup
  cleanupIntervalTimer = setInterval(() => {
    try {
      console.log('[Cleanup Scheduler] Running periodic recording cleanup...');
      cleanupOldRecordings();
    } catch (error) {
      Sentry.captureException(error);
    }
  }, cleanupInterval);

  console.log(
    `[Cleanup Scheduler] Periodic recording cleanup scheduled (every ${cleanupInterval / 60000} minute(s))`
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
