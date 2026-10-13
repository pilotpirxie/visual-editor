import Handlebars from 'handlebars/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRenderCollector, resolveHref, siteFormOf, videoEmbedUrl } from './handlebars';
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

  it('formAttrs prefers the form address, then the site service, then sends nothing', () => {
    const noSiteForm = { hash: {}, data: { pageSlugs: {} } };
    expect(String(helpers.formAttrs('https://forms.example/submit', 'get', noSiteForm))).toBe(
      'action="https://forms.example/submit" method="get"',
    );
    expect(String(helpers.formAttrs('', 'post', noSiteForm))).toBe('method="dialog"');
    expect(String(helpers.formAttrs(' javascript:alert(1)', 'post', noSiteForm))).toBe(
      'method="dialog"',
    );
    const formspree = siteFormOf('formspree', 'abcdwxyz');
    const withFormspree = { hash: {}, data: { pageSlugs: {}, siteForm: formspree } };
    expect(String(helpers.formAttrs('', 'get', withFormspree))).toBe(
      'action="https://formspree.io/f/abcdwxyz" method="post"',
    );
    expect(String(helpers.formAttrs('https://own.example/form', 'post', withFormspree))).toBe(
      'action="https://own.example/form" method="post"',
    );
    const netlify = { pageSlugs: {}, siteForm: siteFormOf('netlify', undefined), formName: 'a"b' };
    expect(String(helpers.formAttrs('', 'post', { hash: {}, data: netlify }))).toBe(
      'method="post" data-netlify="true" name="a&quot;b"',
    );
  });

  it('siteFormOf ignores a target that does not fit the service', () => {
    expect(siteFormOf(undefined, 'abcdwxyz')).toBeNull();
    expect(siteFormOf('formspree', '')).toBeNull();
    expect(siteFormOf('formspree', 'https://example.com/contact')).toBeNull();
    expect(siteFormOf('custom', 'abcdwxyz')).toBeNull();
    expect(siteFormOf('custom', 'https://example.com/contact')).toEqual({
      service: 'address',
      action: 'https://example.com/contact',
    });
  });

  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    ],
    [
      'https://youtu.be/dQw4w9WgXcQ?t=10',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    ],
    [
      'https://m.youtube.com/shorts/abc123DEF_-',
      'https://www.youtube-nocookie.com/embed/abc123DEF_-?autoplay=1',
    ],
    ['https://vimeo.com/123456789', 'https://player.vimeo.com/video/123456789?autoplay=1'],
    [
      'https://player.vimeo.com/video/123456789',
      'https://player.vimeo.com/video/123456789?autoplay=1',
    ],
  ])('videoEmbedUrl turns %s into a player address', (address, expected) => {
    expect(videoEmbedUrl(address)).toBe(expected);
  });

  it.each([
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v="><script>',
    'https://www.youtube.com/',
    'about.html',
    '',
  ])('videoEmbedUrl refuses %s', (address) => {
    expect(videoEmbedUrl(address)).toBeNull();
  });

  it('embedUrl only reads web address links', () => {
    const video = { type: 'url', url: 'https://vimeo.com/123456789', newTab: true };
    expect(helpers.embedUrl(video)).toBe('https://player.vimeo.com/video/123456789?autoplay=1');
    expect(helpers.embedUrl({ type: 'page', pageId: 'about', newTab: false })).toBe('');
    expect(helpers.embedUrl({ type: 'url', url: 'https://example.com', newTab: false })).toBe('');
    expect(helpers.embedUrl(undefined)).toBe('');
  });

  it('svgIcon warns and renders nothing for an unknown icon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(helpers.svgIcon('no-such-icon', { hash: {}, data: { pageSlugs: {} } })).toBe('');
    expect(warn).toHaveBeenCalledWith('svgIcon: unknown icon "no-such-icon"');
  });

  describe('map', () => {
    function map(address: unknown, hash: Record<string, unknown>, liveMaps = true): string {
      return String(helpers.map(address, { hash, data: { pageSlugs: {}, liveMaps } }));
    }

    function frame(address: unknown, hash: Record<string, unknown>): HTMLIFrameElement {
      const holder = document.createElement('div');
      holder.innerHTML = map(address, hash);
      const element = holder.firstElementChild;
      if (!(element instanceof HTMLIFrameElement)) throw new Error('No map frame was rendered');
      return element;
    }

    it('shows the free Google map of an address in a lazy frame', () => {
      const element = frame('12 Mill Lane,\nLeeds  LS1 4AB', { class: 'b-frame', zoom: 14 });
      expect(element.getAttribute('src')).toBe(
        'https://www.google.com/maps?q=12%20Mill%20Lane%2C%20Leeds%20LS1%204AB&z=14&output=embed',
      );
      expect(element.className).toBe('b-frame');
      expect(element.title).toBe('Map of 12 Mill Lane, Leeds LS1 4AB');
      expect(element.getAttribute('loading')).toBe('lazy');
      expect(element.dataset.map).toBe('live');
    });

    it('uses the official Google embed when a key is given', () => {
      const element = frame('Leeds', { service: 'google', key: ' AIza&key ', zoom: '11' });
      expect(element.getAttribute('src')).toBe(
        'https://www.google.com/maps/embed/v1/place?key=AIza%26key&q=Leeds&zoom=11',
      );
    });

    it('shows OpenStreetMap around a position with a marker', () => {
      const element = frame('', { service: 'osm', latitude: 53.8, longitude: -1.55, zoom: 15 });
      const url = new URL(element.getAttribute('src') ?? '');
      expect(url.origin + url.pathname).toBe('https://www.openstreetmap.org/export/embed.html');
      expect(url.searchParams.get('marker')).toBe('53.80000,-1.55000');
      expect(element.title).toBe('Map of 53.80000, -1.55000');
      const corners = (url.searchParams.get('bbox') ?? '').split(',').map(Number);
      expect(corners[0]).toBeLessThan(-1.55);
      expect(corners[2]).toBeGreaterThan(-1.55);
      expect(corners[1]).toBeLessThan(53.8);
      expect(corners[3]).toBeGreaterThan(53.8);
    });

    it('keeps the zoom within what maps offer', () => {
      expect(frame('Leeds', { zoom: 99 }).getAttribute('src')).toContain('&z=19&');
      expect(frame('Leeds', { zoom: -4 }).getAttribute('src')).toContain('&z=3&');
      expect(frame('Leeds', { zoom: 'far' }).getAttribute('src')).toContain('&z=15&');
    });

    it('escapes an address that tries to break out of the frame', () => {
      const html = map('"><script>alert(1)</script>', {});
      expect(html).not.toContain('<script>');
      expect(html).toContain('title="Map of &quot;&gt;&lt;script&gt;');
    });

    it('renders nothing without an address or with an impossible position', () => {
      expect(map('  ', {})).toBe('');
      expect(map('Leeds', { service: 'osm' })).toBe('');
      expect(map('', { service: 'osm', latitude: 120, longitude: 0 })).toBe('');
    });

    it('shows a card instead of the map while editing', () => {
      const html = map('12 Mill Lane, Leeds', { class: 'b-frame' }, false);
      expect(html).toBe(
        '<div class="b-frame" data-map="placeholder"><strong>12 Mill Lane, Leeds</strong>' +
          '<small>The map shows in Preview and on the exported site.</small></div>',
      );
      expect(map('', {}, false)).toContain('Add an address to show the map here.');
      expect(map('Leeds', {}, false)).not.toContain('<iframe');
    });
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
