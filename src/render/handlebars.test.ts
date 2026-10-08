import Handlebars from 'handlebars/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRenderCollector, resolveHref } from './handlebars';
import { registerIconSet } from './icons';

const data = { pageSlugs: { home: 'index', about: 'about' } };

describe('resolveHref', () => {
  it.each([
    [{ type: 'page', pageId: 'about', newTab: false }, 'about.html'],
    [{ type: 'page', pageId: 'home', newTab: false }, 'index.html'],
    [{ type: 'page', pageId: 'deleted', newTab: false }, '#'],
    [{ type: 'section', anchor: 'pricing', newTab: false }, '#pricing'],
    [{ type: 'section', pageId: 'about', anchor: 'team', newTab: false }, 'about.html#team'],
    [{ type: 'section', pageId: 'about', newTab: false }, 'about.html'],
    [{ type: 'section', pageId: 'deleted', anchor: 'team', newTab: false }, '#'],
    [{ type: 'section', anchor: '', newTab: false }, '#'],
    [{ type: 'url', url: 'https://example.com', newTab: true }, 'https://example.com'],
    [{ type: 'url', url: 'javascript:alert(1)', newTab: false }, '#'],
    [{ type: 'email', url: 'hello@example.com', newTab: false }, 'mailto:hello@example.com'],
    [{ type: 'phone', url: '+15550100', newTab: false }, 'tel:+15550100'],
  ] as const)('resolves %o to %s', (link, expected) => {
    expect(resolveHref(link, data)).toBe(expected);
  });
});

describe('resolveHref on the page that holds the link', () => {
  it('points a section link to its own page at the section only', () => {
    const onAbout = { ...data, currentPageId: 'about' };
    const link = { type: 'section', pageId: 'about', anchor: 'team', newTab: false } as const;
    expect(resolveHref(link, onAbout)).toBe('#team');
  });
});

describe('template helpers', () => {
  const helpers = Handlebars.helpers;

  afterEach(() => vi.restoreAllMocks());

  it('linkAttrs opens new-tab links safely', () => {
    expect(String(helpers.linkAttrs({ type: 'url', url: '#', newTab: true }))).toBe(
      'target="_blank" rel="noopener"',
    );
    expect(String(helpers.linkAttrs({ type: 'url', url: '#', newTab: false }))).toBe('');
  });

  it('and/or compare two operands by truthiness', () => {
    expect(helpers.and(true, 'label')).toBe(true);
    expect(helpers.and(true, '')).toBe(false);
    expect(helpers.or('', 0)).toBe(false);
    expect(helpers.or('', 'label')).toBe(true);
  });

  it('richText renders only the allowed rich text markup', () => {
    const html = '<p>Hi <b>there</b><img src="x" onerror="alert(1)"></p><script>alert(2)</script>';
    expect(String(helpers.richText(html, { hash: {} }))).toBe('<p>Hi <strong>there</strong></p>');
  });

  it('richText renders nothing for a value that is not text', () => {
    expect(String(helpers.richText(undefined, { hash: {} }))).toBe('');
  });

  it('richText keeps h2 and h3 only when the template asks for headings', () => {
    const html = '<h2>Section</h2><p>Body</p>';
    expect(String(helpers.richText(html, { hash: {} }))).toBe('<p>Section</p><p>Body</p>');
    expect(String(helpers.richText(html, { hash: { headings: true } }))).toBe(html);
  });

  it('formatDate writes an ISO date in the site language and leaves other text alone', () => {
    const english = { hash: {}, data: { pageSlugs: {}, language: 'en' } };
    const german = { hash: {}, data: { pageSlugs: {}, language: 'de' } };
    expect(helpers.formatDate('2026-03-09', english)).toBe('March 9, 2026');
    expect(helpers.formatDate('2026-03-09', german)).toBe('9. März 2026');
    expect(helpers.formatDate('Spring 2026', english)).toBe('Spring 2026');
    expect(helpers.formatDate(undefined, english)).toBe('');
  });

  it('nl2br escapes text before adding line breaks', () => {
    expect(String(helpers.nl2br('One <b>\nTwo'))).toBe('One &lt;b&gt;<br>Two');
  });

  it('svgIcon renders a decorative inline icon from a bare name or a set:name reference', () => {
    registerIconSet('lucide', {
      width: 24,
      height: 24,
      styles: [],
      icons: { check: { body: '<path d="M20 6 9 17l-5-5"/>' } },
      aliases: { tick: 'check' },
    });
    const expected =
      '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
    const options = { hash: {}, data: { pageSlugs: {} } };
    expect(String(helpers.svgIcon('lucide:check', options))).toBe(expected);
    expect(String(helpers.svgIcon('check', options))).toBe(expected);
    expect(String(helpers.svgIcon('tick', options))).toBe(expected);
  });

  it('svgIcon refers to a sprite symbol and records the icon when exporting', () => {
    registerIconSet('lucide', {
      width: 24,
      height: 24,
      styles: [],
      icons: { check: { body: '<path d="M20 6 9 17l-5-5"/>' } },
      aliases: {},
    });
    const collector = createRenderCollector();
    const options = { hash: {}, data: { pageSlugs: {}, collector } };
    expect(String(helpers.svgIcon('lucide:check', options))).toBe(
      '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-lucide-check"></use></svg>',
    );
    expect([...collector.icons.keys()]).toEqual(['icon-lucide-check']);
    expect([...collector.iconSets]).toEqual(['lucide']);
  });

  it('safeUrl keeps web addresses and drops script addresses', () => {
    expect(helpers.safeUrl('https://forms.example/submit')).toBe('https://forms.example/submit');
    expect(helpers.safeUrl(' javascript:alert(1)')).toBe('');
    expect(helpers.safeUrl(undefined)).toBe('');
  });

  it('svgIcon warns and renders nothing for an unknown icon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(helpers.svgIcon('no-such-icon', { hash: {}, data: { pageSlugs: {} } })).toBe('');
    expect(warn).toHaveBeenCalledWith('svgIcon: unknown icon "no-such-icon"');
  });

  describe('img', () => {
    const image = {
      source: 'placeholder',
      src: '',
      alt: 'Team "planning" <session>',
      decorative: false,
      width: 1200,
      height: 900,
      placeholder: { ratio: '4:3', subject: 'photo' },
    };
    const lazy = { hash: {}, data: { pageSlugs: {} } };

    it('renders a lazy placeholder image with escaped alt text and its size', () => {
      const html = String(helpers.img(image, lazy));
      expect(html).toMatch(/^<img src="data:image\/svg\+xml,/);
      expect(html).toContain('alt="Team &quot;planning&quot; &lt;session&gt;"');
      expect(html).toContain('width="1200" height="900" loading="lazy"');
    });

    it('adds a class and loads eagerly in header blocks', () => {
      const html = String(
        helpers.img(image, {
          hash: { class: 'b-photo' },
          data: { pageSlugs: {}, eagerImages: true },
        }),
      );
      expect(html).toContain('class="b-photo"');
      expect(html).toContain('loading="eager" fetchpriority="high"');
    });

    it('renders an empty alt for decorative images', () => {
      expect(String(helpers.img({ ...image, decorative: true }, lazy))).toContain('alt=""');
    });

    it('shows an uploaded image from its data URL on the canvas', () => {
      const uploaded = {
        source: 'upload',
        src: 'data:image/png;base64,iVBORw0KGgo=',
        name: 'team.png',
        alt: 'The team',
        decorative: false,
        width: 640,
        height: 480,
      };
      expect(String(helpers.img(uploaded, lazy))).toBe(
        '<img src="data:image/png;base64,iVBORw0KGgo&#x3D;" alt="The team" width="640" height="480" loading="lazy">',
      );
    });

    it('warns and renders nothing for values that are not images', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(helpers.img({ src: 'javascript:alert(1)' }, lazy)).toBe('');
      expect(warn).toHaveBeenCalled();
    });
  });
});
