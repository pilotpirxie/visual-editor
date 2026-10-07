import type { DesignSystem, DesignSystemPreset, TokenGroup } from '../app/types';
import { isRecord } from '../persistence/parseBlock';
import { parseDesignSystem, ProjectFormatError } from '../persistence/validateProject';
import bold from './bold.json';
import brutalist from './brutalist.json';
import clean from './clean.json';
import corporate from './corporate.json';
import editorial from './editorial.json';
import luxury from './luxury.json';
import midnight from './midnight.json';
import mono from './mono.json';
import nature from './nature.json';
import pastel from './pastel.json';
import playful from './playful.json';
import warm from './warm.json';

export const PRESET_GROUPS = ['colors', 'typography', 'spacing', 'shape', 'icons'] as const;

export type PresetGroup = (typeof PRESET_GROUPS)[number];

export const PRESET_GROUP_LABELS: Record<PresetGroup, string> = {
  colors: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing',
  shape: 'Shape, shadows and motion',
  icons: 'Icons',
};

const TOKEN_GROUPS: Record<PresetGroup, readonly TokenGroup[]> = {
  colors: ['color'],
  typography: ['typography'],
  spacing: ['spacing'],
  shape: ['shape', 'elevation', 'component', 'motion'],
  icons: [],
};

function textList(value: unknown): string[] {
  const items: string[] = [];
  if (!Array.isArray(value)) return items;
  for (const item of value) {
    if (typeof item === 'string') items.push(item);
  }
  return items;
}

export function withoutPresetId(designSystem: DesignSystem): DesignSystem {
  const { tokens, fonts, generators, iconSet } = designSystem;
  return { tokens, fonts, generators, iconSet };
}

export function parsePreset(
  value: unknown,
  source: DesignSystemPreset['source'],
): DesignSystemPreset {
  if (!isRecord(value)) throw new ProjectFormatError('This file is not a design system preset');
  const { id, name, description } = value;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || name.trim() === '') {
    throw new ProjectFormatError('This preset has no id or name');
  }
  const designSystem = withoutPresetId(parseDesignSystem(value.designSystem));
  return {
    id,
    name: name.trim(),
    description: typeof description === 'string' ? description : '',
    tags: textList(value.tags),
    source,
    designSystem,
  };
}

export const CLEAN_PRESET = parsePreset(clean, 'builtin');

export const BUILTIN_PRESETS: DesignSystemPreset[] = [
  CLEAN_PRESET,
  parsePreset(midnight, 'builtin'),
  parsePreset(playful, 'builtin'),
  parsePreset(corporate, 'builtin'),
  parsePreset(editorial, 'builtin'),
  parsePreset(mono, 'builtin'),
  parsePreset(warm, 'builtin'),
  parsePreset(bold, 'builtin'),
  parsePreset(nature, 'builtin'),
  parsePreset(pastel, 'builtin'),
  parsePreset(luxury, 'builtin'),
  parsePreset(brutalist, 'builtin'),
];

export function presetDesignSystem(preset: DesignSystemPreset): DesignSystem {
  return { ...structuredClone(preset.designSystem), presetId: preset.id };
}

export function applyPreset(
  current: DesignSystem,
  preset: DesignSystemPreset,
  groups: readonly PresetGroup[],
): DesignSystem {
  const next = structuredClone(current);
  const from = preset.designSystem;
  const tokenGroups = new Set<TokenGroup>();
  for (const group of groups) {
    for (const tokenGroup of TOKEN_GROUPS[group]) tokenGroups.add(tokenGroup);
  }
  for (const token of Object.values(from.tokens)) {
    if (tokenGroups.has(token.group)) next.tokens[token.name] = { ...token };
  }
  if (groups.includes('typography')) {
    next.fonts = structuredClone(from.fonts);
    next.generators.typeBasePx = from.generators.typeBasePx;
    next.generators.typeRatio = from.generators.typeRatio;
  }
  if (groups.includes('spacing')) next.generators.spaceUnitPx = from.generators.spaceUnitPx;
  if (groups.includes('icons')) next.iconSet = from.iconSet;
  const isWholePreset = PRESET_GROUPS.every((group) => groups.includes(group));
  if (isWholePreset) return { ...next, presetId: preset.id };
  return withoutPresetId(next);
}
