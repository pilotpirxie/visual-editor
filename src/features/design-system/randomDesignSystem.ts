import type { DesignSystem, FontSelection, Token } from '../../app/types';
import { derivedFontWeights, nearestWeight } from '../../app/typography';
import { ICON_SET_INFO } from '../../../packages/icon-data/src/sets';
import { CLEAN_PRESET } from '../../presets/presets';
import { fontStack } from '../../render/fonts';
import { contrastRatio, oklchToHex } from './colors';
import type { FontFamily } from './fontList';
import { SHADOW_PRESETS, spacingTokens, typeScaleTokens } from './generators';

export type Random = {
  between(min: number, max: number): number;
  pick<Item>(items: readonly Item[]): Item;
  isChance(probability: number): boolean;
};

type Oklch = { lightness: number; chroma: number; hue: number };

type Hues = { primary: number; neutral: number; accent: number };

type Mood = { isDark: boolean; isTinted: boolean };

type ChromaBand = { min: number; max: number; isMono: boolean };

type BodyKind = 'sans' | 'serif';

type Voice = {
  families: readonly string[];
  weights: readonly number[];
  lineHeights: readonly string[];
  ratios: readonly number[];
  basesPx: readonly number[];
  bodies: readonly BodyKind[];
};

type Shape = {
  radii: { small: string; medium: string; large: string };
  borderWidths: readonly string[];
  buttonRadii: readonly string[];
  cardRadius: string;
};

type TokenValues = Record<string, string>;

export type TypeChoice = {
  values: TokenValues;
  families: { heading: string; body: string } | null;
  typeBasePx: number;
  typeRatio: number;
};

const TARGET_CONTRAST = 4.6;
const LIGHTNESS_STEP = 0.02;
const WHITE = '#ffffff';
const BLACK = '#000000';
const FULL_TURN = 360;
const KHAKI_HUES = { from: 70, to: 115 };
const SAME_FAMILY_CHANCE = 0.25;
const DARK_PRIMARY_CHROMA = 0.8;
const ACCENT_CHROMA = 0.75;
const REGULAR_WEIGHT = 400;
const BOLD_WEIGHT = 700;
const SEMIBOLD_WEIGHT = 600;
export const COMPACT_PADDING = 'clamp(3rem, 2rem + 4vw, 6rem)';
export const ROOMY_PADDING = 'clamp(4rem, 3rem + 5vw, 8rem)';
const ROOMY_UNIT_PX = 5;
const ROOMY_RATIO = 1.333;

const PLAIN_LIGHT_SHARE = 0.45;
const TINTED_LIGHT_SHARE = 0.2;
const PLAIN_DARK_SHARE = 0.2;

const VIVID: ChromaBand = { min: 0.17, max: 0.24, isMono: false };
const BALANCED: ChromaBand = { min: 0.11, max: 0.16, isMono: false };
const MUTED: ChromaBand = { min: 0.05, max: 0.09, isMono: false };
const MONO: ChromaBand = { min: 0, max: 0.015, isMono: true };
const CHROMA_BANDS = [VIVID, VIVID, BALANCED, BALANCED, MUTED, MONO];

const NEUTRAL_SHIFTS = [0, 30, -30];
const ACCENT_SHIFTS = [0, 30, -30, 180, 120, -120];

const ALL_RATIOS = [1.2, 1.25, 1.333];
const TIGHT_RATIOS = [1.2, 1.25];
const ALL_BASES = [15, 16, 17, 18];
const SMALL_BASES = [15, 16];

export const VOICES: readonly Voice[] = [
  {
    families: [
      'Poppins',
      'Outfit',
      'Sora',
      'Manrope',
      'Plus Jakarta Sans',
      'Montserrat',
      'Urbanist',
      'Lexend',
      'Raleway',
      'Jost',
    ],
    weights: [600, 700, 800],
    lineHeights: ['1.1', '1.15'],
    ratios: ALL_RATIOS,
    basesPx: ALL_BASES,
    bodies: ['sans'],
  },
  {
    families: [
      'Space Grotesk',
      'Bricolage Grotesque',
      'Archivo',
      'Inter Tight',
      'Figtree',
      'DM Sans',
      'Work Sans',
      'Schibsted Grotesk',
      'Inter',
      'IBM Plex Sans',
      'Public Sans',
      'Hanken Grotesk',
      'Onest',
      'Geist',
      'Instrument Sans',
      'Albert Sans',
    ],
    weights: [600, 700, 800],
    lineHeights: ['1.1', '1.15', '1.2'],
    ratios: ALL_RATIOS,
    basesPx: ALL_BASES,
    bodies: ['sans', 'serif'],
  },
  {
    families: [
      'Archivo Black',
      'Anton',
      'Bebas Neue',
      'Fjalla One',
      'Oswald',
      'Barlow Condensed',
      'League Spartan',
    ],
    weights: [700, 800],
    lineHeights: ['1.05', '1.1'],
    ratios: [1.25, 1.333],
    basesPx: ALL_BASES,
    bodies: ['sans'],
  },
  {
    families: ['Unbounded', 'Syne'],
    weights: [600, 700],
    lineHeights: ['1.1', '1.15'],
    ratios: TIGHT_RATIOS,
    basesPx: SMALL_BASES,
    bodies: ['sans'],
  },
  {
    families: [
      'Playfair Display',
      'Fraunces',
      'Cormorant Garamond',
      'DM Serif Display',
      'Instrument Serif',
      'Bodoni Moda',
      'Libre Baskerville',
      'Lora',
      'Newsreader',
      'Source Serif 4',
      'Marcellus',
      'Prata',
      'Young Serif',
      'Gloock',
      'EB Garamond',
      'Spectral',
    ],
    weights: [500, 600, 700],
    lineHeights: ['1.1', '1.15', '1.2'],
    ratios: [1.25, 1.333],
    basesPx: ALL_BASES,
    bodies: ['sans', 'serif'],
  },
  {
    families: ['Roboto Slab', 'Bitter', 'Zilla Slab', 'Arvo', 'Aleo'],
    weights: [600, 700],
    lineHeights: ['1.15', '1.2'],
    ratios: ALL_RATIOS,
    basesPx: ALL_BASES,
    bodies: ['sans', 'serif'],
  },
  {
    families: [
      'JetBrains Mono',
      'Space Mono',
      'IBM Plex Mono',
      'Geist Mono',
      'Fira Code',
      'Roboto Mono',
    ],
    weights: [500, 700],
    lineHeights: ['1.15', '1.2'],
    ratios: TIGHT_RATIOS,
    basesPx: SMALL_BASES,
    bodies: ['sans'],
  },
  {
    families: ['Nunito', 'Quicksand', 'Rubik', 'Baloo 2', 'Fredoka', 'Comfortaa'],
    weights: [600, 700, 800],
    lineHeights: ['1.15', '1.2'],
    ratios: ALL_RATIOS,
    basesPx: ALL_BASES,
    bodies: ['sans'],
  },
];

export const BODY_FAMILIES: Record<BodyKind, readonly string[]> = {
  sans: [
    'Inter',
    'DM Sans',
    'Work Sans',
    'Source Sans 3',
    'IBM Plex Sans',
    'Manrope',
    'Nunito Sans',
    'Open Sans',
    'Figtree',
    'Public Sans',
    'Karla',
    'Mulish',
    'Rubik',
    'Lato',
    'Libre Franklin',
    'Plus Jakarta Sans',
    'Outfit',
    'Nunito',
    'Poppins',
    'Archivo',
  ],
  serif: [
    'Source Serif 4',
    'Lora',
    'Merriweather',
    'Newsreader',
    'Literata',
    'Crimson Pro',
    'PT Serif',
    'IBM Plex Serif',
  ],
};

const BODY_LINE_HEIGHTS = ['1.6', '1.65', '1.7'];
const SPACE_UNITS_PX = [4, 4.5, 5];

export const SHAPES: readonly Shape[] = [
  {
    radii: { small: '0rem', medium: '0rem', large: '0rem' },
    borderWidths: ['1px', '2px'],
    buttonRadii: ['var(--radius-md)'],
    cardRadius: 'var(--radius-lg)',
  },
  {
    radii: { small: '0.125rem', medium: '0.25rem', large: '0.5rem' },
    borderWidths: ['1px'],
    buttonRadii: ['var(--radius-sm)', 'var(--radius-md)'],
    cardRadius: 'var(--radius-md)',
  },
  {
    radii: { small: '0.25rem', medium: '0.5rem', large: '1rem' },
    borderWidths: ['1px'],
    buttonRadii: ['var(--radius-md)'],
    cardRadius: 'var(--radius-lg)',
  },
  {
    radii: { small: '0.5rem', medium: '1rem', large: '1.5rem' },
    borderWidths: ['1px'],
    buttonRadii: ['var(--radius-md)', 'var(--radius-full)'],
    cardRadius: 'var(--radius-lg)',
  },
  {
    radii: { small: '0.75rem', medium: '1.25rem', large: '2rem' },
    borderWidths: ['1px'],
    buttonRadii: ['var(--radius-full)'],
    cardRadius: 'var(--radius-lg)',
  },
];

export const BUTTON_PADDINGS_Y = ['0.75rem', '0.875rem'];
export const BUTTON_PADDINGS_X = ['1.25rem', '1.375rem', '1.5rem'];

export const NO_SHADOWS: TokenValues = {
  '--shadow-sm': 'none',
  '--shadow-md': 'none',
  '--shadow-lg': 'none',
};

export const DARK_SHADOWS: TokenValues = {
  '--shadow-sm': '0 1px 2px rgb(0 0 0 / 0.35)',
  '--shadow-md': '0 6px 16px rgb(0 0 0 / 0.4)',
  '--shadow-lg': '0 16px 40px rgb(0 0 0 / 0.5)',
};

const PRIMARY_THEME_TOKENS = [
  '--theme-primary-background',
  '--theme-primary-surface',
  '--theme-primary-text',
  '--theme-primary-text-muted',
  '--theme-primary-border',
  '--theme-primary-accent',
  '--theme-primary-accent-contrast',
];

function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }
  return {
    between: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    isChance: (probability) => next() < probability,
  };
}

function hexOf({ lightness, chroma, hue }: Oklch): string {
  return oklchToHex(lightness, chroma, hue);
}

function contrastOf(foreground: string, background: string): number {
  return contrastRatio(foreground, background) ?? 1;
}

export function withStandardPrimaryTheme(values: TokenValues): TokenValues {
  const themed: TokenValues = { ...values };
  for (const name of PRIMARY_THEME_TOKENS) {
    const standard = CLEAN_PRESET.designSystem.tokens[name];
    if (standard !== undefined) themed[name] = standard.value;
  }
  return themed;
}

export function isDarkColor(hex: string): boolean {
  return contrastOf(WHITE, hex) > contrastOf(BLACK, hex);
}

function isReadableOn(hex: string, backgrounds: readonly string[]): boolean {
  for (const background of backgrounds) {
    if (contrastOf(hex, background) < TARGET_CONTRAST) return false;
  }
  return true;
}

export function readableOn(color: Oklch, backgrounds: readonly string[]): string {
  const isOnDark = isDarkColor(backgrounds[0]);
  const step = isOnDark ? LIGHTNESS_STEP : -LIGHTNESS_STEP;
  let lightness = color.lightness;
  while (lightness > 0 && lightness < 1) {
    const hex = oklchToHex(lightness, color.chroma, color.hue);
    if (isReadableOn(hex, backgrounds)) return hex;
    lightness += step;
  }
  return isOnDark ? WHITE : BLACK;
}

export function contrastColorFor(fill: string, hue: number, random: Random): string {
  const light: Oklch = {
    lightness: random.between(0.97, 1),
    chroma: random.between(0, 0.01),
    hue,
  };
  const dark: Oklch = {
    lightness: random.between(0.16, 0.24),
    chroma: random.between(0.01, 0.03),
    hue,
  };
  const isLightBetter = contrastOf(hexOf(light), fill) >= contrastOf(hexOf(dark), fill);
  return readableOn(isLightBetter ? light : dark, [fill]);
}

function shifted(color: Oklch, lightness: number, chroma: number): Oklch {
  return { lightness: color.lightness + lightness, chroma: color.chroma + chroma, hue: color.hue };
}

function randomMood(random: Random): Mood {
  const roll = random.between(0, 1);
  if (roll < PLAIN_LIGHT_SHARE) return { isDark: false, isTinted: false };
  if (roll < PLAIN_LIGHT_SHARE + TINTED_LIGHT_SHARE) return { isDark: false, isTinted: true };
  if (roll < PLAIN_LIGHT_SHARE + TINTED_LIGHT_SHARE + PLAIN_DARK_SHARE) {
    return { isDark: true, isTinted: false };
  }
  return { isDark: true, isTinted: true };
}

function primaryHue(mood: Mood, random: Random): number {
  if (mood.isDark) return random.between(0, FULL_TURN);
  const span = FULL_TURN - (KHAKI_HUES.to - KHAKI_HUES.from);
  return (KHAKI_HUES.to + random.between(0, span)) % FULL_TURN;
}

function lightColors(mood: Mood, band: ChromaBand, hues: Hues, random: Random): TokenValues {
  const neutralHue = hues.neutral;
  const background: Oklch = mood.isTinted
    ? {
        lightness: random.between(0.962, 0.98),
        chroma: random.between(0.012, 0.028),
        hue: neutralHue,
      }
    : { lightness: random.between(0.985, 1), chroma: random.between(0, 0.006), hue: neutralHue };
  const backgroundHex = hexOf(background);
  const surfaceHex = hexOf(
    shifted(background, -random.between(0.025, 0.04), random.between(0.004, 0.014)),
  );
  const text: Oklch = {
    lightness: random.between(0.18, 0.27),
    chroma: random.between(0.01, 0.04),
    hue: neutralHue,
  };
  const textHex = readableOn(text, [backgroundHex, surfaceHex]);
  const muted: Oklch = {
    lightness: random.between(0.46, 0.52),
    chroma: random.between(0.01, 0.035),
    hue: neutralHue,
  };
  const primary: Oklch = {
    lightness: band.isMono ? random.between(0.15, 0.25) : random.between(0.42, 0.56),
    chroma: random.between(band.min, band.max),
    hue: hues.primary,
  };
  const primaryHex = readableOn(primary, [backgroundHex]);
  const darkSurfaceHex = hexOf(shifted(text, random.between(0.05, 0.07), 0));
  const darkText: Oklch = {
    lightness: random.between(0.96, 0.99),
    chroma: random.between(0, 0.012),
    hue: neutralHue,
  };
  const darkMuted: Oklch = {
    lightness: random.between(0.74, 0.82),
    chroma: random.between(0.005, 0.02),
    hue: neutralHue,
  };
  const accent: Oklch = {
    lightness: random.between(0.78, 0.86),
    chroma: random.between(band.min, band.max) * ACCENT_CHROMA,
    hue: hues.accent,
  };
  const accentHex = readableOn(accent, [textHex]);
  return {
    '--color-background': backgroundHex,
    '--color-surface': surfaceHex,
    '--color-border': hexOf(
      shifted(background, -random.between(0.08, 0.11), random.between(0.006, 0.016)),
    ),
    '--color-text': textHex,
    '--color-text-muted': readableOn(muted, [backgroundHex, surfaceHex]),
    '--color-primary': primaryHex,
    '--color-primary-contrast': contrastColorFor(primaryHex, primary.hue, random),
    '--theme-dark-background': textHex,
    '--theme-dark-surface': darkSurfaceHex,
    '--theme-dark-border': hexOf(shifted(text, random.between(0.12, 0.16), 0)),
    '--theme-dark-text': readableOn(darkText, [textHex, darkSurfaceHex]),
    '--theme-dark-text-muted': readableOn(darkMuted, [textHex, darkSurfaceHex]),
    '--theme-dark-accent': accentHex,
    '--theme-dark-accent-contrast': contrastColorFor(accentHex, accent.hue, random),
  };
}

function darkColors(mood: Mood, band: ChromaBand, hues: Hues, random: Random): TokenValues {
  const neutralHue = hues.neutral;
  const background: Oklch = mood.isTinted
    ? {
        lightness: random.between(0.17, 0.24),
        chroma: random.between(0.025, 0.05),
        hue: neutralHue,
      }
    : {
        lightness: random.between(0.14, 0.2),
        chroma: random.between(0.004, 0.018),
        hue: neutralHue,
      };
  const backgroundHex = hexOf(background);
  const surfaceHex = hexOf(shifted(background, random.between(0.035, 0.055), 0));
  const text: Oklch = {
    lightness: random.between(0.93, 0.97),
    chroma: random.between(0.004, 0.02),
    hue: neutralHue,
  };
  const muted: Oklch = {
    lightness: random.between(0.74, 0.8),
    chroma: random.between(0.005, 0.02),
    hue: neutralHue,
  };
  const primary: Oklch = {
    lightness: band.isMono ? random.between(0.93, 0.98) : random.between(0.74, 0.86),
    chroma: random.between(band.min, band.max) * DARK_PRIMARY_CHROMA,
    hue: hues.primary,
  };
  const primaryHex = readableOn(primary, [backgroundHex]);
  const deeper: Oklch = {
    lightness: Math.max(0.08, background.lightness - random.between(0.04, 0.06)),
    chroma: background.chroma,
    hue: neutralHue,
  };
  const deeperHex = hexOf(deeper);
  const deeperSurfaceHex = hexOf(shifted(deeper, random.between(0.03, 0.05), 0));
  const accent: Oklch = {
    lightness: Math.min(0.95, primary.lightness + random.between(0, 0.05)),
    chroma: random.between(band.min, band.max) * ACCENT_CHROMA,
    hue: hues.accent,
  };
  const accentHex = readableOn(accent, [deeperHex]);
  return {
    '--color-background': backgroundHex,
    '--color-surface': surfaceHex,
    '--color-border': hexOf(shifted(background, random.between(0.1, 0.14), 0)),
    '--color-text': readableOn(text, [backgroundHex, surfaceHex]),
    '--color-text-muted': readableOn(muted, [backgroundHex, surfaceHex]),
    '--color-primary': primaryHex,
    '--color-primary-contrast': contrastColorFor(primaryHex, primary.hue, random),
    '--theme-dark-background': deeperHex,
    '--theme-dark-surface': deeperSurfaceHex,
    '--theme-dark-border': hexOf(shifted(deeper, random.between(0.09, 0.12), 0)),
    '--theme-dark-text': readableOn(text, [deeperHex, deeperSurfaceHex]),
    '--theme-dark-text-muted': readableOn(muted, [deeperHex, deeperSurfaceHex]),
    '--theme-dark-accent': accentHex,
    '--theme-dark-accent-contrast': contrastColorFor(accentHex, accent.hue, random),
  };
}

function randomColors(mood: Mood, random: Random): TokenValues {
  const band = random.pick(CHROMA_BANDS);
  const primary = primaryHue(mood, random);
  const hues: Hues = {
    primary,
    neutral: (primary + random.pick(NEUTRAL_SHIFTS) + FULL_TURN) % FULL_TURN,
    accent: (primary + random.pick(ACCENT_SHIFTS) + FULL_TURN) % FULL_TURN,
  };
  const values = mood.isDark
    ? darkColors(mood, band, hues, random)
    : lightColors(mood, band, hues, random);
  return withStandardPrimaryTheme(values);
}

export function hasReadableBody(family: FontFamily): boolean {
  const hasBold = family.weights.includes(BOLD_WEIGHT) || family.weights.includes(SEMIBOLD_WEIGHT);
  return family.weights.includes(REGULAR_WEIGHT) && hasBold;
}

function availableFamilies(
  names: readonly string[],
  fontList: ReadonlyMap<string, FontFamily>,
  isBody: boolean,
): FontFamily[] {
  const families: FontFamily[] = [];
  for (const name of names) {
    const family = fontList.get(name);
    if (family === undefined) continue;
    if (isBody && !hasReadableBody(family)) continue;
    families.push(family);
  }
  return families;
}

function bodyFamily(
  heading: FontFamily,
  voice: Voice,
  fontList: ReadonlyMap<string, FontFamily>,
  random: Random,
): FontFamily | null {
  const kind = random.pick(voice.bodies);
  const candidates = availableFamilies(BODY_FAMILIES[kind], fontList, true);
  const isHeadingReadable = candidates.some(({ family }) => family === heading.family);
  if (isHeadingReadable && random.isChance(SAME_FAMILY_CHANCE)) return heading;
  if (candidates.length === 0) return null;
  return random.pick(candidates);
}

export function withFonts(
  plain: TypeChoice,
  heading: FontFamily,
  body: FontFamily,
  wantedHeadingWeight: number,
): TypeChoice {
  const boldWeight = body.weights.includes(BOLD_WEIGHT) ? BOLD_WEIGHT : SEMIBOLD_WEIGHT;
  const values: TokenValues = {
    ...plain.values,
    '--font-heading': fontStack(heading.family, heading.category),
    '--font-body': fontStack(body.family, body.category),
    '--font-weight-heading': String(nearestWeight(wantedHeadingWeight, heading.weights)),
    '--font-weight-regular': String(REGULAR_WEIGHT),
    '--font-weight-bold': String(boldWeight),
  };
  return { ...plain, values, families: { heading: heading.family, body: body.family } };
}

function randomType(fontList: ReadonlyMap<string, FontFamily>, random: Random): TypeChoice {
  const voice = random.pick(VOICES);
  const typeBasePx = random.pick(voice.basesPx);
  const typeRatio = random.pick(voice.ratios);
  const values: TokenValues = {
    ...typeScaleTokens(typeBasePx, typeRatio),
    '--line-height-tight': random.pick(voice.lineHeights),
    '--line-height-normal': random.pick(BODY_LINE_HEIGHTS),
  };
  const plain: TypeChoice = { values, families: null, typeBasePx, typeRatio };
  const headings = availableFamilies(voice.families, fontList, false);
  if (headings.length === 0) return plain;
  const heading = random.pick(headings);
  const body = bodyFamily(heading, voice, fontList, random);
  if (body === null) return plain;
  return withFonts(plain, heading, body, random.pick(voice.weights));
}

function randomShape(random: Random): TokenValues {
  const shape = random.pick(SHAPES);
  return {
    '--radius-sm': shape.radii.small,
    '--radius-md': shape.radii.medium,
    '--radius-lg': shape.radii.large,
    '--border-width': random.pick(shape.borderWidths),
    '--button-radius': random.pick(shape.buttonRadii),
    '--button-padding-y': random.pick(BUTTON_PADDINGS_Y),
    '--button-padding-x': random.pick(BUTTON_PADDINGS_X),
    '--card-radius': shape.cardRadius,
    '--card-shadow': 'var(--shadow-sm)',
  };
}

function randomShadows(mood: Mood, random: Random): TokenValues {
  if (mood.isDark) return random.pick([NO_SHADOWS, DARK_SHADOWS]);
  return random.pick(SHADOW_PRESETS).values;
}

export function defaultIconSetIds(): string[] {
  const ids: string[] = [];
  for (const set of ICON_SET_INFO) {
    if (!set.isBrandOnly) ids.push(set.id);
  }
  return ids;
}

export function fontsFor(
  families: { heading: string; body: string },
  tokens: Record<string, Token>,
): FontSelection[] {
  return [
    { role: 'heading', family: families.heading, weights: derivedFontWeights('heading', tokens) },
    { role: 'body', family: families.body, weights: derivedFontWeights('body', tokens) },
  ];
}

export function tokensWithValues(
  baseTokens: Record<string, Token>,
  values: TokenValues,
): Record<string, Token> {
  const tokens: Record<string, Token> = {};
  for (const [name, token] of Object.entries(baseTokens)) {
    tokens[name] = { ...token, value: values[name] ?? token.value };
  }
  return tokens;
}

export function randomDesignSystem(
  base: DesignSystem,
  fontList: readonly FontFamily[],
  seed: number,
): DesignSystem {
  const random = seededRandom(seed);
  const fontsByName = new Map<string, FontFamily>();
  for (const family of fontList) fontsByName.set(family.family, family);
  const mood = randomMood(random);
  const type = randomType(fontsByName, random);
  const spaceUnitPx = random.pick(SPACE_UNITS_PX);
  const isRoomy = spaceUnitPx === ROOMY_UNIT_PX || type.typeRatio === ROOMY_RATIO;
  const values: TokenValues = {
    ...randomColors(mood, random),
    ...type.values,
    ...spacingTokens(spaceUnitPx, base.tokens),
    '--section-padding-y': isRoomy ? ROOMY_PADDING : COMPACT_PADDING,
    ...randomShape(random),
    ...randomShadows(mood, random),
  };
  const tokens = tokensWithValues(base.tokens, values);
  return {
    tokens,
    fonts: type.families === null ? base.fonts : fontsFor(type.families, tokens),
    generators: { typeBasePx: type.typeBasePx, typeRatio: type.typeRatio, spaceUnitPx },
    iconSet: random.pick(defaultIconSetIds()),
  };
}
