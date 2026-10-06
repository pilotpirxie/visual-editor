import { describe, expect, it } from 'vitest';
import { canvasLinkTarget } from './links';

const PAGE_SLUGS = { home: 'index', about: 'about', team: 'our-team' };

describe('canvasLinkTarget', () => {
  it.each([null, '', '#', '   '])('does nothing for the empty link %j', (href) => {
    expect(canvasLinkTarget(href, PAGE_SLUGS)).toEqual({ kind: 'none' });
  });

  it('scrolls to a section on the same page', () => {
    expect(canvasLinkTarget('#pricing', PAGE_SLUGS)).toEqual({
      kind: 'section',
      anchor: 'pricing',
    });
  });

  it('opens another page of the project, with an optional section', () => {
    expect(canvasLinkTarget('about.html', PAGE_SLUGS)).toEqual({
      kind: 'page',
      pageId: 'about',
      anchor: null,
    });
    expect(canvasLinkTarget('our-team.html#leads', PAGE_SLUGS)).toEqual({
      kind: 'page',
      pageId: 'team',
      anchor: 'leads',
    });
  });

  it('treats index.html as the home page', () => {
    expect(canvasLinkTarget('index.html', PAGE_SLUGS)).toEqual({
      kind: 'page',
      pageId: 'home',
      anchor: null,
    });
  });

  it('ignores page files that are not in the project', () => {
    expect(canvasLinkTarget('missing.html', PAGE_SLUGS)).toEqual({ kind: 'none' });
  });

  it.each(['https://example.com', 'mailto:hello@example.com', 'tel:+48123456789'])(
    'opens %s outside the canvas',
    (href) => {
      expect(canvasLinkTarget(href, PAGE_SLUGS)).toEqual({ kind: 'external', href });
    },
  );

  it.each(['javascript:alert(1)', 'docs/start', '/absolute/path'])('never follows %s', (href) => {
    expect(canvasLinkTarget(href, PAGE_SLUGS)).toEqual({ kind: 'none' });
  });
});
