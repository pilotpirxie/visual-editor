import { describe, expect, it } from 'vitest';
import type { DesignSystemPreset } from '../app/types';
import { derivedFontWeights, WEIGHT_TOKENS } from '../app/typography';
import { contrastRatio, contrastWarnings, resolveColor } from '../features/design-system/colors';
import googleFonts from '../features/design-system/google-fonts.json';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import {
  applyPreset,
  BUILTIN_PRESETS,
  CLEAN_PRESET,
  parsePreset,
  PRESET_GROUPS,
  presetDesignSystem,
  withoutPresetId,
} from './presets';

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
  it('are the twelve presets of the PRD, in its order', () => {
    expect(BUILTIN_PRESETS.map((item) => item.name)).toEqual([
      'Clean',
      'Midnight',
      'Playful',
      'Corporate',
      'Editorial',
      'Mono',
      'Warm',
      'Bold',
      'Nature',
      'Pastel',
      'Luxury',
      'Brutalist',
    ]);
  });

  it.each(BUILTIN_PRESETS)('$name loads exactly the weights its weight tokens use', (item) => {
    const { fonts, tokens } = item.designSystem;
    for (const font of fonts) expect(font.weights).toEqual(derivedFontWeights(font.role, tokens));
  });

  it.each(BUILTIN_PRESETS)('$name sets heading and body weights its fonts offer', (item) => {
    const { fonts, tokens } = item.designSystem;
    for (const font of fonts) {
      const family = googleFonts.find((entry) => entry.family === font.family);
      for (const name of WEIGHT_TOKENS[font.role]) {
        expect(family?.weights, `${font.family} ${name}`).toContain(Number(tokens[name]?.value));
      }
    }
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

  it('forgets the previous preset when only some groups are taken', () => {
    const current = presetDesignSystem(CLEAN_PRESET);
    const applied = applyPreset(current, preset('midnight'), ['shape']);
    expect(current.presetId).toBe('clean');
    expect(applied.presetId).toBeUndefined();
  });

  it('changes nothing but the preset id when no group is taken', () => {
    const current = presetDesignSystem(CLEAN_PRESET);
    const applied = applyPreset(current, preset('midnight'), []);
    expect(applied).toEqual(withoutPresetId(current));
  });

  it('leaves the current design system untouched', () => {
    const current = presetDesignSystem(CLEAN_PRESET);
    const before = structuredClone(current);
    applyPreset(current, preset('midnight'), PRESET_GROUPS);
    expect(current).toEqual(before);
  });
});

describe('withoutPresetId', () => {
  it('keeps tokens, fonts, generators and the icon set but drops the preset id', () => {
    const designSystem = presetDesignSystem(preset('corporate'));
    const plain = withoutPresetId(designSystem);
    expect(plain).toEqual({
      tokens: designSystem.tokens,
      fonts: designSystem.fonts,
      generators: designSystem.generators,
      iconSet: 'material-symbols',
    });
    expect('presetId' in plain).toBe(false);
    expect(designSystem.presetId).toBe('corporate');
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

  it('trims the name, defaults the description and tags, and ignores a stored preset id', () => {
    const file = {
      id: 'mine',
      name: '  Mine  ',
      designSystem: { ...presetDesignSystem(CLEAN_PRESET), presetId: 'clean' },
    };
    const parsed = parsePreset(JSON.parse(JSON.stringify(file)), 'user');
    expect(parsed.name).toBe('Mine');
    expect(parsed.description).toBe('');
    expect(parsed.tags).toEqual([]);
    expect(parsed.source).toBe('user');
    expect('presetId' in parsed.designSystem).toBe(false);
  });

  it('rejects something that is not a preset object', () => {
    expect(() => parsePreset(null, 'user')).toThrow('not a design system preset');
    expect(() => parsePreset(['clean'], 'user')).toThrow('not a design system preset');
  });
});
