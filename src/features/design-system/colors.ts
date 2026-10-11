import { themeTokenName, THEME_FAMILIES, type ThemedToken } from '../../app/sectionThemes';
import type { Token } from '../../app/types';

const SHORT_HEX = /^#(?<r>[0-9a-f])(?<g>[0-9a-f])(?<b>[0-9a-f])$/i;
const LONG_HEX = /^#[0-9a-f]{6}/i;
const FALLBACK_HEX = '#000000';
const VAR_REFERENCE = /var\(\s*(?<name>--[a-z0-9-]+)\s*\)/g;

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

export function resolveColor(
  value: string,
  tokens: Record<string, Token>,
  seen: ReadonlySet<string> = new Set(),
): string {
  return value.replace(VAR_REFERENCE, (_reference, name: string) => {
    const token = tokens[name];
    if (token === undefined || seen.has(name)) return FALLBACK_HEX;
    return resolveColor(token.value, tokens, new Set([...seen, name]));
  });
}

const CHROMA_SHRINK = 0.95;
const GAMUT_TOLERANCE = 0.0001;
const MAX_GAMUT_STEPS = 80;

type LinearRgb = { red: number; green: number; blue: number };

function oklchToLinearRgb(lightness: number, chroma: number, hue: number): LinearRgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    red: 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    green: -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    blue: -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  };
}

function isInGamut({ red, green, blue }: LinearRgb): boolean {
  for (const channel of [red, green, blue]) {
    if (channel < -GAMUT_TOLERANCE || channel > 1 + GAMUT_TOLERANCE) return false;
  }
  return true;
}

function hexChannel(linear: number): string {
  const clamped = Math.min(1, Math.max(0, linear));
  const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255)
    .toString(16)
    .padStart(2, '0');
}

export function oklchToHex(lightness: number, chroma: number, hue: number): string {
  let fitted = chroma;
  let rgb = oklchToLinearRgb(lightness, fitted, hue);
  for (let step = 0; step < MAX_GAMUT_STEPS && !isInGamut(rgb); step += 1) {
    fitted *= CHROMA_SHRINK;
    rgb = oklchToLinearRgb(lightness, fitted, hue);
  }
  return `#${hexChannel(rgb.red)}${hexChannel(rgb.green)}${hexChannel(rgb.blue)}`;
}

export type ContrastWarning = { foreground: Token; background: Token; ratio: number };

export const MIN_TEXT_CONTRAST = 4.5;

const HEX_COLOR = /^#(?<digits>[0-9a-f]{3}|[0-9a-f]{6})$/i;

type ContrastPair = { foreground: string; background: string };

type ThemedPair = { foreground: ThemedToken; background: ThemedToken };

const BASE_PAIRS: ThemedPair[] = [
  { foreground: '--color-text', background: '--color-background' },
  { foreground: '--color-text-muted', background: '--color-background' },
  { foreground: '--color-text', background: '--color-surface' },
  { foreground: '--color-primary-contrast', background: '--color-primary' },
];

const THEME_PAIRS: ThemedPair[] = [
  ...BASE_PAIRS,
  { foreground: '--color-primary', background: '--color-background' },
];

function contrastPairs(): ContrastPair[] {
  const pairs: ContrastPair[] = [...BASE_PAIRS];
  for (const family of THEME_FAMILIES) {
    for (const { foreground, background } of THEME_PAIRS) {
      pairs.push({
        foreground: themeTokenName(family, foreground),
        background: themeTokenName(family, background),
      });
    }
  }
  return pairs;
}

const CONTRAST_PAIRS = contrastPairs();

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
