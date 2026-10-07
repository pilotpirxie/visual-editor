import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

const OBJECT_URL = 'blob:http://localhost/0d6c5f2e';
const REVOKE_DELAY_MS = 10_000;

type Clicked = { href: string; download: string; isConnected: boolean };

let clickedLinks: Clicked[];
const createObjectURL = vi.fn<(blob: Blob) => string>(() => OBJECT_URL);
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  clickedLinks = [];
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ): void {
    clickedLinks.push({ href: this.href, download: this.download, isConnected: this.isConnected });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('downloadBlob', () => {
  it('makes an object URL for the blob', () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    downloadBlob(blob, 'fieldnote.json');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('clicks one link that points at the object URL and names the file', () => {
    downloadBlob(new Blob(['zip']), 'fieldnote-2026-10-07.zip');
    expect(clickedLinks).toEqual([
      { href: OBJECT_URL, download: 'fieldnote-2026-10-07.zip', isConnected: false },
    ]);
  });

  it('keeps the object URL alive until the delay has passed', () => {
    downloadBlob(new Blob(['zip']), 'site.zip');
    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('revokes each download separately', () => {
    createObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
    downloadBlob(new Blob(['a']), 'a.json');
    downloadBlob(new Blob(['b']), 'b.json');
    vi.advanceTimersByTime(REVOKE_DELAY_MS);
    expect(revokeObjectURL.mock.calls).toEqual([['blob:first'], ['blob:second']]);
  });

  it('adds nothing to the page', () => {
    const childCount = document.body.childElementCount;
    downloadBlob(new Blob(['a']), 'a.json');
    expect(document.body.childElementCount).toBe(childCount);
  });

  it('does not revoke the URL when the object URL cannot be made', () => {
    createObjectURL.mockImplementationOnce(() => {
      throw new Error('Out of memory');
    });
    expect(() => downloadBlob(new Blob(['a']), 'a.json')).toThrow('Out of memory');
    vi.advanceTimersByTime(REVOKE_DELAY_MS);
    expect(clickedLinks).toEqual([]);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
