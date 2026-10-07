import { describe, expect, it } from 'vitest';
import { textDirection } from './direction';

describe('textDirection', () => {
  it.each([
    ['ar', 'rtl'],
    ['he', 'rtl'],
    ['fa-IR', 'rtl'],
    ['ur_PK', 'rtl'],
    [' AR ', 'rtl'],
    ['en', 'ltr'],
    ['pl', 'ltr'],
    ['zh-Hant', 'ltr'],
    ['', 'ltr'],
  ])('returns %s → %s', (language, direction) => {
    expect(textDirection(language)).toBe(direction);
  });
});
