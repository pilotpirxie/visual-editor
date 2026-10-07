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
const DOS_EPOCH_YEAR = 1980;
const DOS_HOUR_SHIFT = 11;
const DOS_MINUTE_SHIFT = 5;
const DOS_SECONDS_PER_STEP = 2;
const DOS_YEAR_SHIFT = 9;
const DOS_MONTH_SHIFT = 5;
const CRC_POLYNOMIAL = 0xedb88320;
const CRC_TABLE_SIZE = 256;
const BITS_PER_BYTE = 8;

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

function dosTime(date: Date): number {
  const hours = date.getHours() << DOS_HOUR_SHIFT;
  const minutes = date.getMinutes() << DOS_MINUTE_SHIFT;
  const seconds = Math.floor(date.getSeconds() / DOS_SECONDS_PER_STEP);
  return hours | minutes | seconds;
}

function dosDate(date: Date): number {
  const year = Math.max(date.getFullYear(), DOS_EPOCH_YEAR) - DOS_EPOCH_YEAR;
  const month = date.getMonth() + 1;
  return (year << DOS_YEAR_SHIFT) | (month << DOS_MONTH_SHIFT) | date.getDate();
}

type PreparedEntry = {
  name: Uint8Array<ArrayBuffer>;
  body: Uint8Array<ArrayBuffer>;
  method: number;
  crc: number;
  size: number;
  offset: number;
};

function writeCommonFields(view: DataView, at: number, entry: PreparedEntry, date: Date): void {
  view.setUint16(at, VERSION_NEEDED, true);
  view.setUint16(at + 2, UTF8_NAMES_FLAG, true);
  view.setUint16(at + 4, entry.method, true);
  view.setUint16(at + 6, dosTime(date), true);
  view.setUint16(at + 8, dosDate(date), true);
  view.setUint32(at + 10, entry.crc, true);
  view.setUint32(at + 14, entry.body.length, true);
  view.setUint32(at + 18, entry.size, true);
  view.setUint16(at + 22, entry.name.length, true);
}

function localHeader(entry: PreparedEntry, date: Date): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(LOCAL_HEADER_SIZE + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
  writeCommonFields(view, 4, entry, date);
  header.set(entry.name, LOCAL_HEADER_SIZE);
  return header;
}

function centralHeader(entry: PreparedEntry, date: Date): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(CENTRAL_HEADER_SIZE + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
  view.setUint16(4, VERSION_NEEDED, true);
  writeCommonFields(view, 6, entry, date);
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

export async function createZip(entries: ZipEntry[], modifiedAt: Date): Promise<Blob> {
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
    const header = localHeader(entry, modifiedAt);
    parts.push(header, entry.body);
    offset += header.length + entry.body.length;
    prepared.push(entry);
  }
  let centralSize = 0;
  for (const entry of prepared) {
    const header = centralHeader(entry, modifiedAt);
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
