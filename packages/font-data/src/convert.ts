export const FONT_CATEGORIES = [
  'sans-serif',
  'serif',
  'display',
  'handwriting',
  'monospace',
] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

export type FontFamily = { family: string; category: FontCategory; weights: number[] };

type RankedFamily = FontFamily & { popularity: number };

const XSSI_PREFIX = ")]}'";
const UPRIGHT_WEIGHT = /^\d+$/;

const CATEGORY_NAMES: Record<string, FontCategory> = {
  'Sans Serif': 'sans-serif',
  Serif: 'serif',
  Display: 'display',
  Handwriting: 'handwriting',
  Monospace: 'monospace',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMetadata(text: string): unknown {
  const json = text.startsWith(XSSI_PREFIX) ? text.slice(XSSI_PREFIX.length) : text;
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Google Fonts metadata is not valid JSON', { cause: error });
  }
}

function uprightWeights(fonts: Record<string, unknown>): number[] {
  const weights: number[] = [];
  for (const key of Object.keys(fonts)) {
    if (UPRIGHT_WEIGHT.test(key)) weights.push(Number(key));
  }
  weights.sort((left, right) => left - right);
  return weights;
}

function convertFamily(entry: unknown): RankedFamily | null {
  if (!isRecord(entry) || typeof entry.family !== 'string' || !isRecord(entry.fonts)) return null;
  const category = typeof entry.category === 'string' ? CATEGORY_NAMES[entry.category] : undefined;
  if (category === undefined) return null;
  const weights = uprightWeights(entry.fonts);
  if (weights.length === 0) return null;
  const popularity = typeof entry.popularity === 'number' ? entry.popularity : Infinity;
  return { family: entry.family, category, weights, popularity };
}

export function convertGoogleFontsMetadata(text: string): FontFamily[] {
  const metadata = parseMetadata(text);
  if (!isRecord(metadata) || !Array.isArray(metadata.familyMetadataList)) {
    throw new Error('Google Fonts metadata must have a "familyMetadataList" array');
  }
  const ranked: RankedFamily[] = [];
  for (const entry of metadata.familyMetadataList) {
    const family = convertFamily(entry);
    if (family !== null) ranked.push(family);
  }
  ranked.sort((left, right) => left.popularity - right.popularity);
  const families: FontFamily[] = [];
  for (const { family, category, weights } of ranked) families.push({ family, category, weights });
  return families;
}
