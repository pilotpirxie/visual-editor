import { describe, expect, it, vi } from 'vitest';
import type { FontSelection } from '../../app/types';
import { syncFontLink } from './fontLink';

const INTER: FontSelection[] = [{ role: 'body', family: 'Inter', weights: [400] }];
const LORA: FontSelection[] = [{ role: 'body', family: 'Lora', weights: [400] }];

function fontLinks(doc: Document): string[] {
  return [...doc.head.querySelectorAll('link[data-ve-fonts]')].map(
    (link) => link.getAttribute('href') ?? '',
  );
}

function newDocument(): Document {
  return document.implementation.createHTMLDocument('canvas');
}

describe('syncFontLink', () => {
  it('adds one stylesheet link for the fonts in use', () => {
    const doc = newDocument();
    syncFontLink(doc, INTER);
    expect(fontLinks(doc)).toEqual([
      'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap',
    ]);
  });

  it('does nothing when the link already loads the same fonts', () => {
    const doc = newDocument();
    syncFontLink(doc, INTER);
    syncFontLink(doc, INTER);
    expect(fontLinks(doc)).toHaveLength(1);
  });

  it('keeps the old link until the new one has loaded', async () => {
    const doc = newDocument();
    syncFontLink(doc, INTER);
    syncFontLink(doc, LORA);
    expect(fontLinks(doc)).toHaveLength(2);
    doc.head.querySelectorAll('link[data-ve-fonts]')[1].dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(fontLinks(doc)).toHaveLength(1));
    expect(fontLinks(doc)[0]).toContain('family=Lora');
  });

  it('drops the old link when the new one fails to load', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = newDocument();
    syncFontLink(doc, INTER);
    syncFontLink(doc, LORA);
    doc.head.querySelectorAll('link[data-ve-fonts]')[1].dispatchEvent(new Event('error'));
    expect(fontLinks(doc)).toHaveLength(1);
    expect(fontLinks(doc)[0]).toContain('family=Lora');
  });

  it('removes every link when only system fonts are left', () => {
    const doc = newDocument();
    syncFontLink(doc, INTER);
    syncFontLink(doc, []);
    expect(fontLinks(doc)).toEqual([]);
  });
});
