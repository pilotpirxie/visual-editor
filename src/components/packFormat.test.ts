import { describe, expect, it, vi } from 'vitest';
import { quoteCardBlockJson, testPackJson } from '../test/packFixtures';
import {
  compareVersions,
  customRootClass,
  parseEmbeddedDefinitions,
  parsePackFile,
  toPackFileJson,
  type PackError,
} from './packFormat';

const BEHAVIORS = ['menu', 'tabs'];

function withBlockChanges(changes: Record<string, unknown>): Record<string, unknown> {
  return testPackJson([{ ...quoteCardBlockJson(), ...changes }]);
}

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

function errorsOf(pack: unknown): PackError[] {
  return parsePackFile(pack, BEHAVIORS).errors;
}

describe('parsePackFile', () => {
  it('reads a valid pack into namespaced definitions', () => {
    const { info, blocks, errors } = parsePackFile(testPackJson(), BEHAVIORS);
    expect(errors).toEqual([]);
    expect(info).toEqual({
      id: 'acme',
      name: 'Acme blocks',
      version: '1.0.0',
      author: 'Acme Studio',
      license: 'MIT',
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.definition.id).toBe('acme/quote-card');
    expect(blocks[0]?.definition.category).toBe('testimonials');
    expect(blocks[0]?.fieldRenames).toEqual({});
  });

  it('names the pack property that is wrong and loads no blocks', () => {
    const pack = { ...testPackJson(), format: 'other', version: 'one', blocks: [] };
    const result = parsePackFile(pack, BEHAVIORS);
    expect(result.blocks).toEqual([]);
    expect(result.errors.map(({ field }) => field)).toEqual(['version', 'format', 'blocks']);
  });

  it('rejects a file that is not an object', () => {
    expect(errorsOf([1, 2])[0]?.message).toContain('not a block pack');
  });

  it('names the block and field of every problem and keeps the valid blocks', () => {
    const broken = {
      ...quoteCardBlockJson(),
      id: 'broken',
      category: 'widgets',
      behaviors: ['confetti'],
      thumbnail: 'https://example.com/a.png',
      fields: fieldsWith('quote', { type: 'poem' }),
    };
    const result = parsePackFile(testPackJson([quoteCardBlockJson(), broken]), BEHAVIORS);
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
        field: 'behaviors',
        line: null,
        message: '"confetti" is not a site runtime behavior',
      },
      {
        block: 'broken',
        field: 'thumbnail',
        line: null,
        message: expect.stringContaining('data URL'),
      },
    ]);
  });

  it('checks that defaults fit their field type', () => {
    const errors = errorsOf(
      withBlockChanges({
        fields: fieldsWith('showAuthor', { default: 'yes' }),
      }),
    );
    expect(errors).toEqual([
      {
        block: 'quote-card',
        field: 'showAuthor.default',
        line: null,
        message: 'must be true or false',
      },
    ]);
  });

  it('checks list items and their limits', () => {
    const errors = errorsOf(withBlockChanges({ fields: fieldsWith('points', { default: [] }) }));
    expect(errors[0]).toMatchObject({ field: 'points.default', message: 'needs at least 1 items' });
  });

  it('refuses field names templates already use', () => {
    const errors = errorsOf(withBlockChanges({ fields: fieldsWith('author', { name: 'href' }) }));
    expect(errors.some(({ message }) => message.includes('templates use that name'))).toBe(true);
  });

  it('refuses a required field with an empty default and unknown visibleWhen fields', () => {
    const errors = errorsOf(
      withBlockChanges({
        fields: fieldsWith('quote', {
          default: '',
          visibleWhen: { field: 'missing', equals: true },
        }),
      }),
    );
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
    expect(errorsOf(withBlockChanges({ fields: [nested(2)] }))).toEqual([]);
    expect(errorsOf(withBlockChanges({ fields: [nested(3)] }))[0]?.message).toContain('too deeply');
  });

  it('checks that field renames point to fields that exist', () => {
    const errors = errorsOf(
      withBlockChanges({ fieldRenames: { headline: 'title', author: 'quote' } }),
    );
    expect(errors.map(({ field }) => field)).toEqual([
      'fieldRenames.headline',
      'fieldRenames.author',
    ]);
  });

  it('reports blocks that share an id', () => {
    const errors = errorsOf(testPackJson([quoteCardBlockJson(), quoteCardBlockJson()]));
    expect(errors).toEqual([
      {
        block: 'acme/quote-card',
        field: 'id',
        line: null,
        message: 'is used by another block in this pack',
      },
    ]);
  });

  it('normalizes rich text defaults', () => {
    const pack = withBlockChanges({
      fields: [
        {
          name: 'intro',
          label: 'Intro',
          type: 'richtext',
          default: '<p onclick="x()">Hi <script>bad()</script><b>there</b></p>',
        },
      ],
    });
    const field = parsePackFile(pack, BEHAVIORS).blocks[0]?.definition.fields[0];
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

describe('customRootClass', () => {
  it('joins the pack and block ids', () => {
    expect(customRootClass('acme/quote-card')).toBe('b-acme-quote-card');
  });
});

describe('parseEmbeddedDefinitions', () => {
  it('reads definitions saved in a project and drops broken ones', () => {
    const [definition] = parsePackFile(testPackJson(), BEHAVIORS).blocks;
    if (definition === undefined) throw new Error('fixture pack did not parse');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const saved = JSON.parse(
      JSON.stringify({
        'acme/quote-card': definition,
        'acme/broken': { ...definition, template: 3 },
        'other/quote-card': definition,
      }),
    );
    expect(parseEmbeddedDefinitions(saved, BEHAVIORS)).toEqual({ 'acme/quote-card': definition });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('toPackFileJson', () => {
  it('writes a pack that reads back the same', () => {
    const { info, blocks } = parsePackFile(testPackJson(), BEHAVIORS);
    if (info === null) throw new Error('fixture pack did not parse');
    expect(parsePackFile(toPackFileJson(info, blocks), BEHAVIORS).blocks).toEqual(blocks);
  });
});
