import { describe, expect, it } from 'vitest';
import { loadFontList, searchFonts, type FontFamily } from './fontList';

const FAMILIES: FontFamily[] = [
  { family: 'Inter', category: 'sans-serif', weights: [400, 700] },
  { family: 'Lora', category: 'serif', weights: [400, 700] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 900] },
  { family: 'Encode Sans Expanded', category: 'sans-serif', weights: [400] },
];

function names(families: FontFamily[]): string[] {
  return families.map(({ family }) => family);
}

describe('loadFontList', () => {
  it('loads the bundled Google Fonts list, most popular first', async () => {
    const families = await loadFontList();
    expect(families.length).toBeGreaterThan(1000);
    expect(names(families)).toContain('Inter');
    expect(families[0].weights.length).toBeGreaterThan(0);
  });
});

describe('searchFonts', () => {
  it('keeps the order of the list and matches any part of the name, ignoring case', () => {
    expect(names(searchFonts(FAMILIES, 'DISPLAY', null))).toEqual(['Playfair Display']);
    expect(names(searchFonts(FAMILIES, 'r', null))).toEqual(['Inter', 'Lora', 'Playfair Display']);
  });

  it('filters by category', () => {
    expect(names(searchFonts(FAMILIES, '', 'serif'))).toEqual(['Lora', 'Playfair Display']);
  });

  it('returns everything for an empty query and no category', () => {
    expect(searchFonts(FAMILIES, '  ', null)).toHaveLength(4);
  });
});
