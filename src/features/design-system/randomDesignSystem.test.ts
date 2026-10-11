import { beforeAll, describe, expect, it } from 'vitest';
import type { DesignSystem } from '../../app/types';
import { derivedFontWeights } from '../../app/typography';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import { parseDesignSystem } from '../../persistence/validateProject';
import { CLEAN_PRESET } from '../../presets/presets';
import { FONT_ROLES } from '../../app/types';
import { contrastRatio, contrastWarnings, MIN_TEXT_CONTRAST } from './colors';
import { loadFontList, type FontFamily } from './fontList';
import { randomDesignSystem } from './randomDesignSystem';

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
