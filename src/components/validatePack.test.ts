import { beforeAll, describe, expect, it } from 'vitest';
import type { PackError } from './packFormat';
import { loadTemplateParser, type ParseTemplate } from '../render/templateParser';
import {
  QUOTE_CARD_STYLES,
  QUOTE_CARD_TEMPLATE,
  quoteCardBlock,
  quoteCardDefinition,
  testPackInfo,
  testPackZip,
} from '../test/packFixtures';
import { checkPackBlock, readBlockPack } from './validatePack';

let parse: ParseTemplate;

beforeAll(async () => {
  parse = await loadTemplateParser();
});

async function errorsOf(changes: { template?: string; styles?: string }): Promise<PackError[]> {
  const block = { ...quoteCardBlock(), ...changes };
  const result = await readBlockPack(await testPackZip([block]), new Map());
  return result.errors;
}

async function templateErrors(template: string): Promise<string[]> {
  const messages: string[] = [];
  for (const error of await errorsOf({ template })) {
    messages.push(`${error.field ?? ''}@${error.line ?? '-'}: ${error.message}`);
  }
  return messages;
}

async function cssErrors(styles: string): Promise<string[]> {
  const messages: string[] = [];
  for (const error of await errorsOf({ styles })) messages.push(error.message);
  return messages;
}

function quoteCardWith(line: string): string {
  return QUOTE_CARD_TEMPLATE.replace('  </div>\n</section>', `    ${line}\n  </div>\n</section>`);
}

function quoteCardCss(rule: string): string {
  return QUOTE_CARD_STYLES.replace('  }\n}', `    ${rule}\n  }\n}`);
}

describe('readBlockPack', () => {
  it('loads a valid pack and re-serializes its CSS', async () => {
    const result = await readBlockPack(await testPackZip(), new Map());
    expect(result.errors).toEqual([]);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.styles).toContain('@scope (.b-acme-quote-card)');
  });

  it('refuses a file that is not a zip', async () => {
    const bytes = new TextEncoder().encode('{"format": "block-pack"}');
    const [error] = (await readBlockPack(bytes, new Map())).errors;
    expect(error?.message).toContain('not a block pack zip');
  });

  it('reserves the built-in pack id', async () => {
    const zip = await testPackZip([quoteCardBlock()], { ...testPackInfo(), id: 'builtin' });
    const [error] = (await readBlockPack(zip, new Map())).errors;
    expect(error?.message).toContain('reserved for the built-in blocks');
  });

  it('keeps the valid blocks of a pack with some invalid ones', async () => {
    const broken = { ...quoteCardBlock({}, 'broken'), template: '<div>{{#if}}</div>' };
    const result = await readBlockPack(await testPackZip([quoteCardBlock(), broken]), new Map());
    expect(result.blocks.map(({ definition }) => definition.id)).toEqual(['acme/quote-card']);
    expect(result.errors[0]).toMatchObject({ block: 'acme/broken', field: 'template.hbs' });
  });

  it('refuses a class another pack already uses', async () => {
    const takenClasses = new Map([['b-acme-quote-card', 'acme-quote/card']]);
    const result = await readBlockPack(await testPackZip(), takenClasses);
    expect(result.errors[0]?.message).toContain('which acme-quote/card already uses');
  });
});

describe('checkPackBlock', () => {
  it('returns a component ready to render', () => {
    const check = checkPackBlock(quoteCardDefinition(), parse);
    expect(check.errors).toEqual([]);
    expect(check.component?.definition.id).toBe('acme/quote-card');
  });

  it('refuses a root class that a built-in block uses', () => {
    const packBlock = quoteCardDefinition();
    const clash = { ...packBlock, definition: { ...packBlock.definition, id: 'hero/centered' } };
    const { errors } = checkPackBlock(clash, parse);
    expect(errors[0]?.message).toContain('a built-in block already uses');
  });
});

describe('template rules', () => {
  it('reports parse errors with their line', async () => {
    expect(
      await templateErrors('<section class="b-acme-quote-card">\n{{#if quote}}\n</section>'),
    ).toEqual([expect.stringMatching(/^template.hbs@3: Parse error on line 3/)]);
  });

  it('allows only the documented helpers and blocks', async () => {
    expect(await templateErrors(quoteCardWith('{{lookup points 0}}'))).toEqual([
      'template.hbs@9: "lookup" is not a template helper',
    ]);
    expect(await templateErrors(quoteCardWith('{{#with cta}}{{label}}{{/with}}'))).toEqual([
      'template.hbs@9: {{#with}} is not allowed; use if, unless or each',
    ]);
    expect(await templateErrors(quoteCardWith('{{> footer}}'))).toEqual([
      'template.hbs@9: templates can’t use PartialStatement',
    ]);
  });

  it('refuses mustaches in attribute names, unquoted values and comments', async () => {
    expect(await templateErrors(quoteCardWith('<p {{author}}="x">Hi</p>'))).toEqual([
      'template.hbs@9: only {{linkAttrs …}} can add attributes inside a tag',
    ]);
    expect(await templateErrors(quoteCardWith('<p title={{author}}>Hi</p>'))).toEqual([
      'template.hbs@9: a {{…}} can only go in text or inside a quoted attribute value',
    ]);
    expect(await templateErrors(quoteCardWith('<!-- {{author}} -->'))).toEqual([
      'template.hbs@9: a {{…}} can only go in text or inside a quoted attribute value',
    ]);
  });

  it('refuses links and images that leave the site', async () => {
    expect(await templateErrors(quoteCardWith('<a href="https://evil.example/">x</a>'))).toEqual([
      'template.hbs@9: href="https://evil.example/" points to another site; use a link field instead',
    ]);
    expect(
      await templateErrors(quoteCardWith('<a href="#top" ping="//evil.example">x</a>')),
    ).toEqual([
      'template.hbs@9: ping="//evil.example" points to another site; use a link field instead',
    ]);
    expect(await templateErrors(quoteCardWith('<a href="{{author}}">x</a>'))).toEqual([
      'template.hbs@9: href must use {{href …}} or {{safeUrl …}}',
    ]);
    expect(await templateErrors(quoteCardWith('<a href="mailto:{{author}}">x</a>'))).toEqual([]);
  });

  it('refuses scripts, event handlers and editor attributes', async () => {
    expect(await templateErrors(quoteCardWith('<script>alert(1)</script>'))).toEqual([
      'template.hbs@9: can’t use <script>',
    ]);
    expect(await templateErrors(quoteCardWith('<p onclick="x()">Hi</p>'))).toEqual([
      'template.hbs@9: can’t use the onclick attribute: blocks get behavior from the site runtime',
    ]);
    expect(await templateErrors(quoteCardWith('<p data-block-id="x">Hi</p>'))).toEqual([
      'template.hbs@9: can’t set data-block-id: the editor manages it',
    ]);
    expect(await templateErrors(quoteCardWith('<p id="ve-page">Hi</p>'))).toEqual([
      'template.hbs@9: ids starting with ve- belong to the editor',
    ]);
  });

  it('allows only site runtime behaviors in data-behavior', async () => {
    expect(
      await templateErrors(quoteCardWith('<div data-behavior="tabs confetti"></div>')),
    ).toEqual(['template.hbs@9: "confetti" is not a site runtime behavior']);
    expect(await templateErrors(quoteCardWith('<div data-behavior="{{quote}}"></div>'))).toEqual([
      'template.hbs@9: data-behavior must name behaviors, not template values',
    ]);
  });

  it('keeps style attributes to safe field types', async () => {
    expect(await templateErrors(quoteCardWith('<p style="--x: {{author}}">Hi</p>'))).toEqual([
      'template.hbs@9: a style attribute may only use number, range, select, segmented and color fields, image sizes, @index and block.id',
    ]);
    expect(await templateErrors(quoteCardWith('<p style="background: url(x.png)">Hi</p>'))).toEqual(
      ['template.hbs@9: a style attribute can’t load images or use escapes'],
    );
    expect(
      await templateErrors(quoteCardWith('<p style="--count: {{points.length}}">Hi</p>')),
    ).toEqual([]);
  });

  it('allows triple braces only for rich text fields', async () => {
    expect(await templateErrors(quoteCardWith('<p>{{{author}}}</p>'))).toEqual([
      'template.hbs@9: triple braces {{{ }}} are only for rich text fields',
    ]);
  });

  it('allows conditions inside a tag only when both branches end in the same place', async () => {
    expect(
      await templateErrors(
        quoteCardWith('<p {{#if showAuthor}}class="a"{{else}}title="b"{{/if}}>x</p>'),
      ),
    ).toEqual([]);
    expect(
      await templateErrors(quoteCardWith('<p {{#if showAuthor}}class="a{{/if}}">x</p>')),
    ).toEqual(['template.hbs@9: {{#if}} must end in the same place in the HTML where it started']);
  });

  it('allows only built-in icon names as literal icons', async () => {
    expect(await templateErrors(quoteCardWith('{{svgIcon "simple-icons:github"}}'))).toEqual([
      'template.hbs@9: "simple-icons:github" is not a built-in icon name; use an icon field instead',
    ]);
  });

  it('checks the root element after rendering the defaults', async () => {
    expect(await templateErrors('<section class="b-other">x</section>')).toEqual([
      'template.hbs@1: needs the class b-acme-quote-card on its root',
    ]);
    expect(await templateErrors('<section id="x" class="b-acme-quote-card">x</section>')).toEqual([
      'template.hbs@1: can’t set id on the root element: the editor sets it',
    ]);
  });
});

describe('CSS rules', () => {
  it('requires one scope for the block root inside the components layer', async () => {
    expect(await cssErrors('.b-acme-quote-card { color: red; }')).toEqual([
      'must be exactly one @layer components { @scope (.b-acme-quote-card) { … } }',
    ]);
    expect(
      await cssErrors(
        '@layer components { @scope (.b-acme-quote-card, body) { p { color: red; } } }',
      ),
    ).toEqual(['must scope to its own root class only: @scope (.b-acme-quote-card)']);
    expect(await cssErrors(`@layer components;\n${QUOTE_CARD_STYLES}`)).toEqual([
      'must be exactly one @layer components { @scope (.b-acme-quote-card) { … } }',
    ]);
  });

  it('refuses global at-rules inside the scope', async () => {
    expect(await cssErrors(quoteCardCss('@keyframes spin { to { rotate: 1turn; } }'))).toEqual([
      '@keyframes spin is not allowed inside the scope',
    ]);
  });

  it('refuses !important, escapes, @import and outside resources, with lines', async () => {
    const errors = await errorsOf({
      styles: quoteCardCss(
        '.b-quote { color: red !important; background: url(https://evil.example/a.png); }',
      ),
    });
    expect(errors.map(({ line, message }) => `${line}: ${message}`)).toEqual([
      '5: !important is not allowed',
      '5: can’t load files; only data:image URLs are allowed',
      'null: !important is not allowed',
    ]);
    expect(await cssErrors(quoteCardCss('.b-quote { --x: u\\72l(x); }'))).toContain(
      'escapes with \\ are not allowed',
    );
    expect(await cssErrors(`@import url(x.css);\n${QUOTE_CARD_STYLES}`)).toContain(
      '@import is not allowed',
    );
    expect(
      await cssErrors(quoteCardCss('.b-quote { background: image-set("x.png" 1x); }')),
    ).toEqual(['can’t load files; only data:image URLs are allowed']);
  });

  it('keeps fixed positioning to navigations, banners, modals and cookies', async () => {
    expect(await cssErrors(quoteCardCss('.b-quote { position: fixed; }'))).toEqual([
      'position: fixed is only for navigations, banners, modals, cookies blocks',
    ]);
  });
});
