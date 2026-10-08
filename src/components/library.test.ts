import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import { ensureIconSets } from '../features/icons/ensureIconSets';
import { isSemanticIcon, parseIconRef, resolveIcon } from '../render/icons';
import { createRenderContext, renderBlock } from '../render/renderBlock';
import { loadTemplateParser, type ParseTemplate } from '../render/templateParser';
import { asListItems } from './fields';
import { BUILT_IN_PACK, parsePackFiles, thumbnailBytes } from './packFormat';
import { builtInComponents, createBlock } from './registry';
import type { ComponentDefinition, Field } from './types';
import { checkPackBlock } from './validatePack';

const LIBRARY = join(import.meta.dirname, 'library');
const MAX_THUMBNAIL_BYTES = 80 * 1024;
const ctx = createRenderContext(createSampleProject(), 'canvas');

type IconDefault = { field: Field; ref: string };

function libraryFiles(): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const entry of readdirSync(LIBRARY, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(relative(LIBRARY, path), readFileSync(path));
  }
  return files;
}

function iconDefaults(definition: ComponentDefinition): IconDefault[] {
  const defaults: IconDefault[] = [];
  for (const field of definition.fields) {
    if (field.type === 'icon' && typeof field.default === 'string') {
      defaults.push({ field, ref: field.default });
    }
    if (field.type !== 'list') continue;
    for (const itemField of field.itemFields ?? []) {
      if (itemField.type !== 'icon') continue;
      if (typeof itemField.default === 'string')
        defaults.push({ field: itemField, ref: itemField.default });
      for (const item of asListItems(field.default)) {
        const ref = item[itemField.name];
        if (typeof ref === 'string' && ref !== '') defaults.push({ field: itemField, ref });
      }
    }
  }
  return defaults;
}

const parsed = parsePackFiles(libraryFiles());

let parse: ParseTemplate;

beforeAll(async () => {
  parse = await loadTemplateParser();
  await ensureIconSets(['lucide', 'simple-icons']);
});

describe('the built-in pack', () => {
  it('reads like any block pack', () => {
    expect(parsed.errors).toEqual([]);
    expect(parsed.info).toEqual(BUILT_IN_PACK);
    expect(parsed.blocks.map(({ definition }) => definition.id).sort()).toEqual(
      [...builtInComponents.keys()].sort(),
    );
  });
});

describe.each(parsed.blocks)('block $definition.id', (packBlock) => {
  const { definition } = packBlock;

  it('passes the same checks as a block pack', () => {
    const check = checkPackBlock(packBlock, parse);
    expect(check.errors).toEqual([]);
  });

  it('is registered exactly as its folder describes it', () => {
    expect(builtInComponents.get(definition.id)?.definition).toEqual(definition);
  });

  it('renders only icons that exist in the default icon set', () => {
    const component = builtInComponents.get(definition.id);
    if (component === undefined) throw new Error(`${definition.id} is not registered`);
    const warn = vi.spyOn(console, 'warn');
    renderBlock(createBlock(definition), component, ctx);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('starts with semantic icons, logos from allowed sets and brands only in brand fields', () => {
    for (const { field, ref } of iconDefaults(definition)) {
      expect(resolveIcon(ref), `${field.name}: ${ref}`).not.toBeNull();
      const { set } = parseIconRef(ref);
      if (set === null) expect(isSemanticIcon(ref), `${field.name}: ${ref}`).toBe(true);
      if (field.iconPurpose === 'logo') {
        expect(set, field.name).not.toBeNull();
        expect(['remix', 'simple-icons']).not.toContain(set);
      }
      if (set === 'simple-icons') expect(field.iconPurpose, field.name).toBe('brand');
    }
  });

  it('uses design tokens instead of literal colors', () => {
    expect(packBlock.styles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(packBlock.styles).not.toMatch(/\b(rgba?|hsla?)\(/);
  });

  it('keeps its thumbnail small (run yarn thumbnails:update)', () => {
    expect(thumbnailBytes(packBlock.thumbnail).length).toBeLessThanOrEqual(MAX_THUMBNAIL_BYTES);
  });
});
