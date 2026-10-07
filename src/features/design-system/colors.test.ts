import { describe, expect, it } from 'vitest';
import { createBlankProject } from '../../app/projectFactory';
import type { Token } from '../../app/types';
import { contrastRatio, contrastWarnings, resolveColor, toPickerHex } from './colors';

function cleanTokens(): Record<string, Token> {
  return createBlankProject('Test').designSystem.tokens;
}

function withColor(
  tokens: Record<string, Token>,
  name: string,
  value: string,
): Record<string, Token> {
  return { ...tokens, [name]: { ...tokens[name], value } };
}

describe('toPickerHex', () => {
  it.each([
    ['#abc', '#aabbcc'],
    ['#4f46e5', '#4f46e5'],
    ['#4f46e580', '#4f46e5'],
    ['rgb(0 0 0)', '#000000'],
  ])('turns %s into %s', (color, expected) => {
    expect(toPickerHex(color)).toBe(expected);
  });
});

describe('resolveColor', () => {
  it('follows a token reference to its value', () => {
    expect(resolveColor('var(--color-primary)', cleanTokens())).toBe('#4f46e5');
  });

  it('follows chains of references and resolves references inside a color function', () => {
    const tokens = cleanTokens();
    expect(resolveColor('var(--theme-primary-accent)', tokens)).toBe('#ffffff');
    expect(resolveColor('var(--theme-primary-border)', tokens)).toBe(
      'color-mix(in oklab, #ffffff 30%, transparent)',
    );
  });

  it('stops at a reference cycle', () => {
    const tokens = withColor(cleanTokens(), '--color-primary', 'var(--color-primary)');
    expect(resolveColor('var(--color-primary)', tokens)).toBe('#000000');
  });

  it('returns plain colors unchanged and black for unknown tokens', () => {
    expect(resolveColor('#123456', cleanTokens())).toBe('#123456');
    expect(resolveColor('var(--color-missing)', cleanTokens())).toBe('#000000');
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#4f46e5', '#4f46e5')).toBeCloseTo(1, 5);
  });

  it('understands short hex colors', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });

  it('returns null for colors it cannot measure', () => {
    expect(contrastRatio('rgb(0 0 0)', '#ffffff')).toBeNull();
  });
});

describe('contrastWarnings', () => {
  it('finds nothing in the Clean design system', () => {
    expect(contrastWarnings(cleanTokens())).toEqual([]);
  });

  it('warns about text that is too light for its background', () => {
    const tokens = withColor(cleanTokens(), '--color-text', '#bbbbbb');
    const warnings = contrastWarnings(tokens);
    expect(
      warnings.map(({ foreground, background }) => [foreground.name, background.name]),
    ).toEqual([
      ['--color-text', '--color-background'],
      ['--color-text', '--color-surface'],
    ]);
    expect(warnings[0].ratio).toBeLessThan(4.5);
  });

  it('resolves token references, so primary sections inherit a broken primary pair', () => {
    const tokens = withColor(cleanTokens(), '--color-primary-contrast', 'var(--color-primary)');
    const pairs = contrastWarnings(tokens).map(
      ({ foreground, background }) => `${foreground.name} on ${background.name}`,
    );
    expect(pairs).toContain('--color-primary-contrast on --color-primary');
    expect(pairs).toContain('--theme-primary-text on --theme-primary-background');
  });

  it('checks dark section colors', () => {
    const tokens = withColor(cleanTokens(), '--theme-dark-text-muted', '#374151');
    expect(contrastWarnings(tokens)).toEqual([
      expect.objectContaining({
        foreground: expect.objectContaining({ name: '--theme-dark-text-muted' }),
        background: expect.objectContaining({ name: '--theme-dark-background' }),
      }),
    ]);
  });
});
