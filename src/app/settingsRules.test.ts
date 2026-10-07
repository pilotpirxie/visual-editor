import { describe, expect, it } from 'vitest';
import { FAVICON_TYPES, settingError, SOCIAL_IMAGE_TYPES } from './settingsRules';

describe('settingError for the title', () => {
  it('accepts a title with text', () => {
    expect(settingError('title', 'Fieldnote')).toBeNull();
  });

  it('rejects an empty title', () => {
    expect(settingError('title', '')).toBe('Enter a site title');
  });

  it('rejects a title made only of spaces', () => {
    expect(settingError('title', '   ')).toBe('Enter a site title');
  });
});

describe('settingError for the language', () => {
  it('accepts two and three letter language codes', () => {
    expect(settingError('language', 'en')).toBeNull();
    expect(settingError('language', 'fil')).toBeNull();
  });

  it('accepts codes with a region or script part', () => {
    expect(settingError('language', 'en-GB')).toBeNull();
    expect(settingError('language', 'zh-Hant-TW')).toBeNull();
  });

  it('accepts a code surrounded by spaces', () => {
    expect(settingError('language', '  de  ')).toBeNull();
  });

  it('rejects an empty language', () => {
    expect(settingError('language', '')).toBe('Pick a language');
  });

  it('rejects codes that are too short, too long or upper case', () => {
    expect(settingError('language', 'e')).toBe('Pick a language');
    expect(settingError('language', 'engl')).toBe('Pick a language');
    expect(settingError('language', 'EN')).toBe('Pick a language');
  });

  it('rejects codes with an empty or too long region part', () => {
    expect(settingError('language', 'en-')).toBe('Pick a language');
    expect(settingError('language', 'en-G')).toBe('Pick a language');
    expect(settingError('language', 'en-abcdefghi')).toBe('Pick a language');
  });

  it('rejects codes with underscores or markup', () => {
    expect(settingError('language', 'en_GB')).toBe('Pick a language');
    expect(settingError('language', 'en"><script>')).toBe('Pick a language');
  });
});

describe('settingError for the base URL', () => {
  const baseUrlError = 'Enter a full address that starts with https://';

  it('accepts an empty base URL because it is optional', () => {
    expect(settingError('baseUrl', '')).toBeNull();
    expect(settingError('baseUrl', '   ')).toBeNull();
  });

  it('accepts http and https addresses', () => {
    expect(settingError('baseUrl', 'https://fieldnote.example')).toBeNull();
    expect(settingError('baseUrl', 'http://localhost:8080/site/')).toBeNull();
    expect(settingError('baseUrl', 'HTTPS://FIELDNOTE.EXAMPLE')).toBeNull();
  });

  it('accepts an address surrounded by spaces', () => {
    expect(settingError('baseUrl', '  https://fieldnote.example  ')).toBeNull();
  });

  it('rejects addresses without a scheme', () => {
    expect(settingError('baseUrl', 'fieldnote.example')).toBe(baseUrlError);
    expect(settingError('baseUrl', '//fieldnote.example')).toBe(baseUrlError);
  });

  it('rejects other schemes', () => {
    expect(settingError('baseUrl', 'javascript:alert(1)')).toBe(baseUrlError);
    expect(settingError('baseUrl', 'ftp://fieldnote.example')).toBe(baseUrlError);
    expect(settingError('baseUrl', 'mailto:hello@fieldnote.example')).toBe(baseUrlError);
  });

  it('rejects a scheme with no host and an address with spaces inside', () => {
    expect(settingError('baseUrl', 'https://')).toBe(baseUrlError);
    expect(settingError('baseUrl', 'https:///path')).toBe(baseUrlError);
    expect(settingError('baseUrl', 'https://field note.example')).toBe(baseUrlError);
  });
});

describe('settingError for free text settings', () => {
  it('accepts any description, including an empty one', () => {
    expect(settingError('description', '')).toBeNull();
    expect(settingError('description', 'Customer research for product teams.')).toBeNull();
  });

  it('accepts any title template, including an empty one', () => {
    expect(settingError('titleTemplate', '')).toBeNull();
    expect(settingError('titleTemplate', '{{page.title}} | {{site.title}}')).toBeNull();
  });
});

describe('allowed image types', () => {
  it('allows only raster image types for social images', () => {
    expect(SOCIAL_IMAGE_TYPES).toEqual(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
  });

  it('allows PNG, SVG and ICO favicons', () => {
    expect(FAVICON_TYPES).toEqual(['image/png', 'image/svg+xml', 'image/x-icon']);
  });
});
