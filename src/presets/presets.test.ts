import { describe, expect, it } from 'vitest';
import type { DesignSystemPreset } from '../app/types';
import { contrastRatio, contrastWarnings, resolveColor } from '../features/design-system/colors';
import googleFonts from '../features/design-system/google-fonts.json';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import { applyPreset, BUILTIN_PRESETS, CLEAN_PRESET, parsePreset, PRESET_GROUPS } from './presets';

const MIN_TEXT_CONTRAST = 4.5;

function tokenNames(preset: DesignSystemPreset): string[] {
  return Object.keys(preset.designSystem.tokens).sort();
}

function preset(id: string): DesignSystemPreset {
  const found = BUILTIN_PRESETS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No preset ${id}`);
  return found;
}

describe('built-in presets', () => {
  it('are Clean, Midnight, Playful and Corporate', () => {
    expect(BUILTIN_PRESETS.map((item) => item.name)).toEqual([
      'Clean',
      'Midnight',
      'Playful',
      'Corporate',
    ]);
  });

  it.each(BUILTIN_PRESETS)('$name defines exactly the tokens Clean defines', (item) => {
    expect(tokenNames(item)).toEqual(tokenNames(CLEAN_PRESET));
  });

  it.each(BUILTIN_PRESETS)('$name keeps text readable against its backgrounds', (item) => {
    const { tokens } = item.designSystem;
    expect(contrastWarnings(tokens)).toEqual([]);
    const primary = resolveColor(tokens['--color-primary']?.value ?? '', tokens);
    const background = resolveColor(tokens['--color-background']?.value ?? '', tokens);
    expect(contrastRatio(primary, background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(BUILTIN_PRESETS)(
    '$name uses Google Fonts that exist with the weights it loads',
    (item) => {
      for (const font of item.designSystem.fonts) {
        const family = googleFonts.find((entry) => entry.family === font.family);
        expect(family, font.family).toBeDefined();
        for (const weight of font.weights) expect(family?.weights).toContain(weight);
      }
    },
  );

  it.each(BUILTIN_PRESETS)('$name names an icon set that can be a default', (item) => {
    expect(iconSetInfo(item.designSystem.iconSet)?.isBrandOnly).toBe(false);
  });
});

describe('applyPreset', () => {
  it('takes only the chosen groups', () => {
    const current = CLEAN_PRESET.designSystem;
    const midnight = preset('midnight');
    const applied = applyPreset(current, midnight, ['colors']);
    expect(applied.tokens['--color-background']).toEqual(
      midnight.designSystem.tokens['--color-background'],
    );
    expect(applied.tokens['--font-heading']).toEqual(current.tokens['--font-heading']);
    expect(applied.fonts).toEqual(current.fonts);
    expect(applied.iconSet).toBe(current.iconSet);
    expect(applied.presetId).toBeUndefined();
  });

  it('takes fonts with typography, the icon set with icons and records a full apply', () => {
    const playful = preset('playful');
    const applied = applyPreset(CLEAN_PRESET.designSystem, playful, PRESET_GROUPS);
    expect(applied.fonts).toEqual(playful.designSystem.fonts);
    expect(applied.generators).toEqual(playful.designSystem.generators);
    expect(applied.iconSet).toBe('tabler');
    expect(applied.tokens['--button-radius']?.value).toBe('var(--radius-full)');
    expect(applied.presetId).toBe('playful');
  });
});

describe('parsePreset', () => {
  it('reads a preset file and rejects one with unsafe values or no name', () => {
    const file = { ...CLEAN_PRESET, id: 'mine', name: 'Mine' };
    expect(parsePreset(JSON.parse(JSON.stringify(file)), 'user').name).toBe('Mine');
    expect(() => parsePreset({ ...file, name: ' ' }, 'user')).toThrow('no id or name');
    const unsafe = structuredClone(file);
    const primary = unsafe.designSystem.tokens['--color-primary'];
    if (primary !== undefined) primary.value = 'red; } * { display: none';
    expect(() => parsePreset(unsafe, 'user')).toThrow('designSystem.tokens.--color-primary.value');
  });
});
