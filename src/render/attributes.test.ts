import { describe, expect, it } from 'vitest';
import { escapeHtml, isValidAnchor, isValidClassName, parseClassNames } from './attributes';

describe('isValidAnchor', () => {
  it.each([
    ['pricing', true],
    ['faq-2', true],
    ['Pricing', false],
    ['2-pricing', false],
    ['with space', false],
    ['', false],
    ['ve-page', false],
  ])('%s is %s', (anchor, expected) => {
    expect(isValidAnchor(anchor)).toBe(expected);
  });
});

describe('isValidClassName', () => {
  it.each([
    ['hero-dark', true],
    ['_private', true],
    ['-negative', true],
    ['MyClass', true],
    ['2col', false],
    ['bad"quote', false],
    ['a b', false],
    ['', false],
  ])('%s is %s', (name, expected) => {
    expect(isValidClassName(name)).toBe(expected);
  });
});

describe('parseClassNames', () => {
  it('splits on any whitespace and drops empty and repeated names', () => {
    expect(parseClassNames('  one\ttwo  one\nthree ')).toEqual(['one', 'two', 'three']);
  });

  it('returns no names for blank text', () => {
    expect(parseClassNames('   ')).toEqual([]);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that end text or a quoted attribute', () => {
    expect(escapeHtml('<a href="x">Tom & Jerry</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });

  it('keeps URLs readable', () => {
    expect(escapeHtml('https://example.com/?a=1&b=2')).toBe('https://example.com/?a=1&amp;b=2');
  });
});
