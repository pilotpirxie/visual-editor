import type { Token } from '../../app/types';
import { referencedTokenName } from '../../render/css';

const SHORT_HEX = /^#(?<r>[0-9a-f])(?<g>[0-9a-f])(?<b>[0-9a-f])$/i;
const LONG_HEX = /^#[0-9a-f]{6}/i;
const FALLBACK_HEX = '#000000';

export function toPickerHex(color: string): string {
  const short = SHORT_HEX.exec(color);
  if (short !== null && short.groups !== undefined) {
    const { r, g, b } = short.groups;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const long = LONG_HEX.exec(color);
  if (long === null) return FALLBACK_HEX;
  return long[0];
}

export function resolveColor(value: string, tokens: Record<string, Token>): string {
  const name = referencedTokenName(value);
  if (name === null) return value;
  const token = tokens[name];
  if (token === undefined) return FALLBACK_HEX;
  return token.value;
}

export type ContrastWarning = { foreground: Token; background: Token; ratio: number };

export const MIN_TEXT_CONTRAST = 4.5;

const HEX_COLOR = /^#(?<digits>[0-9a-f]{3}|[0-9a-f]{6})$/i;

const CONTRAST_PAIRS = [
  { foreground: '--color-text', background: '--color-background' },
  { foreground: '--color-text-muted', background: '--color-background' },
  { foreground: '--color-text', background: '--color-surface' },
  { foreground: '--color-primary-contrast', background: '--color-primary' },
];

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  if (srgb <= 0.03928) return srgb / 12.92;
  return ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number | null {
  if (!HEX_COLOR.test(hex)) return null;
  const full = toPickerHex(hex);
  const red = Number.parseInt(full.slice(1, 3), 16);
  const green = Number.parseInt(full.slice(3, 5), 16);
  const blue = Number.parseInt(full.slice(5, 7), 16);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number | null {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastWarnings(tokens: Record<string, Token>): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  for (const pair of CONTRAST_PAIRS) {
    const foreground = tokens[pair.foreground];
    const background = tokens[pair.background];
    if (foreground === undefined || background === undefined) continue;
    const ratio = contrastRatio(
      resolveColor(foreground.value, tokens),
      resolveColor(background.value, tokens),
    );
    if (ratio !== null && ratio < MIN_TEXT_CONTRAST) {
      warnings.push({ foreground, background, ratio });
    }
  }
  return warnings;
}
