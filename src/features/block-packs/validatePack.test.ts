import { behaviors } from 'virtual:site-runtime';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PackError } from '../../components/packFormat';
import { registry } from '../../components/registry';
import type { CustomDefinition, RegisteredComponent } from '../../components/types';
import { loadTemplateParser, type ParseTemplate } from '../../render/templateParser';
import {
  QUOTE_CARD_STYLES,
  QUOTE_CARD_TEMPLATE,
  quoteCardBlockJson,
  testPackJson,
  TEST_THUMBNAIL,
} from '../../test/packFixtures';
import { checkCustomDefinition, readBlockPack } from './validatePack';

const sources = import.meta.glob<string>('../../components/library/*/*/template.hbs', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const BEHAVIORS = Object.keys(behaviors);
const PACK = { id: 'acme', name: 'Acme', version: '1.0.0', author: 'Acme', license: 'MIT' };

let parse: ParseTemplate;

beforeAll(async () => {
  parse = await loadTemplateParser();
});

function sourceOf(componentId: string): string {
  for (const [path, source] of Object.entries(sources)) {
    if (path.endsWith(`/${componentId}/template.hbs`)) return source;
  }
  throw new Error(`No template source for ${componentId}`);
}

function asPackBlock({ definition, styles }: RegisteredComponent): CustomDefinition {
  const { migrate, ...rest } = definition;
  expect(typeof migrate === 'function' || migrate === undefined).toBe(true);
  const rootClass = `b-${definition.id}`;
  const packClass = `b-acme-${definition.id}`;
  return {
    pack: PACK,
    definition: { ...rest, id: `acme/${definition.id}` },
    template: sourceOf(definition.id).replaceAll(rootClass, packClass),
    styles: styles.replaceAll(`(.${rootClass})`, `(.${packClass})`),
    thumbnail: TEST_THUMBNAIL,
    fieldRenames: {},
  };
}

async function errorsOf(blockChanges: Record<string, unknown>): Promise<PackError[]> {
  const pack = testPackJson([{ ...quoteCardBlockJson(), ...blockChanges }]);
  const result = await readBlockPack(JSON.stringify(pack), { behaviorNames: BEHAVIORS });
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

describe('every built-in block, written as a pack block, passes validation', () => {
  it.each([...registry.values()])('$definition.id', (component) => {
    const check = checkCustomDefinition(asPackBlock(component), parse);
    expect(check.errors).toEqual([]);
    expect(check.custom).not.toBeNull();
  });
});

describe('readBlockPack', () => {
  it('loads a valid pack and re-serializes its CSS', async () => {
    const result = await readBlockPack(JSON.stringify(testPackJson()), {
      behaviorNames: BEHAVIORS,
    });
    expect(result.errors).toEqual([]);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.styles).toContain('@scope (.b-acme-quote-card)');
  });

  it('names the line of a JSON syntax error', async () => {
    const text = '{\n  "format": "block-pack",\n  "id": acme\n}';
    const [error] = (await readBlockPack(text, { behaviorNames: BEHAVIORS })).errors;
    expect(error?.message).toContain('not valid JSON');
    expect(error?.line).toBe(3);
  });

  it('keeps the valid blocks of a pack with some invalid ones', async () => {
    const broken = { ...quoteCardBlockJson(), id: 'broken', template: '<div>{{#if}}</div>' };
    const pack = testPackJson([quoteCardBlockJson(), broken]);
    const result = await readBlockPack(JSON.stringify(pack), { behaviorNames: BEHAVIORS });
    expect(result.blocks.map(({ definition }) => definition.id)).toEqual(['acme/quote-card']);
    expect(result.errors[0]).toMatchObject({ block: 'acme/broken', field: 'template' });
  });

  it('refuses a class another pack already uses', async () => {
    const takenClasses = new Map([['b-acme-quote-card', 'acme-quote/card']]);
    const result = await readBlockPack(JSON.stringify(testPackJson()), {
      behaviorNames: BEHAVIORS,
      takenClasses,
    });
    expect(result.errors[0]?.message).toContain('which acme-quote/card already uses');
  });
});

describe('template rules', () => {
  it('reports parse errors with their line', async () => {
    expect(
      await templateErrors('<section class="b-acme-quote-card">\n{{#if quote}}\n</section>'),
    ).toEqual([expect.stringMatching(/^template@3: Parse error on line 3/)]);
  });

  it('allows only the documented helpers and blocks', async () => {
    expect(await templateErrors(quoteCardWith('{{lookup points 0}}'))).toEqual([
      'template@9: "lookup" is not a template helper',
    ]);
    expect(await templateErrors(quoteCardWith('{{#with cta}}{{label}}{{/with}}'))).toEqual([
      'template@9: {{#with}} is not allowed; use if, unless or each',
    ]);
    expect(await templateErrors(quoteCardWith('{{> footer}}'))).toEqual([
      'template@9: templates can’t use PartialStatement',
    ]);
  });

  it('refuses mustaches in attribute names, unquoted values and comments', async () => {
    expect(await templateErrors(quoteCardWith('<p {{author}}="x">Hi</p>'))).toEqual([
      'template@9: only {{linkAttrs …}} can add attributes inside a tag',
    ]);
    expect(await templateErrors(quoteCardWith('<p title={{author}}>Hi</p>'))).toEqual([
      'template@9: a {{…}} can only go in text or inside a quoted attribute value',
    ]);
    expect(await templateErrors(quoteCardWith('<!-- {{author}} -->'))).toEqual([
      'template@9: a {{…}} can only go in text or inside a quoted attribute value',
    ]);
  });

  it('refuses links and images that leave the site', async () => {
    expect(await templateErrors(quoteCardWith('<a href="https://evil.example/">x</a>'))).toEqual([
      'template@9: href="https://evil.example/" points to another site; use a link field instead',
    ]);
    expect(
      await templateErrors(quoteCardWith('<a href="#top" ping="//evil.example">x</a>')),
    ).toEqual([
      'template@9: ping="//evil.example" points to another site; use a link field instead',
    ]);
    expect(await templateErrors(quoteCardWith('<a href="{{author}}">x</a>'))).toEqual([
      'template@9: href must use {{href …}} or {{safeUrl …}}',
    ]);
    expect(await templateErrors(quoteCardWith('<a href="mailto:{{author}}">x</a>'))).toEqual([]);
  });

  it('refuses scripts, event handlers and editor attributes', async () => {
    expect(await templateErrors(quoteCardWith('<script>alert(1)</script>'))).toEqual([
      "template@9: can't use <script>",
    ]);
    expect(await templateErrors(quoteCardWith('<p onclick="x()">Hi</p>'))).toEqual([
      "template@9: can't use the onclick attribute: blocks get behavior from the site runtime",
    ]);
    expect(await templateErrors(quoteCardWith('<p data-block-id="x">Hi</p>'))).toEqual([
      "template@9: can't set data-block-id: the editor manages it",
    ]);
    expect(await templateErrors(quoteCardWith('<p id="ve-page">Hi</p>'))).toEqual([
      'template@9: ids starting with ve- belong to the editor',
    ]);
  });

  it('keeps style attributes to safe field types', async () => {
    expect(await templateErrors(quoteCardWith('<p style="--x: {{author}}">Hi</p>'))).toEqual([
      'template@9: a style attribute may only use number, range, select, segmented and color fields, image sizes, @index and block.id',
    ]);
    expect(await templateErrors(quoteCardWith('<p style="background: url(x.png)">Hi</p>'))).toEqual(
      ['template@9: a style attribute can’t load images or use escapes'],
    );
    expect(
      await templateErrors(quoteCardWith('<p style="--count: {{points.length}}">Hi</p>')),
    ).toEqual([]);
  });

  it('allows triple braces only for rich text fields', async () => {
    expect(await templateErrors(quoteCardWith('<p>{{{author}}}</p>'))).toEqual([
      'template@9: triple braces {{{ }}} are only for rich text fields',
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
    ).toEqual(['template@9: {{#if}} must end in the same place in the HTML where it started']);
  });

  it('allows only built-in icon names as literal icons', async () => {
    expect(await templateErrors(quoteCardWith('{{svgIcon "simple-icons:github"}}'))).toEqual([
      'template@9: "simple-icons:github" is not a built-in icon name; use an icon field instead',
    ]);
  });

  it('checks the root element after rendering the defaults', async () => {
    expect(await templateErrors('<section class="b-other">x</section>')).toEqual([
      'template@1: needs the class b-acme-quote-card on its root',
    ]);
    expect(await templateErrors('<section id="x" class="b-acme-quote-card">x</section>')).toEqual([
      "template@1: can't set id on the root element: the editor sets it",
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
