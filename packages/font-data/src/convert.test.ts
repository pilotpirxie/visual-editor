import { describe, expect, it } from 'vitest';
import { convertGoogleFontsMetadata } from './convert';

function metadata(families: unknown[]): string {
  return JSON.stringify({ familyMetadataList: families });
}

describe('convertGoogleFontsMetadata', () => {
  it('keeps the family, its category and its upright weights, most popular first', () => {
    const text = metadata([
      {
        family: 'Lora',
        category: 'Serif',
        popularity: 40,
        fonts: { '700': {}, '400': {}, '400i': {} },
      },
      { family: 'Inter', category: 'Sans Serif', popularity: 5, fonts: { '400': {}, '900': {} } },
    ]);
    expect(convertGoogleFontsMetadata(text)).toEqual([
      { family: 'Inter', category: 'sans-serif', weights: [400, 900] },
      { family: 'Lora', category: 'serif', weights: [400, 700] },
    ]);
  });

  it('accepts metadata behind the XSSI guard prefix', () => {
    const text = `)]}'${metadata([{ family: 'Space Mono', category: 'Monospace', fonts: { '400': {} } }])}`;
    expect(convertGoogleFontsMetadata(text)).toEqual([
      { family: 'Space Mono', category: 'monospace', weights: [400] },
    ]);
  });

  it('skips families with an unknown category or no upright weights', () => {
    const text = metadata([
      { family: 'Mystery', category: 'Symbols', fonts: { '400': {} } },
      { family: 'Only Italic', category: 'Serif', fonts: { '400i': {} } },
      { family: 'Broken' },
    ]);
    expect(convertGoogleFontsMetadata(text)).toEqual([]);
  });

  it('rejects text that is not JSON or has no family list', () => {
    expect(() => convertGoogleFontsMetadata('<html>')).toThrow(
      'Google Fonts metadata is not valid JSON',
    );
    expect(() => convertGoogleFontsMetadata('{}')).toThrow(
      'Google Fonts metadata must have a "familyMetadataList" array',
    );
  });
});
