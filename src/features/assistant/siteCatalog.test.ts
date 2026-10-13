import { describe, expect, it } from 'vitest';
import { builtInComponents } from '../../components/registry';
import {
  blockBrief,
  catalogText,
  firstBlockOf,
  HIDDEN_CATEGORIES,
  isPageBlock,
  siteBlock,
} from './siteCatalog';

const MAX_CATALOG_BYTES = 110_000;

function definitionOf(blockId: string): NonNullable<ReturnType<typeof siteBlock>> {
  const definition = siteBlock(blockId);
  if (definition === null) throw new Error(`The library has no block ${blockId}`);
  return definition;
}

describe('catalogText', () => {
  const catalog = catalogText();
  const lines = catalog.split('\n');

  it('lists every block the assistant may use exactly once', () => {
    for (const { definition } of builtInComponents.values()) {
      const count = lines.filter((line) => line.startsWith(`${definition.id}: `)).length;
      const isHidden = HIDDEN_CATEGORIES.includes(definition.category);
      expect(count, definition.id).toBe(isHidden ? 0 : 1);
    }
  });

  it('groups blocks under their category and stays small enough to send', () => {
    expect(catalog).toContain('## Headers (category "headers")');
    expect(catalog).not.toContain('## Modals');
    expect(catalog).not.toContain('## Cookies');
    expect(new TextEncoder().encode(catalog).length).toBeLessThan(MAX_CATALOG_BYTES);
  });
});

describe('siteBlock', () => {
  it('knows library blocks and refuses hidden or unknown ones', () => {
    expect(siteBlock('hero-centered')?.category).toBe('headers');
    expect(siteBlock('modal-simple')).toBeNull();
    expect(siteBlock('no-such-block')).toBeNull();
  });

  it('keeps navigation, banners and footers out of pages', () => {
    expect(isPageBlock(definitionOf('hero-centered'))).toBe(true);
    expect(isPageBlock(definitionOf('nav-simple'))).toBe(false);
    expect(isPageBlock(definitionOf('footer-simple'))).toBe(false);
  });
});

describe('blockBrief', () => {
  it('describes fields with their limits and a short example', () => {
    const brief = blockBrief(definitionOf('features-grid-3'));
    expect(brief.block).toBe('features-grid-3');
    const fields = brief.fields;
    if (!Array.isArray(fields)) throw new Error('The brief has no fields');
    const items: unknown = fields.find((field: { name: string }) => field.name === 'items');
    expect(items).toMatchObject({ type: 'list', usualCount: 3 });
    expect(items).toHaveProperty('example.length', 2);
    expect(items).toHaveProperty('itemFields.0.name', 'icon');
    expect(items).not.toHaveProperty('itemFields.0.example');
  });

  it('shows images as alt, subject and ratio and leaves form addresses out', () => {
    const text = JSON.stringify(blockBrief(definitionOf('contact-form')));
    expect(text).not.toContain('formAction');
    expect(text).not.toContain('formMethod');
    const hero = JSON.stringify(blockBrief(definitionOf('hero-app')));
    expect(hero).toContain('"subject"');
    expect(hero).not.toContain('"source"');
    expect(hero).not.toContain('"width"');
  });
});

describe('catalogText for some categories', () => {
  it('lists only the blocks of the categories asked for', () => {
    const text = catalogText(['pricing', 'faq']);
    expect(text).toContain('(category "pricing")');
    expect(text).toContain('(category "faq")');
    expect(text).not.toContain('(category "headers")');
    expect(text.length).toBeLessThan(catalogText().length / 4);
  });
});

describe('firstBlockOf', () => {
  it('finds a block of a category and nothing for a hidden one', () => {
    expect(firstBlockOf('pricing')?.category).toBe('pricing');
    expect(firstBlockOf('modals')).toBeNull();
  });
});

describe('blockBrief without examples', () => {
  it('leaves the examples out for a section that already has content', () => {
    const brief = blockBrief(definitionOf('features-grid-3'), false);
    expect(JSON.stringify(brief)).not.toContain('"example"');
    expect(JSON.stringify(brief)).toContain('"itemFields"');
  });
});
