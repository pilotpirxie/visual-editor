import { createZip, type ZipEntry } from '../../src/features/export/zip';

type Json = Record<string, unknown>;

type FixtureBlock = { id: string; json: Json; template: string; styles: string };

const THUMBNAIL = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');

const QUOTE_TEMPLATE = [
  '<section class="b-acme-quote-card section">',
  '  <div class="container stack">',
  '    <blockquote class="b-quote" data-field="quote">{{nl2br quote}}</blockquote>',
  '    <p class="b-author">{{author}}{{byline}}</p>',
  '  </div>',
  '</section>',
].join('\n');

const QUOTE_STYLES = [
  '@layer components {',
  '  @scope (.b-acme-quote-card) {',
  '    .b-quote { font-size: var(--text-2xl); font-style: italic; }',
  '    .b-author { color: var(--color-text-muted); }',
  '  }',
  '}',
].join('\n');

function quoteCard(authorField: Json): FixtureBlock {
  return {
    id: 'quote-card',
    json: {
      name: 'Quote card',
      category: 'testimonials',
      styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
      fields: [
        {
          name: 'quote',
          label: 'Quote',
          type: 'textarea',
          default: 'It changed how our team works.',
          required: true,
        },
        authorField,
      ],
    },
    template: QUOTE_TEMPLATE,
    styles: QUOTE_STYLES,
  };
}

const AUTHOR = { name: 'author', label: 'Author', type: 'text', default: 'Dana Ruiz, Northwind' };

const BYLINE = { name: 'byline', label: 'Byline', type: 'text', default: 'A happy customer' };

async function packZip(version: string, blocks: FixtureBlock[]): Promise<Buffer> {
  const encoder = new TextEncoder();
  const info = { id: 'acme', name: 'Acme blocks', version, author: 'Acme Studio', license: 'MIT' };
  const entries: ZipEntry[] = [{ path: 'pack.json', data: encoder.encode(JSON.stringify(info)) }];
  for (const block of blocks) {
    entries.push(
      { path: `${block.id}/block.json`, data: encoder.encode(JSON.stringify(block.json)) },
      { path: `${block.id}/template.hbs`, data: encoder.encode(block.template) },
      { path: `${block.id}/styles.css`, data: encoder.encode(block.styles) },
      { path: `${block.id}/thumbnail.webp`, data: new Uint8Array(THUMBNAIL) },
    );
  }
  const zip = await createZip(entries);
  return Buffer.from(await zip.arrayBuffer());
}

export function validPack(): Promise<Buffer> {
  return packZip('1.0.0', [quoteCard(AUTHOR)]);
}

export function bylinePack(): Promise<Buffer> {
  return packZip('1.1.0', [quoteCard(BYLINE)]);
}

export function invalidPack(): Promise<Buffer> {
  return packZip('1.0.0', [
    {
      ...quoteCard(AUTHOR),
      id: 'broken',
      template:
        '<section class="b-acme-broken">\n  <a href="https://evil.example/{{quote}}">x</a>\n</section>',
      styles:
        '@layer components {\n  @scope (.b-acme-broken) {\n    a { color: red !important; }\n  }\n}',
    },
  ]);
}

export function hostilePack(): Promise<Buffer> {
  const hostile = quoteCard(AUTHOR);
  return packZip('1.0.0', [
    {
      id: 'hostile',
      json: { ...hostile.json, name: 'Hostile card' },
      template: '<section class="b-acme-hostile"><h1>Hostile</h1></section>',
      styles: [
        '@layer components {',
        '  @scope (.b-acme-hostile) {',
        '    :scope ~ * { background: rgb(255, 0, 0); }',
        '    :scope + * h1, h1, body, html { color: rgb(255, 0, 0); background: rgb(255, 0, 0); }',
        '  }',
        '}',
      ].join('\n'),
    },
  ]);
}
