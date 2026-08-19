import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as Sentry from '@sentry/electron/main';

import { createZip } from './zipWriter';

// Reports live at: D:\Ping script Report\<MM.YYYY>\<D.MM.YYYY>\*.txt
//
// Off Windows there is no D:, so we fall back to the same tree under ~/Desktop
// for local testing. ASTRA_PING_REPORT_DIR overrides both.
const PING_REPORT_ROOT =
  process.env.ASTRA_PING_REPORT_DIR ||
  (process.platform === 'win32'
    ? 'D:\\Ping script Report'
    : path.join(os.homedir(), 'Desktop', 'Ping script Report'));

export interface PreparedReportZip {
  success: boolean;
  sourceDir: string | null;
  /** Name the zip is uploaded under - also the LMM key. */
  zipName?: string;
  zipPath?: string;
  size?: number;
  fileCount?: number;
  error?: string;
}

export interface PingReportZipUpload {
  zipName: string;
  zipPath: string;
  presignedUrl: string;
  /** From LMM initMultipartUpload - echoed back so the web app can complete it. */
  uploadId: string;
}

/** Reported back once the zip has been PUT, so the web app can complete it. */
export interface PingReportUploadResult {
  zipName: string;
  zipPath: string;
  uploadId: string;
  success: boolean;
  etag?: string;
  error?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** YYYYMMDD-HHmmss, for the zip name. */
function timestampSuffix(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

async function exists(target: string): Promise<boolean> {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve today's report folder, e.g. D:\Ping script Report\10.2026\1.10.2026
 *
 * The script that writes these folders may or may not zero-pad the day and
 * month, so every combination is tried and the first one that exists wins.
 *
 * Async throughout - D: is likely a mapped network drive, and a sync stat on a
 * dead share would block the main process (and every window with it).
 */
export async function getTodaysReportDir(
  date: Date = new Date(),
  root: string = PING_REPORT_ROOT
): Promise<string | null> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const monthVariants = Array.from(new Set([`${pad(month)}`, `${month}`]));
  const dayVariants = Array.from(new Set([`${day}`, `${pad(day)}`]));

  for (const monthPart of monthVariants) {
    const monthFolder = `${monthPart}.${year}`;
    for (const dayPart of dayVariants) {
      const candidate = path.join(
        root,
        monthFolder,
        `${dayPart}.${monthPart}.${year}`
      );
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Every .txt file directly inside today's folder. Shell scripts and any
 * other extension are ignored.
 */
async function getTodaysTxtFiles(sourceDir: string): Promise<string[]> {
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter(
      entry =>
        entry.isFile() && path.extname(entry.name).toLowerCase() === '.txt'
    )
    .map(entry => path.join(sourceDir, entry.name));
}

/**
 * Zip today's .txt reports into a single archive named
 * `<meetingId>-<YYYYMMDD-HHmmss>.zip`.
 *
 * The source files are left untouched - the meeting id rides on the zip name,
 * so there is no reason to rename the ping script's own output. The archive is
 * built in the OS temp dir, never inside the reports folder.
 */
export async function prepareMeetingReportZip(
  meetingId: string,
  sourceDir?: string | null
): Promise<PreparedReportZip> {
  const dir = sourceDir === undefined ? await getTodaysReportDir() : sourceDir;
  const prepared: PreparedReportZip = {
    success: false,
    sourceDir: dir,
  };

  if (!meetingId) {
    prepared.error = 'No meetingId provided';
    console.warn('[Ping Report] No meetingId provided, skipping');
    return prepared;
  }

  if (!dir) {
    prepared.error = `No report folder for today under ${PING_REPORT_ROOT}`;
    console.warn(`[Ping Report] ${prepared.error}`);
    return prepared;
  }

  try {
    const files = await getTodaysTxtFiles(dir);
    if (files.length === 0) {
      prepared.error = `No .txt files found in ${dir}`;
      console.warn(`[Ping Report] ${prepared.error}`);
      return prepared;
    }

    const zipName = `${meetingId}-${timestampSuffix()}.zip`;
    const zipPath = path.join(os.tmpdir(), zipName);
    const size = await createZip(zipPath, files);

    prepared.success = true;
    prepared.zipName = zipName;
    prepared.zipPath = zipPath;
    prepared.size = size;
    prepared.fileCount = files.length;

    console.log(
      `[Ping Report] Zipped ${files.length} .txt file(s) from ${dir} into ${zipName} (${size} bytes)`
    );
  } catch (error) {
    prepared.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Ping Report] Failed to zip reports in ${dir}:`, error);
    Sentry.captureException(error);
  }

  return prepared;
}

/**
 * PUT the zip to its presigned URL and hand back the ETag, which LMM needs for
 * completeMultipartUpload. The temp zip is removed once it is safely uploaded.
 */
export async function uploadReportZip(
  upload: PingReportZipUpload
): Promise<PingReportUploadResult> {
  const result: PingReportUploadResult = {
    zipName: upload.zipName,
    zipPath: upload.zipPath,
    uploadId: upload.uploadId,
    success: false,
  };

  try {
    const contents = await fsp.readFile(upload.zipPath);
    // Copy into a plain Uint8Array: a Buffer's backing store is typed as
    // ArrayBufferLike, which does not satisfy Blob's ArrayBufferView.
    const bytes = new Uint8Array(contents);

    const response = await fetch(upload.presignedUrl, {
      method: 'PUT',
      body: new Blob([bytes]),
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': contents.length.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Ping Report] Upload failed:', response.status, errorText);
      result.error = `Upload failed: ${response.status} ${response.statusText}`;
      return result;
    }

    // S3 returns the ETag wrapped in quotes.
    const etag = response.headers.get('ETag') || response.headers.get('etag');
    if (!etag) {
      // Without it LMM can never complete the upload.
      result.error = 'Upload succeeded but no ETag was returned';
      return result;
    }

    result.success = true;
    result.etag = etag.replace(/"/g, '');
    console.log(`[Ping Report] Uploaded ${upload.zipName}`);

    try {
      await fsp.unlink(upload.zipPath);
    } catch (error) {
      console.warn(`[Ping Report] Could not remove temp zip:`, error);
    }
  } catch (error) {
    console.error('[Ping Report] Error uploading zip:', error);
    Sentry.captureException(error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}
