import { behaviors } from 'virtual:site-runtime';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import { ensureIconSets } from '../features/icons/ensureIconSets';
import { isSemanticIcon, parseIconRef, resolveIcon } from '../render/icons';
import { createRenderContext, renderBlock } from '../render/renderBlock';
import { createBlock, registry } from './registry';
import { asListItems } from './fields';
import { CATEGORIES, type ComponentDefinition, type Field } from './types';

const ROOT_TAGS = ['section', 'header', 'nav', 'footer', 'aside', 'div'];
const CATEGORY_IDS: string[] = CATEGORIES.map(({ id }) => id);
const ctx = createRenderContext(createSampleProject(), 'canvas');

type IconDefault = { field: Field; ref: string };

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

beforeAll(async () => {
  await ensureIconSets(['lucide', 'simple-icons']);
});

describe.each([...registry.values()])(
  'component $definition.id',
  ({ definition, template, styles }) => {
    it('has a kebab-case id and a known category', () => {
      expect(definition.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(CATEGORY_IDS).toContain(definition.category);
    });

    it('renders its defaults into exactly one root element with class b-<id>', () => {
      const block = createBlock(definition);
      const html = renderBlock(block, { definition, template, styles, thumbnail: '' }, ctx);
      const container = document.createElement('template');
      container.innerHTML = html;
      const roots = container.content.children;
      expect(roots).toHaveLength(1);
      expect(ROOT_TAGS).toContain(roots[0].localName);
      expect(roots[0].classList).toContain(`b-${definition.id}`);
    });

    it('renders only icons that exist in the default icon set', () => {
      const warn = vi.spyOn(console, 'warn');
      renderBlock(createBlock(definition), { definition, template, styles, thumbnail: '' }, ctx);
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

    it('has default values for required fields and valid visibleWhen references', () => {
      const names = definition.fields.map(({ name }) => name);
      for (const field of definition.fields) {
        if (field.required) expect(field.default, field.name).toBeTruthy();
        if (field.visibleWhen) expect(names).toContain(field.visibleWhen.field);
      }
    });

    it('scopes its CSS to its own root inside the components layer', () => {
      expect(styles.trim().startsWith('@layer components {')).toBe(true);
      expect(styles.match(/@scope\b/g)).toHaveLength(1);
      expect(styles).toContain(`@scope (.b-${definition.id})`);
    });

    it('uses design tokens instead of literal colors and never uses !important', () => {
      expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(styles).not.toMatch(/\b(rgba?|hsla?)\(/);
      expect(styles).not.toContain('!important');
    });

    it('pairs a form action URL with a method', () => {
      const names = definition.fields.map(({ name }) => name);
      expect(names.includes('formAction')).toBe(names.includes('formMethod'));
    });

    it('only uses behaviors the site runtime provides', () => {
      for (const name of definition.behaviors ?? []) expect(Object.keys(behaviors)).toContain(name);
    });
  },
);
