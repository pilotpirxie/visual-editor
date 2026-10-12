import { beforeAll, describe, expect, it } from 'vitest';
import type { DesignSystem } from '../../app/types';
import { derivedFontWeights } from '../../app/typography';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import { parseDesignSystem } from '../../persistence/validateProject';
import { CLEAN_PRESET } from '../../presets/presets';
import { FONT_ROLES } from '../../app/types';
import { contrastRatio, contrastWarnings, MIN_TEXT_CONTRAST } from './colors';
import { loadFontList, type FontFamily } from './fontList';
import {
  hasReadableBody,
  randomDesignSystem,
  tokensWithValues,
  withFonts,
  withStandardPrimaryTheme,
  type TypeChoice,
} from './randomDesignSystem';

const SEED_COUNT = 300;
const base = CLEAN_PRESET.designSystem;

let fontList: FontFamily[] = [];
let systems: { seed: number; system: DesignSystem }[] = [];

function distinct(values: string[]): number {
  return new Set(values).size;
}

beforeAll(async () => {
  fontList = await loadFontList();
  systems = [];
  for (let seed = 1; seed <= SEED_COUNT; seed += 1) {
    systems.push({ seed, system: randomDesignSystem(base, fontList, seed * 7919) });
  }
});

describe('randomDesignSystem', () => {
  it('keeps every token of the current design with its label and group', () => {
    for (const { seed, system } of systems) {
      expect(Object.keys(system.tokens), `seed ${seed}`).toEqual(Object.keys(base.tokens));
      for (const [name, token] of Object.entries(system.tokens)) {
        expect(token.label).toBe(base.tokens[name].label);
        expect(token.group).toBe(base.tokens[name].group);
      }
      expect(system.presetId, `seed ${seed}`).toBeUndefined();
    }
  });

  it('is a design system a project file accepts', () => {
    for (const { seed, system } of systems) {
      const saved: unknown = JSON.parse(JSON.stringify(system));
      expect(parseDesignSystem(saved), `seed ${seed}`).toEqual(system);
    }
  });

  it('always has readable text, buttons and links', () => {
    for (const { seed, system } of systems) {
      expect(contrastWarnings(system.tokens), `seed ${seed}`).toEqual([]);
      const primaryOnPage = contrastRatio(
        system.tokens['--color-primary'].value,
        system.tokens['--color-background'].value,
      );
      expect(primaryOnPage, `seed ${seed}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it('picks real fonts and loads exactly the weights the design uses', () => {
    for (const { seed, system } of systems) {
      for (const role of FONT_ROLES) {
        const font = system.fonts.find((selection) => selection.role === role);
        const family = fontList.find((listed) => listed.family === font?.family);
        expect(family, `seed ${seed} ${role}`).toBeDefined();
        expect(font?.weights, `seed ${seed} ${role}`).toEqual(
          derivedFontWeights(role, system.tokens),
        );
        for (const weight of font?.weights ?? []) {
          expect(family?.weights, `seed ${seed} ${role}`).toContain(weight);
        }
        expect(system.tokens[`--font-${role}`].value).toContain(`"${font?.family ?? ''}"`);
      }
    }
  });

  it('picks an icon set that can be a default', () => {
    for (const { seed, system } of systems) {
      expect(iconSetInfo(system.iconSet)?.isBrandOnly, `seed ${seed}`).toBe(false);
    }
  });

  it('gives the same design for the same seed and leaves the current one alone', () => {
    const before = JSON.stringify(base);
    expect(randomDesignSystem(base, fontList, 42)).toEqual(randomDesignSystem(base, fontList, 42));
    expect(JSON.stringify(base)).toBe(before);
  });

  it('varies colors, moods, fonts, shapes and icons widely', () => {
    const primaries: string[] = [];
    const headings: string[] = [];
    const radii: string[] = [];
    const iconSets: string[] = [];
    let darkCount = 0;
    for (const { system } of systems) {
      primaries.push(system.tokens['--color-primary'].value);
      headings.push(system.fonts[0]?.family ?? '');
      radii.push(system.tokens['--radius-md'].value);
      iconSets.push(system.iconSet);
      const isDark =
        (contrastRatio('#ffffff', system.tokens['--color-background'].value) ?? 1) > 4.5;
      if (isDark) darkCount += 1;
    }
    expect(distinct(primaries)).toBeGreaterThan(280);
    expect(distinct(headings)).toBeGreaterThan(40);
    expect(distinct(radii)).toBe(5);
    expect(distinct(iconSets)).toBe(7);
    expect(darkCount).toBeGreaterThan(60);
    expect(darkCount).toBeLessThan(160);
  });

  it('keeps the current fonts when the font list has none of its families', () => {
    const system = randomDesignSystem(base, [], 42);
    expect(system.fonts).toEqual(base.fonts);
    expect(system.tokens['--font-heading'].value).toBe(base.tokens['--font-heading'].value);
    expect(system.tokens['--font-weight-heading'].value).toBe(
      base.tokens['--font-weight-heading'].value,
    );
  });
});

function family(name: string, weights: number[]): FontFamily {
  return { family: name, category: 'sans-serif', weights };
}

describe('hasReadableBody', () => {
  it('accepts a family with a regular and a bold weight', () => {
    expect(hasReadableBody(family('Inter', [400, 700]))).toBe(true);
  });

  it('accepts semibold in place of bold', () => {
    expect(hasReadableBody(family('Inter', [400, 600]))).toBe(true);
  });

  it('refuses a family without a regular weight', () => {
    expect(hasReadableBody(family('Heavy', [600, 700]))).toBe(false);
  });

  it('refuses a family with only a regular weight, or with no weights', () => {
    expect(hasReadableBody(family('Thin', [400]))).toBe(false);
    expect(hasReadableBody(family('Empty', []))).toBe(false);
  });
});

describe('withFonts', () => {
  const plain: TypeChoice = {
    values: { '--text-base': '1rem' },
    families: null,
    typeBasePx: 16,
    typeRatio: 1.25,
  };

  it('adds both font stacks and the three weights, and names the families', () => {
    const heading = family('Fraunces', [400, 600, 900]);
    const body = family('Inter', [400, 700]);
    expect(withFonts(plain, heading, body, 900)).toEqual({
      values: {
        '--text-base': '1rem',
        '--font-heading': '"Fraunces", system-ui, sans-serif',
        '--font-body': '"Inter", system-ui, sans-serif',
        '--font-weight-heading': '900',
        '--font-weight-regular': '400',
        '--font-weight-bold': '700',
      },
      families: { heading: 'Fraunces', body: 'Inter' },
      typeBasePx: 16,
      typeRatio: 1.25,
    });
  });

  it('uses the nearest heading weight the family has', () => {
    const heading = family('Fraunces', [400, 600]);
    const typed = withFonts(plain, heading, family('Inter', [400, 700]), 800);
    expect(typed.values['--font-weight-heading']).toBe('600');
  });

  it('falls back to semibold when the body has no bold', () => {
    const body = family('Soft', [400, 600]);
    expect(withFonts(plain, body, body, 600).values['--font-weight-bold']).toBe('600');
  });

  it('keeps the wanted heading weight when the family lists none', () => {
    const typed = withFonts(plain, family('Bare', []), family('Inter', [400, 700]), 500);
    expect(typed.values['--font-weight-heading']).toBe('500');
  });

  it('leaves the given choice alone', () => {
    withFonts(plain, family('Fraunces', [700]), family('Inter', [400, 700]), 700);
    expect(plain).toEqual({
      values: { '--text-base': '1rem' },
      families: null,
      typeBasePx: 16,
      typeRatio: 1.25,
    });
  });
});

describe('tokensWithValues', () => {
  it('replaces the values that are given and keeps the rest of each token', () => {
    const tokens = tokensWithValues(base.tokens, { '--color-primary': '#123456' });
    expect(tokens['--color-primary']).toEqual({
      ...base.tokens['--color-primary'],
      value: '#123456',
    });
    expect(tokens['--color-text']).toEqual(base.tokens['--color-text']);
    expect(Object.keys(tokens)).toEqual(Object.keys(base.tokens));
  });

  it('ignores values for tokens the design does not have', () => {
    const tokens = tokensWithValues(base.tokens, { '--not-a-token': 'red' });
    expect(tokens).toEqual(base.tokens);
    expect(tokens).not.toHaveProperty('--not-a-token');
  });

  it('gives an empty set for a design without tokens and leaves the given tokens alone', () => {
    expect(tokensWithValues({}, { '--color-primary': '#123456' })).toEqual({});
    const before = structuredClone(base.tokens);
    tokensWithValues(base.tokens, { '--color-primary': '#123456' });
    expect(base.tokens).toEqual(before);
  });
});

describe('withStandardPrimaryTheme', () => {
  it('sets the primary section theme to the standard one and keeps the other values', () => {
    const themed = withStandardPrimaryTheme({
      '--color-primary': '#123456',
      '--theme-primary-background': 'hotpink',
    });
    expect(themed['--color-primary']).toBe('#123456');
    expect(themed['--theme-primary-background']).toBe(
      base.tokens['--theme-primary-background'].value,
    );
    expect(themed['--theme-primary-accent-contrast']).toBe(
      base.tokens['--theme-primary-accent-contrast'].value,
    );
  });

  it('leaves the given values alone', () => {
    const values = { '--color-primary': '#123456' };
    withStandardPrimaryTheme(values);
    expect(values).toEqual({ '--color-primary': '#123456' });
  });
});
