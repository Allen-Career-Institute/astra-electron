#!/usr/bin/env node

/**
 * Standalone cleanup task that runs as a separate process
 * This script is designed to be spawned, execute cleanup, and exit automatically
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Storage limits
const MAX_STORAGE_GB = 5; // Maximum storage limit in GB
const MAX_AGE_DAYS = 2; // Maximum age of recordings in days

// Deletion log file name
const DELETION_LOG_FILE = 'deletion-log.json';

// Deletion log entry interface
interface DeletionLogEntry {
  timestamp: string;
  meetingId: string;
  folderPath: string;
  sizeMB: number;
  sizeBytes: number;
  fileCount?: number;
  ageInDays: number;
  reason: 'age_limit' | 'size_limit' | 'manual' | 'manual_all';
  deletedBy: 'cleanup_task' | 'user_request';
}

interface DeletionLog {
  lastUpdated: string;
  totalDeleted: number;
  totalFreedMB: number;
  entries: DeletionLogEntry[];
}

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
 * Get the Desktop recordings path
 */
function getDesktopRecordingsPath(): string {
  const homeDir = process.env.SUDO_USER
    ? `/Users/${process.env.SUDO_USER}`
    : os.homedir();
  return path.join(homeDir, 'Desktop', 'astra-recordings');
}

/**
 * Get the deletion log file path
 */
function getDeletionLogPath(): string {
  const recordingsPath = getDesktopRecordingsPath();
  // Store log in parent directory (Desktop) so it persists even if recordings folder is deleted
  return path.join(path.dirname(recordingsPath), DELETION_LOG_FILE);
}

/**
 * Read the deletion log file
 */
function readDeletionLog(): DeletionLog {
  const logPath = getDeletionLogPath();

  try {
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      return JSON.parse(content) as DeletionLog;
    }
  } catch (error) {
    console.warn(
      '[Cleanup Task] Could not read deletion log, creating new one:',
      error
    );
  }

  return {
    lastUpdated: new Date().toISOString(),
    totalDeleted: 0,
    totalFreedMB: 0,
    entries: [],
  };
}

/**
 * Write the deletion log file
 */
function writeDeletionLog(log: DeletionLog): void {
  const logPath = getDeletionLogPath();

  try {
    // Ensure parent directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    log.lastUpdated = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`[Cleanup Task] Deletion log updated: ${logPath}`);
  } catch (error) {
    console.error('[Cleanup Task] Error writing deletion log:', error);
  }
}

/**
 * Add an entry to the deletion log
 */
function logDeletion(entry: Omit<DeletionLogEntry, 'timestamp'>): void {
  const log = readDeletionLog();

  const fullEntry: DeletionLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  log.entries.push(fullEntry);
  log.totalDeleted++;
  log.totalFreedMB = parseFloat((log.totalFreedMB + entry.sizeMB).toFixed(2));

  // Keep only last 1000 entries to prevent log file from growing too large
  if (log.entries.length > 1000) {
    log.entries = log.entries.slice(-1000);
  }

  writeDeletionLog(log);
}

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath: string): {
  sizeBytes: number;
  fileCount: number;
} {
  let totalSize = 0;
  let fileCount = 0;

  try {
    if (!fs.existsSync(dirPath)) {
      return { sizeBytes: 0, fileCount: 0 };
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const subDirInfo = getDirectorySize(itemPath);
        totalSize += subDirInfo.sizeBytes;
        fileCount += subDirInfo.fileCount;
      } else if (item.isFile()) {
        try {
          const stats = fs.statSync(itemPath);
          totalSize += stats.size;
          fileCount++;
        } catch (error) {
          console.warn(
            `[Cleanup Task] Could not stat file ${itemPath}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error(`[Cleanup Task] Error reading directory ${dirPath}:`, error);
  }

  return { sizeBytes: totalSize, fileCount };
}

interface FolderInfo {
  meetingId: string;
  folderPath: string;
  sizeBytes: number;
  createdAt: Date;
  ageInDays: number;
}

/**
 * Get all recording folders with their info
 */
function getRecordingFolders(recordingsDir: string): FolderInfo[] {
  const folders: FolderInfo[] = [];

  if (!fs.existsSync(recordingsDir)) {
    return folders;
  }

  const currentTime = Date.now();
  const meetingFolders = fs
    .readdirSync(recordingsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const meetingId of meetingFolders) {
    const folderPath = path.join(recordingsDir, meetingId);

    try {
      const stats = fs.statSync(folderPath);
      const { sizeBytes } = getDirectorySize(folderPath);
      const createdAt = stats.birthtime;
      const ageInDays =
        (currentTime - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      folders.push({
        meetingId,
        folderPath,
        sizeBytes,
        createdAt,
        ageInDays,
      });
    } catch (error) {
      console.warn(
        `[Cleanup Task] Could not get info for folder ${meetingId}:`,
        error
      );
    }
  }

  // Sort by age (oldest first) for deletion priority
  folders.sort((a, b) => b.ageInDays - a.ageInDays);

  return folders;
}

/**
 * Clean up recording folders older than MAX_AGE_DAYS
 */
function cleanupOldRecordingsByAge(recordingsDir: string): number {
  let cleanedCount = 0;

  try {
    console.log('[Cleanup Task] Checking recordings directory:', recordingsDir);

    if (!fs.existsSync(recordingsDir)) {
      console.log(
        '[Cleanup Task] Recordings directory does not exist, skipping'
      );
      return 0;
    }

    const folders = getRecordingFolders(recordingsDir);
    console.log(`[Cleanup Task] Found ${folders.length} recording folders`);

    for (const folder of folders) {
      if (folder.ageInDays > MAX_AGE_DAYS) {
        try {
          const sizeMB = parseFloat(
            (folder.sizeBytes / (1024 * 1024)).toFixed(2)
          );
          fs.rmSync(folder.folderPath, { recursive: true, force: true });
          cleanedCount++;

          // Log the deletion
          logDeletion({
            meetingId: folder.meetingId,
            folderPath: folder.folderPath,
            sizeMB,
            sizeBytes: folder.sizeBytes,
            ageInDays: parseFloat(folder.ageInDays.toFixed(2)),
            reason: 'age_limit',
            deletedBy: 'cleanup_task',
          });

          console.log(
            `[Cleanup Task] Deleted old recording: ${folder.meetingId} (${sizeMB} MB, ${folder.ageInDays.toFixed(1)} days old)`
          );
        } catch (error) {
          console.error(
            `[Cleanup Task] Error deleting folder ${folder.meetingId}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error('[Cleanup Task] Error during age-based cleanup:', error);
  }

  return cleanedCount;
}

/**
 * Clean up recordings if total storage exceeds MAX_STORAGE_GB
 * Deletes oldest recordings first until under the limit
 */
function cleanupRecordingsBySize(recordingsDir: string): {
  cleanedCount: number;
  freedBytes: number;
} {
  let cleanedCount = 0;
  let freedBytes = 0;

  try {
    console.log('[Cleanup Task] Checking storage limits for:', recordingsDir);

    if (!fs.existsSync(recordingsDir)) {
      console.log(
        '[Cleanup Task] Recordings directory does not exist, skipping'
      );
      return { cleanedCount: 0, freedBytes: 0 };
    }

    const folders = getRecordingFolders(recordingsDir);
    let totalSizeBytes = folders.reduce((sum, f) => sum + f.sizeBytes, 0);
    const maxSizeBytes = MAX_STORAGE_GB * 1024 * 1024 * 1024; // GB to bytes

    const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(3);
    console.log(
      `[Cleanup Task] Total storage: ${totalSizeGB} GB (limit: ${MAX_STORAGE_GB} GB)`
    );

    if (totalSizeBytes <= maxSizeBytes) {
      console.log(
        '[Cleanup Task] Storage within limits, no size-based cleanup needed'
      );
      return { cleanedCount: 0, freedBytes: 0 };
    }

    // Delete oldest folders until under limit
    for (const folder of folders) {
      if (totalSizeBytes <= maxSizeBytes) {
        break;
      }

      try {
        const sizeMB = parseFloat(
          (folder.sizeBytes / (1024 * 1024)).toFixed(2)
        );
        fs.rmSync(folder.folderPath, { recursive: true, force: true });

        freedBytes += folder.sizeBytes;
        totalSizeBytes -= folder.sizeBytes;
        cleanedCount++;

        // Log the deletion
        logDeletion({
          meetingId: folder.meetingId,
          folderPath: folder.folderPath,
          sizeMB,
          sizeBytes: folder.sizeBytes,
          ageInDays: parseFloat(folder.ageInDays.toFixed(2)),
          reason: 'size_limit',
          deletedBy: 'cleanup_task',
        });

        console.log(
          `[Cleanup Task] Deleted for storage limit: ${folder.meetingId} (${sizeMB} MB, ${folder.ageInDays.toFixed(1)} days old)`
        );
      } catch (error) {
        console.error(
          `[Cleanup Task] Error deleting folder ${folder.meetingId}:`,
          error
        );
      }
    }

    const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
    console.log(
      `[Cleanup Task] Size-based cleanup complete: freed ${freedMB} MB`
    );
  } catch (error) {
    console.error('[Cleanup Task] Error during size-based cleanup:', error);
  }

  return { cleanedCount, freedBytes };
}

/**
 * Main cleanup function - cleans both storage locations
 */
function cleanupOldRecordings(): void {
  try {
    let totalCleaned = 0;
    let totalFreedBytes = 0;

    // 1. Clean up userData recordings (Application Support)
    const userDataPath = getUserDataPath();
    const userDataRecordingsDir = path.join(userDataPath, 'recordings');
    console.log('\n[Cleanup Task] === Cleaning userData recordings ===');
    totalCleaned += cleanupOldRecordingsByAge(userDataRecordingsDir);
    const userDataSizeResult = cleanupRecordingsBySize(userDataRecordingsDir);
    totalCleaned += userDataSizeResult.cleanedCount;
    totalFreedBytes += userDataSizeResult.freedBytes;

    // 2. Clean up Desktop recordings (main recording location)
    const desktopRecordingsDir = getDesktopRecordingsPath();
    console.log('\n[Cleanup Task] === Cleaning Desktop recordings ===');
    totalCleaned += cleanupOldRecordingsByAge(desktopRecordingsDir);
    const desktopSizeResult = cleanupRecordingsBySize(desktopRecordingsDir);
    totalCleaned += desktopSizeResult.cleanedCount;
    totalFreedBytes += desktopSizeResult.freedBytes;

    // Summary
    const totalFreedMB = (totalFreedBytes / (1024 * 1024)).toFixed(2);
    if (totalCleaned > 0) {
      console.log(
        `\n[Cleanup Task] ✅ Cleanup complete: ${totalCleaned} folders removed, ${totalFreedMB} MB freed`
      );
    } else {
      console.log(
        '\n[Cleanup Task] ✅ No cleanup needed - all recordings within limits'
      );
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
