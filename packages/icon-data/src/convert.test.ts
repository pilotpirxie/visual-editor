import { describe, expect, it } from 'vitest';
import { convertIconifySet } from './convert';

describe('convertIconifySet', () => {
  const source = {
    prefix: 'demo',
    width: 24,
    height: 24,
    icons: {
      star: { body: '<path d="M1 1"/>' },
      wide: { body: '<path d="M2 2"/>', width: 32 },
      old: { body: '<path d="M3 3"/>', hidden: true },
    },
    aliases: {
      favourite: { parent: 'star' },
      flipped: { parent: 'star', hFlip: true },
      legacy: { parent: 'old' },
    },
  };

  it('keeps icons with their own sizes, marks hidden ones and keeps the set size', () => {
    const converted = convertIconifySet(source);
    expect(converted.width).toBe(24);
    expect(converted.icons).toEqual({
      star: { body: '<path d="M1 1"/>' },
      wide: { body: '<path d="M2 2"/>', width: 32 },
      old: { body: '<path d="M3 3"/>', hidden: true },
    });
  });

  it('keeps plain aliases and drops transformed or dangling ones', () => {
    const converted = convertIconifySet({
      ...source,
      aliases: { ...source.aliases, gone: { parent: 'nope' } },
    });
    expect(converted.aliases).toEqual({ favourite: 'star', legacy: 'old' });
  });

  it('rejects data without icons', () => {
    expect(() => convertIconifySet({ prefix: 'demo' })).toThrow(/icons/);
  });
});
