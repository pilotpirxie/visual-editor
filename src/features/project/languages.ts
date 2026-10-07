import type { FieldOption } from '../../components/types';

const LANGUAGE_CODES = [
  'ar',
  'bg',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en-GB',
  'es',
  'et',
  'fa',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'lv',
  'ms',
  'nb',
  'nl',
  'pl',
  'pt',
  'pt-BR',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'th',
  'tr',
  'uk',
  'vi',
  'zh-CN',
  'zh-TW',
];

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

function languageLabel(code: string): string {
  try {
    return `${languageNames.of(code) ?? code} (${code})`;
  } catch (error) {
    console.warn(`Unknown language code "${code}"`, error);
    return code;
  }
}

export function languageOptions(currentCode: string): FieldOption[] {
  const codes = LANGUAGE_CODES.includes(currentCode)
    ? LANGUAGE_CODES
    : [currentCode, ...LANGUAGE_CODES];
  const options: FieldOption[] = [];
  for (const code of codes) options.push({ value: code, label: languageLabel(code) });
  options.sort((left, right) => left.label.localeCompare(right.label));
  return options;
}
