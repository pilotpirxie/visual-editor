import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FONT_ROLES, type DesignSystem } from '../../app/types';
import { derivedFontWeights } from '../../app/typography';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import { parseDesignSystem } from '../../persistence/validateProject';
import { CLEAN_PRESET } from '../../presets/presets';
import { contrastRatio, contrastWarnings, MIN_TEXT_CONTRAST } from './colors';
import {
  BRIEF_COLORS,
  briefFontNames,
  CORNERS,
  designSystemFromBrief,
  parseDesignBrief,
  SHADOWS,
  SPACINGS,
  TYPE_SCALES,
} from './designFromBrief';
import { loadFontList, type FontFamily } from './fontList';
import { defaultIconSetIds } from './randomDesignSystem';

const BRIEF_COUNT = 300;
const HEX_DIGITS = 6;
const base = CLEAN_PRESET.designSystem;

const BAKERY = {
  colors: {
    background: '#fff8f0',
    surface: '#f7ecdf',
    border: '#e6d5c3',
    text: '#2b1d14',
    mutedText: '#6f5b4d',
    primary: '#b4451f',
    darkBackground: '#2b1d14',
    accent: '#f6b26b',
  },
  headingFont: 'Fraunces',
  bodyFont: 'Work Sans',
  headingWeight: 600,
  typeScale: 'dramatic',
  baseSizePx: 17,
  spacing: 'airy',
  corners: 'large',
  shadows: 'soft',
  iconSet: 'phosphor',
};

let fontList: FontFamily[] = [];

function seededNumbers(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function randomBrief(seed: number): unknown {
  const next = seededNumbers(seed);
  const fonts = briefFontNames();
  function pick<Item>(items: readonly Item[]): Item {
    return items[Math.floor(next() * items.length)];
  }
  const colors: Record<string, string> = {};
  for (const name of BRIEF_COLORS) {
    const value = Math.floor(next() * 16777216);
    colors[name] = `#${value.toString(16).padStart(HEX_DIGITS, '0')}`;
  }
  return {
    colors,
    headingFont: pick(fonts.headings),
    bodyFont: pick(fonts.bodies),
    headingWeight: 300 + Math.floor(next() * 700),
    typeScale: pick(TYPE_SCALES),
    baseSizePx: 12 + next() * 10,
    spacing: pick(SPACINGS),
    corners: pick(CORNERS),
    shadows: pick(SHADOWS),
    iconSet: pick(defaultIconSetIds()),
  };
}

function expectSound(system: DesignSystem, label: string): void {
  expect(Object.keys(system.tokens), label).toEqual(Object.keys(base.tokens));
  const saved: unknown = JSON.parse(JSON.stringify(system));
  expect(parseDesignSystem(saved), label).toEqual(system);
  expect(contrastWarnings(system.tokens), label).toEqual([]);
  const primaryOnPage = contrastRatio(
    system.tokens['--color-primary'].value,
    system.tokens['--color-background'].value,
  );
  expect(primaryOnPage, label).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  for (const role of FONT_ROLES) {
    const font = system.fonts.find((selection) => selection.role === role);
    const family = fontList.find((listed) => listed.family === font?.family);
    expect(family, `${label} ${role}`).toBeDefined();
    expect(font?.weights, `${label} ${role}`).toEqual(derivedFontWeights(role, system.tokens));
    for (const weight of font?.weights ?? []) expect(family?.weights).toContain(weight);
    expect(system.tokens[`--font-${role}`].value).toContain(`"${font?.family ?? ''}"`);
  }
  expect(iconSetInfo(system.iconSet)?.isBrandOnly, label).toBe(false);
  expect(system.presetId, label).toBeUndefined();
}

beforeAll(async () => {
  fontList = await loadFontList();
});

describe('designSystemFromBrief', () => {
  it('uses the colors, fonts and choices of a good brief', () => {
    const system = designSystemFromBrief(base, fontList, parseDesignBrief(BAKERY));
    expectSound(system, 'bakery');
    expect(system.tokens['--color-background'].value).toBe('#fff8f0');
    expect(system.tokens['--color-surface'].value).toBe('#f7ecdf');
    expect(system.tokens['--color-text'].value).toBe('#2b1d14');
    expect(system.tokens['--color-primary'].value).toBe('#b4451f');
    expect(system.tokens['--theme-dark-background'].value).toBe('#2b1d14');
    expect(system.tokens['--theme-dark-accent'].value).toBe('#f6b26b');
    expect(system.fonts.map(({ family }) => family)).toEqual(['Fraunces', 'Work Sans']);
    expect(system.tokens['--font-weight-heading'].value).toBe('600');
    expect(system.generators).toEqual({ typeBasePx: 17, typeRatio: 1.333, spaceUnitPx: 5 });
    expect(system.tokens['--radius-md'].value).toBe('1rem');
    expect(system.tokens['--shadow-md'].value).not.toBe('none');
    expect(system.iconSet).toBe('phosphor');
  });

  it('makes a dark design from a dark background', () => {
    const brief = parseDesignBrief({
      ...BAKERY,
      colors: {
        background: '#0b1020',
        surface: '#141a2e',
        border: '#262d47',
        text: '#eef1fb',
        mutedText: '#a4abc4',
        primary: '#8fb4ff',
        darkBackground: '#05070f',
        accent: '#c6f36b',
      },
    });
    const system = designSystemFromBrief(base, fontList, brief);
    expectSound(system, 'dark');
    expect(system.tokens['--color-background'].value).toBe('#0b1020');
    expect(system.tokens['--theme-dark-background'].value).toBe('#05070f');
    expect(system.tokens['--color-primary'].value).toBe('#8fb4ff');
  });

  it('repairs colors that cannot be read', () => {
    const brief = parseDesignBrief({
      ...BAKERY,
      colors: {
        background: '#f4f4f4',
        surface: '#101010',
        border: '#f0f0f0',
        text: '#e9e9e9',
        mutedText: '#eeeeee',
        primary: '#fff36b',
        darkBackground: '#fafafa',
        accent: '#222222',
      },
    });
    const system = designSystemFromBrief(base, fontList, brief);
    expectSound(system, 'unreadable');
    expect(system.tokens['--color-background'].value).toBe('#f4f4f4');
    expect(system.tokens['--color-text'].value).not.toBe('#e9e9e9');
  });

  it('falls back to the current design for anything it cannot use', () => {
    for (const hostile of [null, 'blue please', [], { colors: 'red', headingFont: 7 }]) {
      const system = designSystemFromBrief(base, fontList, parseDesignBrief(hostile));
      expectSound(system, JSON.stringify(hostile));
      expect(system.fonts).toEqual(base.fonts);
      expect(system.tokens['--color-background'].value).toBe(
        base.tokens['--color-background'].value,
      );
      expect(system.iconSet).toBe(base.iconSet);
    }
  });

  it('ignores unknown fonts, icon sets and unsafe color text', () => {
    const brief = parseDesignBrief({
      ...BAKERY,
      colors: { ...BAKERY.colors, primary: 'url(https://example.com/x)', text: '#12' },
      headingFont: 'Comic Neue Ultra',
      bodyFont: 'Bebas Neue',
      iconSet: 'simple-icons',
    });
    const system = designSystemFromBrief(base, fontList, brief);
    expectSound(system, 'unknown');
    expect(system.fonts.map(({ family }) => family)).toEqual(['Inter', 'Inter']);
    expect(system.iconSet).toBe(base.iconSet);
  });

  it('keeps wide display headings on a scale that fits a phone', () => {
    const brief = parseDesignBrief({ ...BAKERY, headingFont: 'Unbounded', baseSizePx: 18 });
    const system = designSystemFromBrief(base, fontList, brief);
    expect(system.generators.typeRatio).toBe(1.25);
    expect(system.generators.typeBasePx).toBe(16);
  });

  it('is sound for any combination of choices and colors', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let seed = 1; seed <= BRIEF_COUNT; seed += 1) {
      const system = designSystemFromBrief(base, fontList, parseDesignBrief(randomBrief(seed)));
      expectSound(system, `brief ${seed}`);
    }
    vi.restoreAllMocks();
  });

  it('offers only fonts that exist in the bundled list', () => {
    const names = new Set(fontList.map(({ family }) => family));
    const fonts = briefFontNames();
    for (const family of [...fonts.headings, ...fonts.bodies]) expect(names).toContain(family);
  });
});
