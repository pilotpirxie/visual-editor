import Handlebars from 'handlebars/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveHref } from './handlebars';
import { registerIconSet } from './icons';

const data = { pageSlugs: { home: 'index', about: 'about' } };

describe('resolveHref', () => {
  it.each([
    [{ type: 'page', pageId: 'about', newTab: false }, 'about.html'],
    [{ type: 'page', pageId: 'home', newTab: false }, 'index.html'],
    [{ type: 'page', pageId: 'deleted', newTab: false }, '#'],
    [{ type: 'section', anchor: 'pricing', newTab: false }, '#pricing'],
    [{ type: 'section', pageId: 'about', anchor: 'team', newTab: false }, 'about.html#team'],
    [{ type: 'url', url: 'https://example.com', newTab: true }, 'https://example.com'],
    [{ type: 'url', url: 'javascript:alert(1)', newTab: false }, '#'],
    [{ type: 'email', url: 'hello@example.com', newTab: false }, 'mailto:hello@example.com'],
    [{ type: 'phone', url: '+15550100', newTab: false }, 'tel:+15550100'],
  ] as const)('resolves %o to %s', (link, expected) => {
    expect(resolveHref(link, data)).toBe(expected);
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

  it('nl2br escapes text before adding line breaks', () => {
    expect(String(helpers.nl2br('One <b>\nTwo'))).toBe('One &lt;b&gt;<br>Two');
  });

  it('svgIcon renders a decorative inline icon from a bare name or a set:name reference', () => {
    registerIconSet('lucide', {
      width: 24,
      height: 24,
      icons: { check: { body: '<path d="M20 6 9 17l-5-5"/>' } },
      aliases: { tick: 'check' },
    });
    const expected =
      '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
    expect(String(helpers.svgIcon('lucide:check'))).toBe(expected);
    expect(String(helpers.svgIcon('check'))).toBe(expected);
    expect(String(helpers.svgIcon('tick'))).toBe(expected);
  });

  it('svgIcon warns and renders nothing for an unknown icon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(helpers.svgIcon('no-such-icon')).toBe('');
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

    it('warns and renders nothing for values that are not images', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(helpers.img({ src: 'javascript:alert(1)' }, lazy)).toBe('');
      expect(warn).toHaveBeenCalled();
    });
  });
});
