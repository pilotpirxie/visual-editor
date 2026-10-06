import { describe, expect, it } from 'vitest';
import { fontStack, googleFontsHref, previewFontHref } from './fonts';

describe('fontStack', () => {
  it('quotes the family and adds the fallback for its category', () => {
    expect(fontStack('Inter', 'sans-serif')).toBe('"Inter", system-ui, sans-serif');
    expect(fontStack('Lora', 'serif')).toBe('"Lora", ui-serif, Georgia, serif');
    expect(fontStack('Caveat', 'handwriting')).toBe('"Caveat", cursive');
  });

  it('drops characters that could break out of the font declaration', () => {
    expect(fontStack('Bad"; } body {', 'serif')).toBe('"Bad  body ", ui-serif, Georgia, serif');
  });
});

describe('googleFontsHref', () => {
  it('builds one stylesheet link for every family with its weights', () => {
    expect(
      googleFontsHref([
        { role: 'heading', family: 'Space Grotesk', weights: [700, 400] },
        { role: 'body', family: 'Inter', weights: [400] },
      ]),
    ).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Space+Grotesk:wght@400;700&display=swap',
    );
  });

  it('merges the weights of a family used for several roles', () => {
    expect(
      googleFontsHref([
        { role: 'heading', family: 'Inter', weights: [700] },
        { role: 'body', family: 'Inter', weights: [400, 700] },
      ]),
    ).toBe('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
  });

  it('returns null when only system fonts are used', () => {
    expect(googleFontsHref([])).toBeNull();
  });
});

describe('previewFontHref', () => {
  it('loads one weight with only the letters of the family name', () => {
    expect(previewFontHref('DM Sans', 400)).toBe(
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400&text=DM%20Sans&display=swap',
    );
  });
});
