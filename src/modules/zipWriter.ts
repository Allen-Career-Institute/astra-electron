import * as fsp from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const deflateRaw = promisify(zlib.deflateRaw);

/**
 * Minimal ZIP writer (store/deflate: local headers, central directory, EOCD).
 *
 * TEMPORARY. This should be `archiver`, but node_modules on this machine has
 * root-owned directories that make every package manager fail at the link
 * step. Once that is fixed:
 *
 *   sudo chown -R $(whoami) ~/.yarn/berry/cache node_modules
 *   yarn add archiver@^7        # NOT v8 - it is ESM-only, this build is CJS
 *
 * then this file becomes a ~25 line archiver wrapper; createZip's signature
 * stays the same, so nothing else changes.
 */

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const VERSION = 20; // 2.0 - deflate
const METHOD_DEFLATE = 8;

let crcTable: number[] | null = null;

function getCrcTable(): number[] {
  if (crcTable) return crcTable;
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(buffer: Buffer): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS timestamp: 2-second resolution, years since 1980. */
function toDosDateTime(date: Date): { time: number; date: number } {
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1),
    date:
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

interface ZipEntry {
  name: string;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  dosTime: number;
  dosDate: number;
  offset: number;
}

/**
 * Zip the given files into `zipPath`, flat (no directory entries).
 * Resolves with the number of bytes written.
 */
export async function createZip(
  zipPath: string,
  filePaths: string[]
): Promise<number> {
  const chunks: Buffer[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const filePath of filePaths) {
    const contents = await fsp.readFile(filePath);
    const stats = await fsp.stat(filePath);
    const compressed = (await deflateRaw(contents)) as Buffer;
    const name = Buffer.from(path.basename(filePath), 'utf-8');
    const { time, date } = toDosDateTime(stats.mtime);

    const entry: ZipEntry = {
      name: name.toString('utf-8'),
      crc: crc32(contents),
      compressedSize: compressed.length,
      uncompressedSize: contents.length,
      dosTime: time,
      dosDate: date,
      offset,
    };

    const header = Buffer.alloc(30);
    header.writeUInt32LE(LOCAL_HEADER_SIG, 0);
    header.writeUInt16LE(VERSION, 4);
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(METHOD_DEFLATE, 8);
    header.writeUInt16LE(entry.dosTime, 10);
    header.writeUInt16LE(entry.dosDate, 12);
    header.writeUInt32LE(entry.crc, 14);
    header.writeUInt32LE(entry.compressedSize, 18);
    header.writeUInt32LE(entry.uncompressedSize, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28); // extra field length

    chunks.push(header, name, compressed);
    offset += header.length + name.length + compressed.length;
    entries.push(entry);
  }

  const centralStart = offset;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf-8');
    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_HEADER_SIG, 0);
    header.writeUInt16LE(VERSION, 4); // version made by
    header.writeUInt16LE(VERSION, 6); // version needed
    header.writeUInt16LE(0, 8); // flags
    header.writeUInt16LE(METHOD_DEFLATE, 10);
    header.writeUInt16LE(entry.dosTime, 12);
    header.writeUInt16LE(entry.dosDate, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressedSize, 20);
    header.writeUInt32LE(entry.uncompressedSize, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30); // extra field length
    header.writeUInt16LE(0, 32); // comment length
    header.writeUInt16LE(0, 34); // disk number start
    header.writeUInt16LE(0, 36); // internal attributes
    header.writeUInt32LE(0, 38); // external attributes
    header.writeUInt32LE(entry.offset, 42);

    chunks.push(header, name);
    offset += header.length + name.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // this disk
  eocd.writeUInt16LE(0, 6); // disk with central directory
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(offset - centralStart, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length
  chunks.push(eocd);

  const archive = Buffer.concat(chunks);
  await fsp.writeFile(zipPath, archive);
  return archive.length;
}
