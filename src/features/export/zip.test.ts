import { describe, expect, it } from 'vitest';
import { createZip, crc32, zipEntriesOf } from './zip';

type ReadEntry = { name: string; method: number; data: Uint8Array };

async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const body = new Response(bytes).body;
  if (body === null) throw new Error('No body');
  const stream = body.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZip(blob: Blob): Promise<ReadEntry[]> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const decoder = new TextDecoder();
  const entries: ReadEntry[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength;
    const body = bytes.slice(start, start + compressedSize);
    const data = method === 8 ? await inflateRaw(body) : body;
    entries.push({ name, method, data });
    offset = start + compressedSize;
  }
  return entries;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('createZip', () => {
  it('writes files that unzip to the same content, compressing what shrinks', async () => {
    const repeated = 'Fieldnote '.repeat(200);
    const entries = await zipEntriesOf({
      'index.html': repeated,
      'assets/images/é.svg': '<svg/>',
      'assets/images/icon.png': new Blob([new Uint8Array([1, 2, 3])]),
    });
    const zip = await createZip(entries, new Date(2026, 9, 7, 12, 30));
    expect(zip.type).toBe('application/zip');
    const read = await readZip(zip);
    expect(read.map((entry) => entry.name)).toEqual([
      'assets/images/icon.png',
      'assets/images/é.svg',
      'index.html',
    ]);
    const decoder = new TextDecoder();
    expect(decoder.decode(read[2]?.data)).toBe(repeated);
    expect(read[2]?.method).toBe(8);
    expect([...(read[0]?.data ?? [])]).toEqual([1, 2, 3]);
    expect(read[0]?.method).toBe(0);
  });

  it('ends with a central directory that counts every file', async () => {
    const zip = await createZip(await zipEntriesOf({ a: 'one', b: 'two' }), new Date(2026, 0, 1));
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const end = new DataView(bytes.buffer, bytes.length - 22);
    expect(end.getUint32(0, true)).toBe(0x06054b50);
    expect(end.getUint16(10, true)).toBe(2);
  });
});
