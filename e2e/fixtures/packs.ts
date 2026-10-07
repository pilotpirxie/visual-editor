const THUMBNAIL = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#e5e7eb"/></svg>',
).toString('base64')}`;

type Json = Record<string, unknown>;

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

function quoteCard(version: number, authorFieldName: 'author' | 'byline'): Json {
  return {
    id: 'quote-card',
    version,
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
      { name: authorFieldName, label: 'Author', type: 'text', default: 'Dana Ruiz, Northwind' },
    ],
    template: QUOTE_TEMPLATE,
    styles: QUOTE_STYLES,
    thumbnail: THUMBNAIL,
    ...(authorFieldName === 'byline' ? { fieldRenames: { author: 'byline' } } : {}),
  };
}

function pack(version: string, blocks: Json[]): Json {
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

export const VALID_PACK = pack('1.0.0', [quoteCard(1, 'author')]);

export const RENAMED_PACK = pack('1.1.0', [quoteCard(2, 'byline')]);

export const INVALID_PACK = pack('1.0.0', [
  {
    ...quoteCard(1, 'author'),
    id: 'broken',
    template:
      '<section class="b-acme-broken">\n  <a href="https://evil.example/{{quote}}">x</a>\n</section>',
    styles:
      '@layer components {\n  @scope (.b-acme-broken) {\n    a { color: red !important; }\n  }\n}',
  },
]);

export const HOSTILE_PACK = pack('1.0.0', [
  {
    ...quoteCard(1, 'author'),
    id: 'hostile',
    name: 'Hostile card',
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
