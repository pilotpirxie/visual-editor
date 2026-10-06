import { describe, expect, it } from 'vitest';
import { createBlankProject } from '../../app/projectFactory';
import type { Token } from '../../app/types';
import { activeShadowPreset, SHADOW_PRESETS, spacingTokens, typeScaleTokens } from './generators';

function cleanTokens(): Record<string, Token> {
  return createBlankProject('Test').designSystem.tokens;
}

describe('typeScaleTokens', () => {
  it('multiplies the base size by the ratio for each step and keeps small sizes fixed', () => {
    const values = typeScaleTokens(16, 1.25);
    expect(values['--text-base']).toBe('1rem');
    expect(values['--text-lg']).toBe('1.25rem');
    expect(values['--text-sm']).toBe('0.8rem');
    expect(values['--text-xs']).toBe('0.64rem');
    expect(values['--text-2xl']).toBe('1.9531rem');
  });

  it('makes heading sizes fluid between a smaller phone size and the full desktop size', () => {
    const values = typeScaleTokens(16, 1.25);
    expect(values['--text-3xl']).toBe('clamp(1.6018rem, 1.3219rem + 1.3993vw, 2.4414rem)');
    expect(values['--text-5xl']).toMatch(/^clamp\(\S+rem, \S+rem \+ \S+vw, 3\.8147rem\)$/);
  });

  it('covers every text size token', () => {
    expect(Object.keys(typeScaleTokens(18, 1.2))).toHaveLength(9);
  });
});

describe('spacingTokens', () => {
  it('sets each numbered space token to its step times the base unit', () => {
    const values = spacingTokens(8, cleanTokens());
    expect(values['--space-1']).toBe('0.5rem');
    expect(values['--space-4']).toBe('2rem');
    expect(values['--space-16']).toBe('8rem');
  });

  it('leaves named spacing tokens such as section padding alone', () => {
    const values = spacingTokens(4, cleanTokens());
    expect(values['--section-padding-y']).toBeUndefined();
    expect(values['--container-max-width']).toBeUndefined();
  });
});

describe('activeShadowPreset', () => {
  it('recognizes the medium preset in the Clean design system', () => {
    expect(activeShadowPreset(cleanTokens())).toBe('medium');
  });

  it('recognizes a preset after its values are applied', () => {
    const tokens = cleanTokens();
    const strong = SHADOW_PRESETS[3];
    for (const [name, value] of Object.entries(strong.values)) {
      tokens[name] = { ...tokens[name], value };
    }
    expect(activeShadowPreset(tokens)).toBe('strong');
  });

  it('returns null for hand-edited shadows', () => {
    const tokens = cleanTokens();
    tokens['--shadow-md'] = { ...tokens['--shadow-md'], value: '0 0 1px black' };
    expect(activeShadowPreset(tokens)).toBeNull();
  });
});
