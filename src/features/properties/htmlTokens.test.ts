import { describe, expect, it } from 'vitest';
import { findUnclosedTags, tokenizeHtml, type HtmlToken } from './htmlTokens';

function pieces(text: string, tokens: HtmlToken[]): string[] {
  const parts: string[] = [];
  for (const token of tokens) parts.push(`${token.kind}:${text.slice(token.start, token.end)}`);
  return parts;
}

describe('tokenizeHtml', () => {
  it('finds tag names, attributes, values and comments', () => {
    const text = '<!-- note --><a href="#top" hidden>Top</a><br/>';
    expect(pieces(text, tokenizeHtml(text))).toEqual([
      'comment:<!-- note -->',
      'tag:<a',
      'attribute:href',
      'value:"#top"',
      'attribute:hidden',
      'tag:>',
      'tag:</a',
      'tag:>',
      'tag:<br',
      'tag:/>',
    ]);
  });

  it('reads single-quoted and unquoted values and spaces around the equals sign', () => {
    const text = "<input type = 'email' size=20>";
    expect(pieces(text, tokenizeHtml(text))).toEqual([
      'tag:<input',
      'attribute:type',
      "value:'email'",
      'attribute:size',
      'value:20',
      'tag:>',
    ]);
  });

  it('returns no tokens for empty or plain text', () => {
    expect(tokenizeHtml('')).toEqual([]);
    expect(tokenizeHtml('Just words')).toEqual([]);
  });

  it('ignores tags written inside comments', () => {
    const text = '<!-- <div> -->';
    expect(pieces(text, tokenizeHtml(text))).toEqual(['comment:<!-- <div> -->']);
  });
});

describe('findUnclosedTags', () => {
  it('lists elements that are opened but never closed', () => {
    expect(findUnclosedTags('<section><div><p>Hi</section>')).toEqual(['div', 'p']);
  });

  it('accepts void and self-closing elements', () => {
    expect(findUnclosedTags('<div><img src="a.png"><br><svg/></div>')).toEqual([]);
  });
});
