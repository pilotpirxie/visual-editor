import { parsePackFile } from '../components/packFormat';
import type { BlockPack, CustomDefinition } from '../components/types';

const THUMBNAIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#e5e7eb"/></svg>';

export const TEST_THUMBNAIL = `data:image/svg+xml;base64,${btoa(THUMBNAIL_SVG)}`;

export const QUOTE_CARD_TEMPLATE = [
  '<section class="b-acme-quote-card section">',
  '  <div class="container stack">',
  '    <blockquote class="b-quote" data-field="quote">{{nl2br quote}}</blockquote>',
  '    {{#if showAuthor}}<p class="b-author" data-field="author">{{author}}</p>{{/if}}',
  '    <ul class="b-points">',
  '      {{#each points}}<li data-field="points.{{@index}}">{{svgIcon ../icon}} {{text}}</li>{{/each}}',
  '    </ul>',
  '    <a class="btn btn-{{cta.variant}}" href="{{href cta.link}}" {{linkAttrs cta.link}} data-field="cta">{{cta.label}}</a>',
  '  </div>',
  '</section>',
].join('\n');

export const QUOTE_CARD_STYLES = [
  '@layer components {',
  '  @scope (.b-acme-quote-card) {',
  '    .b-quote { font-size: var(--text-2xl); }',
  '    .b-points { display: grid; gap: var(--space-2); }',
  '  }',
  '}',
].join('\n');

export function quoteCardBlockJson(): Record<string, unknown> {
  return {
    id: 'quote-card',
    version: 1,
    name: 'Quote card',
    category: 'testimonials',
    description: 'A quote with its author and a few points.',
    tags: ['quote'],
    fieldGroups: ['Quote', 'Points'],
    styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
    fields: [
      {
        name: 'quote',
        label: 'Quote',
        type: 'textarea',
        default: 'It changed how our team works.',
        required: true,
        group: 'Quote',
      },
      { name: 'showAuthor', label: 'Show author', type: 'boolean', default: true, group: 'Quote' },
      {
        name: 'author',
        label: 'Author',
        type: 'text',
        default: 'Dana Ruiz, Northwind',
        visibleWhen: { field: 'showAuthor', equals: true },
        group: 'Quote',
      },
      { name: 'icon', label: 'Point icon', type: 'icon', default: 'check', group: 'Points' },
      {
        name: 'points',
        label: 'Points',
        type: 'list',
        group: 'Points',
        minItems: 1,
        maxItems: 6,
        itemLabel: 'text',
        itemFields: [{ name: 'text', label: 'Text', type: 'text', default: 'A point' }],
        default: [{ text: 'Faster reviews' }, { text: 'Fewer meetings' }],
      },
      {
        name: 'cta',
        label: 'Button',
        type: 'button',
        default: {
          label: 'Read the story',
          link: { type: 'section', anchor: 'stories', newTab: false },
          variant: 'primary',
        },
        group: 'Quote',
      },
    ],
    template: QUOTE_CARD_TEMPLATE,
    styles: QUOTE_CARD_STYLES,
    thumbnail: TEST_THUMBNAIL,
  };
}

export function testPackJson(
  blocks: Record<string, unknown>[] = [quoteCardBlockJson()],
  version = '1.0.0',
): Record<string, unknown> {
  return {
    format: 'block-pack',
    formatVersion: 1,
    id: 'acme',
    name: 'Acme blocks',
    version,
    author: 'Acme Studio',
    license: 'MIT',
    blocks,
  };
}

export function quoteCardDefinition(
  blockChanges: Record<string, unknown> = {},
  version = '1.0.0',
): CustomDefinition {
  const pack = testPackJson([{ ...quoteCardBlockJson(), ...blockChanges }], version);
  const [definition] = parsePackFile(pack, ['menu']).blocks;
  if (definition === undefined) throw new Error('The quote card fixture did not parse');
  return definition;
}

export function packOf(blocks: CustomDefinition[]): BlockPack {
  const [first] = blocks;
  if (first === undefined) throw new Error('A pack needs at least one block');
  return { ...first.pack, blocks, isPartial: false };
}
