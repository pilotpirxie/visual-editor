import {
  FONT_CATEGORIES,
  type FontCategory,
  type FontFamily,
} from '../../../packages/font-data/src/convert';

export type { FontCategory, FontFamily };

type StoredFamily = { family: string; category: string; weights: number[] };

const DIACRITICS = /\p{Diacritic}/gu;

let loadingList: Promise<FontFamily[]> | null = null;

function isFontFamily(value: StoredFamily): value is FontFamily {
  return FONT_CATEGORIES.some((category) => category === value.category);
}

async function importFontList(): Promise<FontFamily[]> {
  const module = await import('./google-fonts.json');
  return module.default.filter(isFontFamily);
}

export async function loadFontList(): Promise<FontFamily[]> {
  loadingList ??= importFontList();
  try {
    return await loadingList;
  } catch (error) {
    loadingList = null;
    throw new Error('Could not load the Google Fonts list', { cause: error });
  }
}

function normalized(text: string): string {
  return text.normalize('NFKD').replace(DIACRITICS, '').trim().toLowerCase();
}

export function searchFonts(
  families: FontFamily[],
  query: string,
  category: FontCategory | null,
): FontFamily[] {
  const term = normalized(query);
  const matches: FontFamily[] = [];
  for (const family of families) {
    if (category !== null && family.category !== category) continue;
    if (term !== '' && !normalized(family.family).includes(term)) continue;
    matches.push(family);
  }
  return matches;
}
