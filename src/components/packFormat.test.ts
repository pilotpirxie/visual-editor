import { describe, expect, it, vi } from 'vitest';
import {
  quoteCardBlock,
  quoteCardBlockJson,
  testPackFiles,
  testPackInfo,
  TEST_THUMBNAIL,
} from '../test/packFixtures';
import {
  compareVersions,
  componentIdOf,
  parseEmbeddedBlocks,
  parsePackFiles,
  rootClassOf,
  type PackError,
} from './packFormat';

function fieldsWith(name: string, changes: Record<string, unknown>): unknown[] {
  const fields = quoteCardBlockJson().fields;
  if (!Array.isArray(fields)) throw new Error('fixture has no fields');
  const changed: unknown[] = [];
  for (const field of fields) {
    const isTarget =
      typeof field === 'object' && field !== null && 'name' in field && field.name === name;
    changed.push(isTarget ? { ...field, ...changes } : field);
  }
  return changed;
}

function errorsWith(changes: Record<string, unknown>): PackError[] {
  return parsePackFiles(testPackFiles([quoteCardBlock(changes)])).errors;
}

function filesWithout(path: string): Map<string, Uint8Array> {
  const files = new Map(testPackFiles());
  files.delete(path);
  return files;
}

describe('parsePackFiles', () => {
  it('reads a valid pack into namespaced definitions', () => {
    const { info, blocks, errors } = parsePackFiles(testPackFiles());
    expect(errors).toEqual([]);
    expect(info).toEqual(testPackInfo());
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.definition.id).toBe('acme/quote-card');
    expect(blocks[0]?.definition.category).toBe('testimonials');
    expect(blocks[0]?.thumbnail).toBe(TEST_THUMBNAIL);
  });

  it('finds the pack inside one wrapper folder', () => {
    const wrapped = new Map<string, Uint8Array>();
    for (const [path, data] of testPackFiles()) wrapped.set(`acme-blocks/${path}`, data);
    expect(parsePackFiles(wrapped).blocks).toHaveLength(1);
  });

  it('rejects files without a pack.json', () => {
    const { errors } = parsePackFiles(filesWithout('pack.json'));
    expect(errors[0]?.message).toContain('has no pack.json');
  });

  it('names the pack.json property that is wrong and loads no blocks', () => {
    const files = testPackFiles([quoteCardBlock()], { ...testPackInfo(), version: 'one' });
    const result = parsePackFiles(files);
    expect(result.blocks).toEqual([]);
    expect(result.errors.map(({ field }) => field)).toEqual(['pack.json version']);
  });

  it('reports invalid JSON with its line', () => {
    const files = new Map(testPackFiles());
    files.set(
      'quote-card/block.json',
      new TextEncoder().encode('{\n  "name": "Quote",\n  oops\n}'),
    );
    expect(parsePackFiles(files).errors).toEqual([
      {
        block: 'quote-card',
        field: 'block.json',
        line: 3,
        message: expect.stringContaining('is not valid JSON'),
      },
    ]);
  });

  it('names the block and file of every problem and keeps the valid blocks', () => {
    const broken = {
      ...quoteCardBlock(
        { category: 'widgets', fields: fieldsWith('quote', { type: 'poem' }) },
        'broken',
      ),
      thumbnail: new TextEncoder().encode('<svg/>'),
    };
    const result = parsePackFiles(testPackFiles([quoteCardBlock(), broken]));
    expect(result.blocks.map(({ definition }) => definition.id)).toEqual(['acme/quote-card']);
    expect(result.errors).toEqual([
      {
        block: 'broken',
        field: 'category',
        line: null,
        message: expect.stringContaining('must be one of'),
      },
      {
        block: 'broken',
        field: 'quote.type',
        line: null,
        message: expect.stringContaining('must be one of'),
      },
      {
        block: 'broken',
        field: 'thumbnail.webp',
        line: null,
        message: 'is missing or not a WebP image',
      },
    ]);
  });

  it('needs a template and styles for every block', () => {
    const { errors } = parsePackFiles(filesWithout('quote-card/template.hbs'));
    expect(errors).toEqual([
      { block: 'quote-card', field: 'template.hbs', line: null, message: 'is missing or empty' },
    ]);
  });

  it('needs kebab-case block folders', () => {
    const errors = parsePackFiles(testPackFiles([quoteCardBlock({}, 'Quote_Card')])).errors;
    expect(errors[0]?.message).toContain('kebab-case folder name');
  });

  it('checks that defaults fit their field type', () => {
    expect(errorsWith({ fields: fieldsWith('showAuthor', { default: 'yes' }) })).toEqual([
      {
        block: 'quote-card',
        field: 'showAuthor.default',
        line: null,
        message: 'Choose on or off',
      },
    ]);
  });

  it('checks list items and their limits', () => {
    const errors = errorsWith({ fields: fieldsWith('points', { default: [] }) });
    expect(errors[0]).toMatchObject({ field: 'points.default', message: 'needs at least 1 items' });
  });

  it('refuses field names templates already use', () => {
    const errors = errorsWith({ fields: fieldsWith('author', { name: 'href' }) });
    expect(errors.some(({ message }) => message.includes('templates use that name'))).toBe(true);
  });

  it('refuses a required field with an empty default and unknown visibleWhen fields', () => {
    const errors = errorsWith({
      fields: fieldsWith('quote', {
        default: '',
        visibleWhen: { field: 'missing', equals: true },
      }),
    });
    expect(errors.map(({ field }) => field)).toEqual(['quote.default', 'quote.visibleWhen']);
  });

  it('allows one level of nested lists and no deeper', () => {
    const nested = (depth: number): Record<string, unknown> => ({
      name: `level${depth}`,
      label: 'Level',
      type: 'list',
      default: [],
      itemFields:
        depth > 1
          ? [nested(depth - 1)]
          : [{ name: 'text', label: 'Text', type: 'text', default: '' }],
    });
    expect(errorsWith({ fields: [nested(2)] })).toEqual([]);
    expect(errorsWith({ fields: [nested(3)] })[0]?.message).toContain('too deeply');
  });

  it('normalizes rich text defaults', () => {
    const files = testPackFiles([
      quoteCardBlock({
        fields: [
          {
            name: 'intro',
            label: 'Intro',
            type: 'richtext',
            default: '<p onclick="x()">Hi <script>bad()</script><b>there</b></p>',
          },
        ],
      }),
    ]);
    const field = parsePackFiles(files).blocks[0]?.definition.fields[0];
    expect(field?.default).toBe('<p>Hi <strong>there</strong></p>');
  });
});

describe('compareVersions', () => {
  it('orders versions by major, minor and patch numbers', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBeLessThan(0);
  });
});

describe('component ids and root classes', () => {
  it('namespaces pack blocks and keeps built-in ids bare', () => {
    expect(componentIdOf('acme', 'quote-card')).toBe('acme/quote-card');
    expect(componentIdOf('builtin', 'hero-centered')).toBe('hero-centered');
  });

  it('joins the pack and block ids in the root class', () => {
    expect(rootClassOf('acme/quote-card')).toBe('b-acme-quote-card');
    expect(rootClassOf('hero-centered')).toBe('b-hero-centered');
  });
});

describe('parseEmbeddedBlocks', () => {
  it('reads blocks saved in a project and drops broken ones', () => {
    const [packBlock] = parsePackFiles(testPackFiles()).blocks;
    if (packBlock === undefined) throw new Error('fixture pack did not parse');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const saved = JSON.parse(
      JSON.stringify({
        'acme/quote-card': packBlock,
        'acme/broken': { ...packBlock, template: 3 },
        'other/quote-card': packBlock,
      }),
    );
    expect(parseEmbeddedBlocks(saved)).toEqual({ 'acme/quote-card': packBlock });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
