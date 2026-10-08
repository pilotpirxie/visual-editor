import { describe, expect, it } from 'vitest';
import { createZip, crc32, readZip, ZipFormatError, zipEntriesOf } from './zip';

async function firstHeader(): Promise<DataView> {
  const zip = await createZip(await zipEntriesOf({ 'a.txt': 'a' }));
  return new DataView(await zip.arrayBuffer());
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('is zero for no bytes', () => {
    expect(crc32(new Uint8Array())).toBe(0);
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
    const zip = await createZip(entries);
    expect(zip.type).toBe('application/zip');
    expect(zip.size).toBeLessThan(repeated.length);
    const read = await readZip(new Uint8Array(await zip.arrayBuffer()));
    expect([...read.keys()]).toEqual([
      'assets/images/icon.png',
      'assets/images/é.svg',
      'index.html',
    ]);
    expect(new TextDecoder().decode(read.get('index.html'))).toBe(repeated);
    expect([...(read.get('assets/images/icon.png') ?? [])]).toEqual([1, 2, 3]);
  });

  it('stamps every file with the same fixed date, 1980-01-01 00:00', async () => {
    const header = await firstHeader();
    const date = header.getUint16(12, true);
    expect(header.getUint16(10, true)).toBe(0);
    expect((date >> 9) + 1980).toBe(1980);
    expect((date >> 5) & 0b1111).toBe(1);
    expect(date & 0b11111).toBe(1);
  });

  it('writes byte-identical archives for the same files', async () => {
    const files = { 'index.html': '<p>Same</p>'.repeat(50), 'a.txt': 'a' };
    const first = await createZip(await zipEntriesOf(files));
    const second = await createZip(await zipEntriesOf(files));
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(
      new Uint8Array(await second.arrayBuffer()),
    );
  });

  it('writes an empty archive with only the closing record', async () => {
    const zip = await createZip([]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    expect(bytes.length).toBe(22);
    expect(new DataView(bytes.buffer).getUint16(10, true)).toBe(0);
  });

  it('ends with a central directory that counts every file', async () => {
    const zip = await createZip(await zipEntriesOf({ a: 'one', b: 'two' }));
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const end = new DataView(bytes.buffer, bytes.length - 22);
    expect(end.getUint32(0, true)).toBe(0x06054b50);
    expect(end.getUint16(10, true)).toBe(2);
  });
});

async function zipBytes(files: Record<string, string>): Promise<Uint8Array<ArrayBuffer>> {
  const zip = await createZip(await zipEntriesOf(files));
  return new Uint8Array(await zip.arrayBuffer());
}

function centralHeaderAt(bytes: Uint8Array<ArrayBuffer>): number {
  const view = new DataView(bytes.buffer);
  return view.getUint32(bytes.length - 22 + 16, true);
}

describe('readZip', () => {
  it('skips folders and macOS metadata', async () => {
    const bytes = await zipBytes({
      'pack/': '',
      'pack/pack.json': '{}',
      '__MACOSX/pack/._pack.json': 'x',
      'pack/.DS_Store': 'x',
    });
    expect([...(await readZip(bytes)).keys()]).toEqual(['pack/pack.json']);
  });

  it('reads sizes from the central directory, as zips with data descriptors need', async () => {
    const bytes = await zipBytes({ 'a.txt': 'Fieldnote '.repeat(40) });
    const view = new DataView(bytes.buffer);
    view.setUint16(6, 0x0008, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, 0, true);
    view.setUint32(22, 0, true);
    const read = await readZip(bytes);
    expect(new TextDecoder().decode(read.get('a.txt'))).toBe('Fieldnote '.repeat(40));
  });

  it('refuses files that are not zips', async () => {
    const bytes = new TextEncoder().encode('{"format": "block-pack", "blocks": []}');
    await expect(readZip(bytes)).rejects.toThrow(ZipFormatError);
  });

  it('refuses damaged files', async () => {
    const bytes = await zipBytes({ 'a.txt': 'hello' });
    const view = new DataView(bytes.buffer);
    view.setUint32(centralHeaderAt(bytes) + 16, 0, true);
    await expect(readZip(bytes)).rejects.toThrow('a.txt in the zip is damaged');
  });

  it('refuses encrypted files', async () => {
    const bytes = await zipBytes({ 'secret.txt': 'hello' });
    const view = new DataView(bytes.buffer);
    view.setUint16(centralHeaderAt(bytes) + 8, 0x0001, true);
    await expect(readZip(bytes)).rejects.toThrow('secret.txt is encrypted');
  });
});
