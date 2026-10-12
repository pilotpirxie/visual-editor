import type { DesignSystem, FontRole, Token } from '../../app/types';
import { nearestWeight } from '../../app/typography';
import { isRecord } from '../../components/fields';
import { CLEAN_PRESET } from '../../presets/presets';
import { fontStack } from '../../render/fonts';
import {
  contrastRatio,
  contrastWarnings,
  hexToOklch,
  MIN_TEXT_CONTRAST,
  oklchToHex,
  type Oklch,
} from './colors';
import type { FontFamily } from './fontList';
import { SHADOW_PRESETS, spacingTokens, typeScaleTokens } from './generators';
import {
  BODY_FAMILIES,
  BUTTON_PADDINGS_X,
  BUTTON_PADDINGS_Y,
  COMPACT_PADDING,
  contrastColorFor,
  DARK_SHADOWS,
  defaultIconSetIds,
  fontsFor,
  isDarkColor,
  NO_SHADOWS,
  PRIMARY_THEME_TOKENS,
  randomDesignSystem,
  readableOn,
  ROOMY_PADDING,
  SHAPES,
  VOICES,
  type Random,
} from './randomDesignSystem';

export const TYPE_SCALES = ['compact', 'balanced', 'dramatic'] as const;
export const SPACINGS = ['tight', 'regular', 'airy'] as const;
export const CORNERS = ['sharp', 'small', 'medium', 'large', 'pill'] as const;
export const SHADOWS = ['none', 'soft', 'medium', 'strong'] as const;
export const BRIEF_COLORS = [
  'background',
  'surface',
  'border',
  'text',
  'mutedText',
  'primary',
  'darkBackground',
  'accent',
] as const;

type TypeScale = (typeof TYPE_SCALES)[number];
type Spacing = (typeof SPACINGS)[number];
type Corners = (typeof CORNERS)[number];
type Shadows = (typeof SHADOWS)[number];
type BriefColor = (typeof BRIEF_COLORS)[number];

export type DesignBrief = {
  colors: Record<BriefColor, string | null>;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  typeScale: TypeScale;
  baseSizePx: number;
  spacing: Spacing;
  corners: Corners;
  shadows: Shadows;
  iconSet: string;
};

type TokenValues = Record<string, string>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const COLOR_TOKEN = /^--(?:color|theme)-/;
const RATIOS: Record<TypeScale, number> = { compact: 1.2, balanced: 1.25, dramatic: 1.333 };
const SPACE_UNITS_PX: Record<Spacing, number> = { tight: 4, regular: 4.5, airy: 5 };
const MIN_BASE_PX = 15;
const MAX_BASE_PX = 18;
const DEFAULT_BASE_PX = 16;
const MIN_HEADING_WEIGHT = 400;
const MAX_HEADING_WEIGHT = 900;
const DEFAULT_HEADING_WEIGHT = 700;
const REGULAR_WEIGHT = 400;
const BOLD_WEIGHT = 700;
const SEMIBOLD_WEIGHT = 600;
const DEFAULT_TIGHT_LINE_HEIGHT = '1.15';
const NORMAL_LINE_HEIGHT = '1.65';
const SURFACE_SHIFT = 0.035;
const BORDER_SHIFT = 0.1;
const DARK_SURFACE_SHIFT = 0.055;
const DARK_BORDER_SHIFT = 0.13;
const DEEPER_SHIFT = 0.05;
const MIN_LIGHTNESS = 0.08;
const MAX_GROUND_LIGHTNESS = 0.3;
const DARK_TEXT: Oklch = { lightness: 0.975, chroma: 0.006, hue: 0 };
const DARK_MUTED: Oklch = { lightness: 0.78, chroma: 0.012, hue: 0 };
const LIGHT_MUTED_LIGHTNESS = 0.5;
const ACCENT_LIGHTNESS = 0.82;
const HEX_RADIX = 16;

const MIDPOINT: Random = {
  between: (min, max) => (min + max) / 2,
  pick: (items) => items[0],
  isChance: () => false,
};

function oneOf<Choice extends string>(
  choices: readonly Choice[],
  value: unknown,
  fallback: Choice,
): Choice {
  for (const choice of choices) {
    if (choice === value) return choice;
  }
  return fallback;
}

export function parseDesignBrief(value: unknown): DesignBrief {
  const brief = isRecord(value) ? value : {};
  const given = isRecord(brief.colors) ? brief.colors : {};
  const colors: Record<string, string | null> = {};
  for (const name of BRIEF_COLORS) {
    const color = given[name];
    colors[name] = typeof color === 'string' && HEX_COLOR.test(color) ? color.toLowerCase() : null;
  }
  const baseSize = typeof brief.baseSizePx === 'number' ? brief.baseSizePx : DEFAULT_BASE_PX;
  const weight =
    typeof brief.headingWeight === 'number' ? brief.headingWeight : DEFAULT_HEADING_WEIGHT;
  return {
    colors: {
      background: colors.background,
      surface: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: colors.mutedText,
      primary: colors.primary,
      darkBackground: colors.darkBackground,
      accent: colors.accent,
    },
    headingFont: typeof brief.headingFont === 'string' ? brief.headingFont : '',
    bodyFont: typeof brief.bodyFont === 'string' ? brief.bodyFont : '',
    headingWeight: Math.min(MAX_HEADING_WEIGHT, Math.max(MIN_HEADING_WEIGHT, weight)),
    typeScale: oneOf(TYPE_SCALES, brief.typeScale, 'balanced'),
    baseSizePx: Math.min(MAX_BASE_PX, Math.max(MIN_BASE_PX, Math.round(baseSize))),
    spacing: oneOf(SPACINGS, brief.spacing, 'regular'),
    corners: oneOf(CORNERS, brief.corners, 'medium'),
    shadows: oneOf(SHADOWS, brief.shadows, 'soft'),
    iconSet: typeof brief.iconSet === 'string' ? brief.iconSet : '',
  };
}

export function briefFontNames(): { headings: string[]; bodies: string[] } {
  const headings: string[] = [];
  for (const voice of VOICES) headings.push(...voice.families);
  return { headings, bodies: [...BODY_FAMILIES.sans, ...BODY_FAMILIES.serif] };
}

function oklchOf(hex: string | null, fallback: Oklch): Oklch {
  if (hex === null) return fallback;
  return hexToOklch(hex) ?? fallback;
}

function shiftedHex(color: Oklch, lightness: number): string {
  const moved = Math.min(1, Math.max(MIN_LIGHTNESS, color.lightness + lightness));
  return oklchToHex(moved, color.chroma, color.hue);
}

function nearMood(hex: string | null, isDark: boolean, fallback: string): string {
  if (hex === null || isDarkColor(hex) !== isDark) return fallback;
  return hex;
}

function darkSectionColors(wanted: Oklch, accent: Oklch): TokenValues {
  const ground = { ...wanted, lightness: Math.min(wanted.lightness, MAX_GROUND_LIGHTNESS) };
  const backgroundHex = oklchToHex(ground.lightness, ground.chroma, ground.hue);
  const surfaceHex = shiftedHex(ground, DARK_SURFACE_SHIFT);
  const grounds = [backgroundHex, surfaceHex];
  const accentHex = readableOn(accent, [backgroundHex]);
  return {
    '--theme-dark-background': backgroundHex,
    '--theme-dark-surface': surfaceHex,
    '--theme-dark-border': shiftedHex(ground, DARK_BORDER_SHIFT),
    '--theme-dark-text': readableOn({ ...DARK_TEXT, hue: ground.hue }, grounds),
    '--theme-dark-text-muted': readableOn({ ...DARK_MUTED, hue: ground.hue }, grounds),
    '--theme-dark-accent': accentHex,
    '--theme-dark-accent-contrast': contrastColorFor(accentHex, accent.hue, MIDPOINT),
  };
}

function briefColors(brief: DesignBrief, base: Record<string, Token>): TokenValues {
  const { colors } = brief;
  const backgroundHex = colors.background ?? base['--color-background'].value;
  const background = oklchOf(backgroundHex, { lightness: 1, chroma: 0, hue: 0 });
  const isDark = isDarkColor(backgroundHex);
  const away = isDark ? 1 : -1;
  const surfaceHex = nearMood(colors.surface, isDark, shiftedHex(background, away * SURFACE_SHIFT));
  const grounds = [backgroundHex, surfaceHex];
  const text = oklchOf(colors.text, {
    lightness: isDark ? DARK_TEXT.lightness : 0.22,
    chroma: 0.02,
    hue: background.hue,
  });
  const textHex = readableOn(text, grounds);
  const muted = oklchOf(colors.mutedText, {
    lightness: isDark ? DARK_MUTED.lightness : LIGHT_MUTED_LIGHTNESS,
    chroma: 0.02,
    hue: background.hue,
  });
  const primary = oklchOf(colors.primary, oklchOf(base['--color-primary'].value, text));
  const primaryHex = readableOn(primary, [backgroundHex]);
  const accent = oklchOf(colors.accent, { ...primary, lightness: ACCENT_LIGHTNESS });
  const textGround = oklchOf(textHex, text);
  const deeper: Oklch = { ...background, lightness: background.lightness - DEEPER_SHIFT };
  const fallbackGround = isDark ? deeper : textGround;
  const isGroundDark = colors.darkBackground !== null && isDarkColor(colors.darkBackground);
  const ground = isGroundDark ? oklchOf(colors.darkBackground, fallbackGround) : fallbackGround;
  const values: TokenValues = {
    '--color-background': backgroundHex,
    '--color-surface': surfaceHex,
    '--color-border': colors.border ?? shiftedHex(background, away * BORDER_SHIFT),
    '--color-text': textHex,
    '--color-text-muted': readableOn(muted, grounds),
    '--color-primary': primaryHex,
    '--color-primary-contrast': contrastColorFor(primaryHex, primary.hue, MIDPOINT),
    ...darkSectionColors(ground, accent),
  };
  for (const name of PRIMARY_THEME_TOKENS) {
    const standard = CLEAN_PRESET.designSystem.tokens[name];
    if (standard !== undefined) values[name] = standard.value;
  }
  return values;
}

function hasReadableBody(family: FontFamily): boolean {
  const hasBold = family.weights.includes(BOLD_WEIGHT) || family.weights.includes(SEMIBOLD_WEIGHT);
  return family.weights.includes(REGULAR_WEIGHT) && hasBold;
}

function nearestOf(wanted: number, allowed: readonly number[]): number {
  let nearest = allowed[0] ?? wanted;
  for (const value of allowed) {
    if (Math.abs(value - wanted) < Math.abs(nearest - wanted)) nearest = value;
  }
  return nearest;
}

type BriefType = {
  values: TokenValues;
  families: { heading: string; body: string } | null;
  typeBasePx: number;
  typeRatio: number;
};

function baseFamily(
  base: DesignSystem,
  role: FontRole,
  fontsByName: ReadonlyMap<string, FontFamily>,
): FontFamily | undefined {
  const selection = base.fonts.find((font) => font.role === role);
  return selection === undefined ? undefined : fontsByName.get(selection.family);
}

function briefType(
  brief: DesignBrief,
  base: DesignSystem,
  fontsByName: ReadonlyMap<string, FontFamily>,
): BriefType {
  const heading = fontsByName.get(brief.headingFont) ?? baseFamily(base, 'heading', fontsByName);
  const wantedBody = fontsByName.get(brief.bodyFont);
  const isBodyReadable = wantedBody !== undefined && hasReadableBody(wantedBody);
  const body = isBodyReadable ? wantedBody : baseFamily(base, 'body', fontsByName);
  const voice = VOICES.find(({ families }) => families.includes(brief.headingFont));
  const typeRatio = nearestOf(RATIOS[brief.typeScale], voice?.ratios ?? Object.values(RATIOS));
  const typeBasePx = nearestOf(brief.baseSizePx, voice?.basesPx ?? [brief.baseSizePx]);
  const values: TokenValues = {
    ...typeScaleTokens(typeBasePx, typeRatio),
    '--line-height-tight': voice?.lineHeights[0] ?? DEFAULT_TIGHT_LINE_HEIGHT,
    '--line-height-normal': NORMAL_LINE_HEIGHT,
  };
  if (heading === undefined || body === undefined) {
    return { values, families: null, typeBasePx, typeRatio };
  }
  const boldWeight = body.weights.includes(BOLD_WEIGHT) ? BOLD_WEIGHT : SEMIBOLD_WEIGHT;
  values['--font-heading'] = fontStack(heading.family, heading.category);
  values['--font-body'] = fontStack(body.family, body.category);
  values['--font-weight-heading'] = String(nearestWeight(brief.headingWeight, heading.weights));
  values['--font-weight-regular'] = String(REGULAR_WEIGHT);
  values['--font-weight-bold'] = String(boldWeight);
  return {
    values,
    families: { heading: heading.family, body: body.family },
    typeBasePx,
    typeRatio,
  };
}

function briefShape(corners: Corners): TokenValues {
  const shape = SHAPES[CORNERS.indexOf(corners)];
  return {
    '--radius-sm': shape.radii.small,
    '--radius-md': shape.radii.medium,
    '--radius-lg': shape.radii.large,
    '--border-width': shape.borderWidths[0],
    '--button-radius': shape.buttonRadii[shape.buttonRadii.length - 1],
    '--button-padding-y': BUTTON_PADDINGS_Y[0],
    '--button-padding-x': BUTTON_PADDINGS_X[1],
    '--card-radius': shape.cardRadius,
    '--card-shadow': 'var(--shadow-sm)',
  };
}

function briefShadows(shadows: Shadows, isDark: boolean): TokenValues {
  if (shadows === 'none') return NO_SHADOWS;
  if (isDark) return DARK_SHADOWS;
  return SHADOW_PRESETS.find(({ id }) => id === shadows)?.values ?? NO_SHADOWS;
}

function hasWeakContrast(tokens: Record<string, Token>): boolean {
  if (contrastWarnings(tokens).length > 0) return true;
  const ratio = contrastRatio(tokens['--color-primary'].value, tokens['--color-background'].value);
  return ratio === null || ratio < MIN_TEXT_CONTRAST;
}

function withSafeColors(
  designSystem: DesignSystem,
  base: DesignSystem,
  fontList: readonly FontFamily[],
): DesignSystem {
  if (!hasWeakContrast(designSystem.tokens)) return designSystem;
  const primary = designSystem.tokens['--color-primary'].value;
  const seed = Number.parseInt(primary.slice(1), HEX_RADIX) || 1;
  const safe = randomDesignSystem(base, fontList, seed);
  const tokens: Record<string, Token> = {};
  for (const [name, token] of Object.entries(designSystem.tokens)) {
    const replacement = COLOR_TOKEN.test(name) ? safe.tokens[name] : undefined;
    tokens[name] = replacement ?? token;
  }
  console.warn('The design brief could not be made readable, so its colors were replaced');
  return { ...designSystem, tokens };
}

export function designSystemFromBrief(
  base: DesignSystem,
  fontList: readonly FontFamily[],
  brief: DesignBrief,
): DesignSystem {
  const fontsByName = new Map<string, FontFamily>();
  for (const family of fontList) fontsByName.set(family.family, family);
  const colors = briefColors(brief, base.tokens);
  const type = briefType(brief, base, fontsByName);
  const spaceUnitPx = SPACE_UNITS_PX[brief.spacing];
  const isRoomy = brief.spacing === 'airy' || brief.typeScale === 'dramatic';
  const values: TokenValues = {
    ...colors,
    ...type.values,
    ...spacingTokens(spaceUnitPx, base.tokens),
    '--section-padding-y': isRoomy ? ROOMY_PADDING : COMPACT_PADDING,
    ...briefShape(brief.corners),
    ...briefShadows(brief.shadows, isDarkColor(colors['--color-background'])),
  };
  const tokens: Record<string, Token> = {};
  for (const [name, token] of Object.entries(base.tokens)) {
    tokens[name] = { ...token, value: values[name] ?? token.value };
  }
  const designSystem: DesignSystem = {
    tokens,
    fonts: type.families === null ? base.fonts : fontsFor(type.families, tokens),
    generators: { typeBasePx: type.typeBasePx, typeRatio: type.typeRatio, spaceUnitPx },
    iconSet: defaultIconSetIds().includes(brief.iconSet) ? brief.iconSet : base.iconSet,
  };
  return withSafeColors(designSystem, base, fontList);
}
