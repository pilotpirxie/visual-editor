export type TextDirection = 'ltr' | 'rtl';

const RIGHT_TO_LEFT_LANGUAGES = new Set([
  'ar',
  'ckb',
  'dv',
  'fa',
  'he',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

export function textDirection(language: string): TextDirection {
  const baseLanguage = language.trim().toLowerCase().split(/[-_]/)[0] ?? '';
  return RIGHT_TO_LEFT_LANGUAGES.has(baseLanguage) ? 'rtl' : 'ltr';
}
