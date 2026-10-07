import { describe, expect, it } from 'vitest';
import type { Token } from './types';
import { derivedFontWeights, nearestWeight } from './typography';

function weightToken(name: string, value: string): Token {
  return { name, label: name, group: 'typography', value };
}

const TOKENS: Record<string, Token> = {
  '--font-weight-heading': weightToken('--font-weight-heading', '600'),
  '--font-weight-regular': weightToken('--font-weight-regular', '400'),
  '--font-weight-bold': weightToken('--font-weight-bold', '700'),
};

describe('derivedFontWeights', () => {
  it('loads only the heading weight for the heading font', () => {
    expect(derivedFontWeights('heading', TOKENS)).toEqual([600]);
  });

  it('loads the body and bold weights for the body font, sorted', () => {
    const tokens = {
      ...TOKENS,
      '--font-weight-regular': weightToken('--font-weight-regular', '500'),
    };
    expect(derivedFontWeights('body', tokens)).toEqual([500, 700]);
  });

  it('loads a weight once when body and bold use the same one', () => {
    const tokens = { ...TOKENS, '--font-weight-bold': weightToken('--font-weight-bold', '400') };
    expect(derivedFontWeights('body', tokens)).toEqual([400]);
  });

  it('skips weight tokens that are missing or not whole numbers', () => {
    const tokens = { '--font-weight-regular': weightToken('--font-weight-regular', 'bold') };
    expect(derivedFontWeights('body', tokens)).toEqual([]);
    expect(derivedFontWeights('heading', {})).toEqual([]);
  });
});

describe('nearestWeight', () => {
  it('keeps a weight the font offers', () => {
    expect(nearestWeight(700, [400, 700])).toBe(700);
  });

  it('moves to the closest weight the font offers', () => {
    expect(nearestWeight(700, [400])).toBe(400);
    expect(nearestWeight(650, [300, 600, 900])).toBe(600);
  });

  it('prefers the first of two equally close weights', () => {
    expect(nearestWeight(500, [400, 600])).toBe(400);
  });

  it('keeps the wanted weight when nothing is offered', () => {
    expect(nearestWeight(700, [])).toBe(700);
  });
});
