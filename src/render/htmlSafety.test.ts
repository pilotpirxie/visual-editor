import { describe, expect, it } from 'vitest';
import { decorateHtmlRoots, stripUnsafeHtml } from './htmlSafety';

describe('stripUnsafeHtml', () => {
  it.each([
    ['a script element', '<p>Hi</p><script>alert(1)</script>', '<p>Hi</p>', '<script>'],
    [
      'an event handler',
      '<img src="a.png" alt="" onerror="alert(1)">',
      '<img src="a.png" alt="">',
      'onerror attribute',
    ],
    ['an SVG load handler', '<svg onload="alert(1)"></svg>', '<svg></svg>', 'onload attribute'],
    [
      'a javascript link',
      '<a href="javascript:alert(1)">x</a>',
      '<a>x</a>',
      'unsafe address in href',
    ],
    [
      'a link with spaces before javascript',
      '<a href=" java\tscript:alert(1)">x</a>',
      '<a>x</a>',
      'unsafe address in href',
    ],
    [
      'an iframe with srcdoc',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      '',
      '<iframe>',
    ],
    [
      'a form action button',
      '<form><button formaction="javascript:alert(1)">Go</button></form>',
      '<form><button>Go</button></form>',
      'formaction attribute',
    ],
    [
      'an SVG animation that sets a link',
      '<svg><a><animate attributeName="href" to="javascript:alert(1)"/></a></svg>',
      '<svg><a></a></svg>',
      '<animate>',
    ],
    [
      'a meta refresh',
      '<meta http-equiv="refresh" content="0;url=https://evil.example">',
      '',
      '<meta>',
    ],
    ['a base element', '<base href="https://evil.example/">', '', '<base>'],
    ['a style element', '<style>body{display:none}</style><p>x</p>', '<p>x</p>', '<style>'],
    [
      'a style attribute with a script URL',
      '<p style="background:url(javascript:alert(1))">x</p>',
      '<p>x</p>',
      'unsafe style attribute',
    ],
    ['an object element', '<object data="javascript:alert(1)"></object>', '', '<object>'],
    [
      'a template with a script inside',
      '<template><script>alert(1)</script></template>',
      '',
      '<template>',
    ],
  ])('removes %s', (_name, html, expected, label) => {
    const result = stripUnsafeHtml(html);
    expect(result.html).toBe(expected);
    expect(result.removed).toContain(label);
  });

  it('blocks the noscript mutation trick', () => {
    const html = '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>';
    expect(stripUnsafeHtml(html).html).not.toMatch(/onerror/i);
  });

  it('keeps ordinary markup, overrides and images untouched', () => {
    const html =
      '<section class="b-hero section" data-component="hero-centered" style="--color-text: #111"><h1>Hi</h1><img src="data:image/svg+xml,%3Csvg%2F%3E" alt="A"><a href="about.html">About</a></section>';
    expect(stripUnsafeHtml(html)).toEqual({ html, removed: [] });
  });

  it('counts repeated removals', () => {
    expect(stripUnsafeHtml('<script></script><script></script>').removed).toEqual(['2 × <script>']);
  });
});

describe('decorateHtmlRoots', () => {
  it('puts the anchor on the first root and the classes on every root', () => {
    expect(
      decorateHtmlRoots('<section>A</section>\n<div>B</div>', {
        anchor: 'intro',
        classes: ['wide'],
      }),
    ).toBe('<section id="intro" class="wide">A</section>\n<div class="wide">B</div>');
  });

  it('leaves markup alone when there is nothing to add', () => {
    expect(decorateHtmlRoots('<p>x</p>', { classes: [] })).toBe('<p>x</p>');
  });
});
