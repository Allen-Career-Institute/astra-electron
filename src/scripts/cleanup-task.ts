#!/usr/bin/env node

/**
 * Standalone cleanup task that runs as a separate process
 * This script is designed to be spawned, execute cleanup, and exit automatically
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Get the user data path based on platform
 */
function getUserDataPath(): string {
  let userDataPath = path.join(os.homedir(), '.config', 'astra-electron');

  // For Windows, use the correct path
  if (process.platform === 'win32') {
    userDataPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'astra-electron'
    );
  } else if (process.platform === 'darwin') {
    userDataPath = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'astra-electron'
    );
  }

  return userDataPath;
}

/**
 * Clean up recording folders older than 10 minutes
 */
function cleanupOldRecordings(): void {
  try {
    const userDataPath = getUserDataPath();
    let recordingsDir = path.join(userDataPath, 'recordings');
    console.log('[Cleanup Task] Recordings directory:', recordingsDir);
    // Check if recordings directory exists
    if (!fs.existsSync(recordingsDir)) {
      console.log(
        '[Cleanup Task] Recordings directory does not exist, skipping cleanup'
      );
      return;
    }

    const currentTime = Date.now();
    /* ----------------------------- */
    // const expiryTime = 2 * 24 * 60 * 60 * 1000; // 2 days
    const expiryTime = 3 * 60 * 1000; // 3 minutes

    // Read all meeting folders in recordings directory
    const meetingFolders = fs
      .readdirSync(recordingsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log('[Cleanup Task] Meeting folders:', meetingFolders);

    let cleanedCount = 0;

    for (const meetingFolder of meetingFolders) {
      const meetingPath = path.join(recordingsDir, meetingFolder);

      try {
        const stats = fs.statSync(meetingPath);
        // Use birthtime (creation time) instead of mtime (modification time)
        // This ensures folders are cleaned up based on when they were created,
        // not when they were last modified (which can be updated by ongoing writes)
        const creationTime = stats.birthtime.getTime();
        const folderAge = currentTime - creationTime;

        console.log('[Cleanup Task] Stats:', {
          creationTime,
          folderAge,
          currentTime,
          expiryTime,
        });

        // Check if folder is older than the expiry time (10 minutes)
        if (folderAge > expiryTime) {
          // Remove the entire meeting folder and all its contents
          fs.rmSync(meetingPath, { recursive: true, force: true });

          cleanedCount++;
          const ageInMinutes = Math.round(folderAge / (60 * 1000));
          console.log(
            `[Cleanup Task] Cleaned up old recording folder: ${meetingFolder} (age: ${ageInMinutes} minutes)`
          );
        }
      } catch (error) {
        console.error(
          `[Cleanup Task] Error processing meeting folder ${meetingFolder}:`,
          error
        );
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[Cleanup Task] Recording cleanup completed: ${cleanedCount} folders removed`
      );
    } else {
      console.log('[Cleanup Task] No old recording folders found to clean up');
    }
  } catch (error) {
    console.error('[Cleanup Task] Error during recording cleanup:', error);
    process.exit(1);
  }
}

try {
  // Main execution
  console.log('[Cleanup Task] Starting cleanup task...');
  cleanupOldRecordings();
  console.log('[Cleanup Task] Cleanup task completed. Exiting...');
  process.exit(0);
} catch (error) {
  console.error('[Cleanup Task] Error during cleanup task:', error);
  process.exit(1);
}
