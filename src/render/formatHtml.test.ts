import { describe, expect, it } from 'vitest';
import { formatHtml } from './formatHtml';

describe('formatHtml', () => {
  it('puts nested block elements on their own indented lines', () => {
    expect(formatHtml('<section class="a"><div><h2>Title</h2><p>Text</p></div></section>')).toBe(
      [
        '<section class="a">',
        '  <div>',
        '    <h2>Title</h2>',
        '    <p>Text</p>',
        '  </div>',
        '</section>',
      ].join('\n'),
    );
  });

  it('never adds whitespace inside inline content', () => {
    const html = '<p>Fast <strong>setup</strong>, <a href="#">docs</a>.</p>';
    expect(formatHtml(html)).toBe(html);
    const mixed = '<div>Text <span>inline</span><p>block</p></div>';
    expect(formatHtml(mixed)).toBe(mixed);
  });

  it('keeps preformatted text exactly and indents from the given depth', () => {
    expect(formatHtml('<div><pre>  a\n    b</pre></div>', 1)).toBe(
      '  <div><pre>  a\n    b</pre></div>',
    );
  });

  it('gives the same result when formatting its own output', () => {
    const once = formatHtml('<ul class="x"><li>One</li><li>Two</li></ul><footer><p>©</p></footer>');
    expect(formatHtml(once)).toBe(once);
  });

  it('escapes attribute values it writes', () => {
    expect(formatHtml('<div title="a &amp; &quot;b&quot;"><p>x</p></div>')).toContain(
      '<div title="a &amp; &quot;b&quot;">',
    );
  });
});
