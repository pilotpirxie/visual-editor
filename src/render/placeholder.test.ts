import { describe, expect, it } from 'vitest';
import {
  placeholderDataUrl,
  placeholderImage,
  placeholderSize,
  placeholderSvg,
} from './placeholder';

describe('placeholders', () => {
  it.each([
    ['1:1', { width: 1200, height: 1200 }],
    ['4:3', { width: 1200, height: 900 }],
    ['16:9', { width: 1200, height: 675 }],
    ['21:9', { width: 1200, height: 514 }],
    ['3:4', { width: 900, height: 1200 }],
  ] as const)('sizes %s as %o', (ratio, size) => {
    expect(placeholderSize(ratio)).toEqual(size);
  });

  it('draws the dimensions into the SVG', () => {
    const svg = placeholderSvg({ ratio: '4:3', subject: 'person' });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1200" height="900"/);
    expect(svg).toContain('1200 × 900');
  });

  it('encodes the SVG as a data URL', () => {
    const url = placeholderDataUrl({ ratio: '1:1', subject: 'logo' });
    expect(url.startsWith('data:image/svg+xml,%3Csvg')).toBe(true);
    expect(url).not.toContain('"');
  });

  it('builds an image value with the size of its ratio', () => {
    expect(placeholderImage({ ratio: '3:2', subject: 'product' }, 'A desk lamp')).toEqual({
      source: 'placeholder',
      src: '',
      alt: 'A desk lamp',
      decorative: false,
      width: 1200,
      height: 800,
      placeholder: { ratio: '3:2', subject: 'product' },
    });
  });
});
