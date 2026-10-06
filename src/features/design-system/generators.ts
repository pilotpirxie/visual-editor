import type { Token } from '../../app/types';

export type ShadowPreset = { id: string; label: string; values: Record<string, string> };

export const TYPE_RATIOS = [
  { value: 1.125, label: 'Major second (1.125)' },
  { value: 1.2, label: 'Minor third (1.2)' },
  { value: 1.25, label: 'Major third (1.25)' },
  { value: 1.333, label: 'Perfect fourth (1.333)' },
  { value: 1.5, label: 'Perfect fifth (1.5)' },
];

const TYPE_STEPS = [
  { name: '--text-xs', step: -2 },
  { name: '--text-sm', step: -1 },
  { name: '--text-base', step: 0 },
  { name: '--text-lg', step: 1 },
  { name: '--text-xl', step: 2 },
  { name: '--text-2xl', step: 3 },
  { name: '--text-3xl', step: 4 },
  { name: '--text-4xl', step: 5 },
  { name: '--text-5xl', step: 6 },
];

const FIRST_FLUID_STEP = 4;
const ROOT_FONT_SIZE_PX = 16;
const MIN_VIEWPORT_PX = 320;
const MAX_VIEWPORT_PX = 1280;
const PRECISION = 4;
const SPACE_TOKEN = /^--space-(?<step>\d+)$/;

export const SHADOW_PRESETS: ShadowPreset[] = [
  {
    id: 'none',
    label: 'None',
    values: { '--shadow-sm': 'none', '--shadow-md': 'none', '--shadow-lg': 'none' },
  },
  {
    id: 'soft',
    label: 'Soft',
    values: {
      '--shadow-sm': '0 1px 2px rgb(17 24 39 / 0.04)',
      '--shadow-md': '0 2px 8px rgb(17 24 39 / 0.05)',
      '--shadow-lg': '0 8px 24px rgb(17 24 39 / 0.08)',
    },
  },
  {
    id: 'medium',
    label: 'Medium',
    values: {
      '--shadow-sm': '0 1px 2px rgb(17 24 39 / 0.06)',
      '--shadow-md': '0 4px 12px rgb(17 24 39 / 0.08)',
      '--shadow-lg': '0 12px 32px rgb(17 24 39 / 0.12)',
    },
  },
  {
    id: 'strong',
    label: 'Strong',
    values: {
      '--shadow-sm': '0 2px 4px rgb(17 24 39 / 0.12)',
      '--shadow-md': '0 8px 20px rgb(17 24 39 / 0.16)',
      '--shadow-lg': '0 20px 48px rgb(17 24 39 / 0.22)',
    },
  },
];

function rounded(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function rem(px: number): string {
  return `${rounded(px / ROOT_FONT_SIZE_PX)}rem`;
}

function fluidSize(minPx: number, maxPx: number): string {
  const slope = (maxPx - minPx) / (MAX_VIEWPORT_PX - MIN_VIEWPORT_PX);
  const interceptPx = minPx - slope * MIN_VIEWPORT_PX;
  return `clamp(${rem(minPx)}, ${rem(interceptPx)} + ${rounded(slope * 100)}vw, ${rem(maxPx)})`;
}

export function typeScaleTokens(basePx: number, ratio: number): Record<string, string> {
  const values: Record<string, string> = {};
  const smallScreenRatio = 1 + (ratio - 1) / 2;
  for (const { name, step } of TYPE_STEPS) {
    const maxPx = basePx * ratio ** step;
    if (step < FIRST_FLUID_STEP) {
      values[name] = rem(maxPx);
      continue;
    }
    values[name] = fluidSize(basePx * smallScreenRatio ** step, maxPx);
  }
  return values;
}

export function spacingTokens(
  unitPx: number,
  tokens: Record<string, Token>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of Object.keys(tokens)) {
    const step = SPACE_TOKEN.exec(name)?.groups?.step;
    if (step === undefined) continue;
    values[name] = rem(Number(step) * unitPx);
  }
  return values;
}

export function activeShadowPreset(tokens: Record<string, Token>): string | null {
  for (const preset of SHADOW_PRESETS) {
    let isMatch = true;
    for (const [name, value] of Object.entries(preset.values)) {
      if (tokens[name]?.value !== value) isMatch = false;
    }
    if (isMatch) return preset.id;
  }
  return null;
}
