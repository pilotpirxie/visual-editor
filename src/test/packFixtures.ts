import { parsePackFiles, type PackFiles } from '../components/packFormat';
import type { BlockPack, PackBlock } from '../components/types';
import { createZip, type ZipEntry } from '../features/export/zip';

export const TEST_THUMBNAIL_BYTES = Uint8Array.from(
  atob('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
  (char) => char.charCodeAt(0),
);

export const TEST_THUMBNAIL = `data:image/webp;base64,${btoa(String.fromCharCode(...TEST_THUMBNAIL_BYTES))}`;

export const QUOTE_CARD_ID = 'quote-card';

export function quoteCardTemplate(blockId = QUOTE_CARD_ID): string {
  return [
    `<section class="b-acme-${blockId} section">`,
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
}

export function quoteCardStyles(blockId = QUOTE_CARD_ID): string {
  return [
    '@layer components {',
    `  @scope (.b-acme-${blockId}) {`,
    '    .b-quote { font-size: var(--text-2xl); }',
    '    .b-points { display: grid; gap: var(--space-2); }',
    '  }',
    '}',
  ].join('\n');
}

export const QUOTE_CARD_TEMPLATE = quoteCardTemplate();

export const QUOTE_CARD_STYLES = quoteCardStyles();

export type FixtureBlock = {
  id: string;
  json: Record<string, unknown>;
  template: string;
  styles: string;
  thumbnail: Uint8Array;
};

export function quoteCardBlockJson(): Record<string, unknown> {
  return {
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
  };
}

export function quoteCardBlock(
  changes: Record<string, unknown> = {},
  id = QUOTE_CARD_ID,
): FixtureBlock {
  return {
    id,
    json: { ...quoteCardBlockJson(), ...changes },
    template: quoteCardTemplate(id),
    styles: quoteCardStyles(id),
    thumbnail: TEST_THUMBNAIL_BYTES,
  };
}

export function testPackInfo(version = '1.0.0'): Record<string, unknown> {
  return { id: 'acme', name: 'Acme blocks', version, author: 'Acme Studio', license: 'MIT' };
}

function zipEntries(info: Record<string, unknown>, blocks: FixtureBlock[]): ZipEntry[] {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [{ path: 'pack.json', data: encoder.encode(JSON.stringify(info)) }];
  for (const block of blocks) {
    entries.push(
      { path: `${block.id}/block.json`, data: encoder.encode(JSON.stringify(block.json)) },
      { path: `${block.id}/template.hbs`, data: encoder.encode(block.template) },
      { path: `${block.id}/styles.css`, data: encoder.encode(block.styles) },
      { path: `${block.id}/thumbnail.webp`, data: Uint8Array.from(block.thumbnail) },
    );
  }
  return entries;
}

export function testPackFiles(
  blocks: FixtureBlock[] = [quoteCardBlock()],
  info: Record<string, unknown> = testPackInfo(),
): PackFiles {
  return new Map(zipEntries(info, blocks).map(({ path, data }) => [path, data]));
}

export async function testPackZip(
  blocks: FixtureBlock[] = [quoteCardBlock()],
  info: Record<string, unknown> = testPackInfo(),
): Promise<Uint8Array<ArrayBuffer>> {
  const zip = await createZip(zipEntries(info, blocks));
  return new Uint8Array(await zip.arrayBuffer());
}

export function quoteCardDefinition(
  changes: Record<string, unknown> = {},
  version = '1.0.0',
  id = QUOTE_CARD_ID,
): PackBlock {
  const files = testPackFiles([quoteCardBlock(changes, id)], testPackInfo(version));
  const [packBlock] = parsePackFiles(files).blocks;
  if (packBlock === undefined) throw new Error('The quote card fixture did not parse');
  return packBlock;
}

export function packOf(blocks: PackBlock[]): BlockPack {
  const [first] = blocks;
  if (first === undefined) throw new Error('A pack needs at least one block');
  return { ...first.pack, blocks, isPartial: false };
}
