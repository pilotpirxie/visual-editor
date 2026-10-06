import { describe, expect, it } from 'vitest';
import { isSafeImageSrc, isSafeUrl, normalizeRichText, plainTextToHtml } from './sanitize';

describe('isSafeUrl', () => {
  it.each([
    ['https://example.com', true],
    ['about.html#team', true],
    ['mailto:hello@example.com', true],
    ['#pricing', true],
    ['javascript:alert(1)', false],
    [' JavaScript:alert(1)', false],
    ['java\nscript:alert(1)', false],
    ['vbscript:msgbox(1)', false],
    ['data:text/html,<script>alert(1)</script>', false],
  ])('%s is %s', (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });

  it('allows image data URLs only as image sources', () => {
    expect(isSafeImageSrc('data:image/svg+xml,%3Csvg%3E')).toBe(true);
    expect(isSafeUrl('data:image/svg+xml,%3Csvg%3E')).toBe(false);
    expect(isSafeImageSrc('data:text/html,hi')).toBe(false);
  });
});

describe('normalizeRichText', () => {
  it.each([
    ['plain text', '<p>plain text</p>'],
    ['<p>One</p><p>Two</p>', '<p>One</p><p>Two</p>'],
    ['<b>Bold</b> and <i>italic</i>', '<p><strong>Bold</strong> and <em>italic</em></p>'],
    ['<div>Line one</div><div>Line two<br></div>', '<p>Line one</p><p>Line two</p>'],
    ['<h2>Heading</h2><p>Body</p>', '<p>Heading</p><p>Body</p>'],
    ['<p><br></p><p>Kept</p>', '<p>Kept</p>'],
    [
      '<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>',
      '<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>',
    ],
    ['<ol><li><p>Step</p></li></ol>', '<ol><li>Step</li></ol>'],
    [
      '<p>Read <a href="https://example.com" target="_blank" onclick="x()">the docs</a></p>',
      '<p>Read <a href="https://example.com">the docs</a></p>',
    ],
    ['<p><a href="javascript:alert(1)">bad</a></p>', '<p>bad</p>'],
    ['<p>Hi<script>alert(1)</script><style>p{}</style></p>', '<p>Hi</p>'],
    ['<p>Photo <img src=x onerror="alert(1)"></p>', '<p>Photo </p>'],
    ['<p class="x" style="color:red" data-a="1">Styled</p>', '<p>Styled</p>'],
    ['<span>Loose <font>text</font></span>', '<p>Loose text</p>'],
    ['<p>1 &lt; 2 &amp; 3</p>', '<p>1 &lt; 2 &amp; 3</p>'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeRichText(input)).toBe(expected);
  });

  it('keeps real bold from Google Docs and drops its normal-weight wrapper', () => {
    const pasted =
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:700;">Bold</span><span style="font-weight:400;"> and plain</span></p><ul><li dir="ltr"><p dir="ltr"><span style="font-style:italic;">Item</span></p></li></ul></b>';
    expect(normalizeRichText(pasted)).toBe(
      '<p><strong>Bold</strong> and plain</p><ul><li><em>Item</em></li></ul>',
    );
  });

  it('removes Word markup', () => {
    const pasted =
      '<p class="MsoNormal">Hello <b>world</b><o:p></o:p></p><p class="MsoNormal"><o:p>&nbsp;</o:p></p>';
    expect(normalizeRichText(pasted)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('gives the same result when run twice', () => {
    const messy =
      '<div>Intro <b>bold</b><div><ul><li><p>a</p><p>b</p></li></ul></div></div>tail <a href="#x">link</a>';
    const once = normalizeRichText(messy);
    expect(normalizeRichText(once)).toBe(once);
  });
});

describe('plainTextToHtml', () => {
  it('turns blank lines into paragraphs and single line breaks into br', () => {
    expect(plainTextToHtml('One\nline <b>\n\nTwo')).toBe('<p>One<br>line &lt;b&gt;</p><p>Two</p>');
  });
});
