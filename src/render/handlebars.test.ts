import Handlebars from 'handlebars/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveHref } from './handlebars';

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

  it('svgIcon renders a decorative inline icon and accepts set:name references', () => {
    const icon = String(helpers.svgIcon('lucide:check'));
    expect(icon).toMatch(/^<svg class="icon" aria-hidden="true"/);
    expect(icon).toContain('<path d="M20 6 9 17l-5-5"/>');
  });

  it('svgIcon warns and renders nothing for an unknown icon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(helpers.svgIcon('no-such-icon')).toBe('');
    expect(warn).toHaveBeenCalledWith('svgIcon: unknown icon "no-such-icon"');
  });
});
