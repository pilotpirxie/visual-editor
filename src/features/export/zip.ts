export type ZipEntry = { path: string; data: Uint8Array<ArrayBuffer> };

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const VERSION_NEEDED = 20;
const UTF8_NAMES_FLAG = 0x0800;
const METHOD_STORED = 0;
const METHOD_DEFLATED = 8;
const DOS_TIME_MIDNIGHT = 0;
const DOS_DATE_1980_01_01 = 0b0000000_0001_00001;
const CRC_POLYNOMIAL = 0xedb88320;
const CRC_TABLE_SIZE = 256;
const BITS_PER_BYTE = 8;
const ENCRYPTED_FLAG = 0x0001;
const ZIP64_MARKER = 0xffffffff;
const MAX_COMMENT_LENGTH = 0xffff;
const MAX_ZIP_ENTRIES = 2000;
const MAX_UNZIPPED_BYTES = 64 * 1024 * 1024;
const SKIPPED_PATHS = ['__MACOSX/', '.DS_Store'];

export class ZipFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipFormatError';
  }
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(CRC_TABLE_SIZE);
  for (let index = 0; index < CRC_TABLE_SIZE; index += 1) {
    let value = index;
    for (let bit = 0; bit < BITS_PER_BYTE; bit += 1) {
      value = value & 1 ? CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const input = new Response(bytes).body;
  if (input === null) throw new Error('Could not read the file to compress it');
  const compressed = input.pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

type PreparedEntry = {
  name: Uint8Array<ArrayBuffer>;
  body: Uint8Array<ArrayBuffer>;
  method: number;
  crc: number;
  size: number;
  offset: number;
};

function writeCommonFields(view: DataView, at: number, entry: PreparedEntry): void {
  view.setUint16(at, VERSION_NEEDED, true);
  view.setUint16(at + 2, UTF8_NAMES_FLAG, true);
  view.setUint16(at + 4, entry.method, true);
  view.setUint16(at + 6, DOS_TIME_MIDNIGHT, true);
  view.setUint16(at + 8, DOS_DATE_1980_01_01, true);
  view.setUint32(at + 10, entry.crc, true);
  view.setUint32(at + 14, entry.body.length, true);
  view.setUint32(at + 18, entry.size, true);
  view.setUint16(at + 22, entry.name.length, true);
}

function localHeader(entry: PreparedEntry): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(LOCAL_HEADER_SIZE + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
  writeCommonFields(view, 4, entry);
  header.set(entry.name, LOCAL_HEADER_SIZE);
  return header;
}

function centralHeader(entry: PreparedEntry): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(CENTRAL_HEADER_SIZE + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
  view.setUint16(4, VERSION_NEEDED, true);
  writeCommonFields(view, 6, entry);
  view.setUint32(42, entry.offset, true);
  header.set(entry.name, CENTRAL_HEADER_SIZE);
  return header;
}

function endOfCentralDirectory(
  count: number,
  size: number,
  offset: number,
): Uint8Array<ArrayBuffer> {
  const record = new Uint8Array(END_OF_CENTRAL_DIRECTORY_SIZE);
  const view = new DataView(record.buffer);
  view.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, size, true);
  view.setUint32(16, offset, true);
  return record;
}

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const prepared: PreparedEntry[] = [];
  let offset = 0;
  for (const { path, data } of entries) {
    const compressed = await deflateRaw(data);
    const isDeflated = compressed.length < data.length;
    const entry: PreparedEntry = {
      name: encoder.encode(path),
      body: isDeflated ? compressed : data,
      method: isDeflated ? METHOD_DEFLATED : METHOD_STORED,
      crc: crc32(data),
      size: data.length,
      offset,
    };
    const header = localHeader(entry);
    parts.push(header, entry.body);
    offset += header.length + entry.body.length;
    prepared.push(entry);
  }
  let centralSize = 0;
  for (const entry of prepared) {
    const header = centralHeader(entry);
    parts.push(header);
    centralSize += header.length;
  }
  parts.push(endOfCentralDirectory(prepared.length, centralSize, offset));
  return new Blob(parts, { type: 'application/zip' });
}

export async function zipEntriesOf(files: Record<string, string | Blob>): Promise<ZipEntry[]> {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];
  const paths = Object.keys(files);
  paths.sort();
  for (const path of paths) {
    const content = files[path];
    if (content === undefined) continue;
    const data =
      typeof content === 'string'
        ? encoder.encode(content)
        : new Uint8Array(await content.arrayBuffer());
    entries.push({ path, data });
  }
  return entries;
}

async function inflateRaw(body: Uint8Array<ArrayBuffer>, size: number): Promise<Uint8Array> {
  const input = new Response(body).body;
  if (input === null) throw new Error('Could not read the file to decompress it');
  const reader = input.pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const output = new Uint8Array(size);
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (length + value.length > size) {
      await reader.cancel();
      throw new ZipFormatError('This zip is damaged: a file is larger than it says');
    }
    output.set(value, length);
    length += value.length;
  }
  return output.subarray(0, length);
}

function endOfCentralDirectoryAt(view: DataView): number {
  const last = view.byteLength - END_OF_CENTRAL_DIRECTORY_SIZE;
  const first = Math.max(0, last - MAX_COMMENT_LENGTH);
  for (let at = last; at >= first; at -= 1) {
    if (view.getUint32(at, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return at;
  }
  throw new ZipFormatError('This file is not a zip archive');
}

function isSkippedPath(path: string): boolean {
  if (path.endsWith('/')) return true;
  return SKIPPED_PATHS.some((skipped) => path.startsWith(skipped) || path.endsWith(skipped));
}

export async function readZip(bytes: Uint8Array<ArrayBuffer>): Promise<Map<string, Uint8Array>> {
  if (bytes.length < END_OF_CENTRAL_DIRECTORY_SIZE) {
    throw new ZipFormatError('This file is not a zip archive');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const end = endOfCentralDirectoryAt(view);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  if (count > MAX_ZIP_ENTRIES || at === ZIP64_MARKER) {
    throw new ZipFormatError('This zip has too many files or is too large');
  }
  const files = new Map<string, Uint8Array>();
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (
      at + CENTRAL_HEADER_SIZE > bytes.length ||
      view.getUint32(at, true) !== CENTRAL_HEADER_SIGNATURE
    ) {
      throw new ZipFormatError('This zip is damaged');
    }
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const packedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const path = decoder.decode(
      bytes.subarray(at + CENTRAL_HEADER_SIZE, at + CENTRAL_HEADER_SIZE + nameLength),
    );
    at += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
    if (isSkippedPath(path)) continue;
    if ((flags & ENCRYPTED_FLAG) !== 0) throw new ZipFormatError(`${path} is encrypted`);
    total += size;
    if (total > MAX_UNZIPPED_BYTES) throw new ZipFormatError('This zip is too large');
    if (
      localAt + LOCAL_HEADER_SIZE > bytes.length ||
      view.getUint32(localAt, true) !== LOCAL_HEADER_SIGNATURE
    ) {
      throw new ZipFormatError(`${path} in the zip is damaged`);
    }
    const start =
      localAt +
      LOCAL_HEADER_SIZE +
      view.getUint16(localAt + 26, true) +
      view.getUint16(localAt + 28, true);
    const body = bytes.subarray(start, start + packedSize);
    let data: Uint8Array;
    if (method === METHOD_STORED) {
      data = body;
    } else if (method === METHOD_DEFLATED) {
      data = await inflateRaw(body, size);
    } else {
      throw new ZipFormatError(`${path} uses a compression this editor can’t read`);
    }
    if (data.length !== size || crc32(data) !== crc) {
      throw new ZipFormatError(`${path} in the zip is damaged`);
    }
    files.set(path, data);
  }
  return files;
}
