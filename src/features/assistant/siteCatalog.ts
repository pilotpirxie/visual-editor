import { slotForCategory } from '../../app/blockLists';
import { asListItems, isImageValue } from '../../components/fields';
import { builtInComponents } from '../../components/registry';
import {
  CATEGORIES,
  type Category,
  type ComponentDefinition,
  type Field,
} from '../../components/types';
import { LOCKED_FIELD_NAMES } from './siteValues';

export const HIDDEN_CATEGORIES: readonly Category[] = ['modals', 'cookies'];

const EXAMPLE_ITEMS = 2;

export function siteBlock(blockId: string): ComponentDefinition | null {
  const definition = builtInComponents.get(blockId)?.definition;
  if (definition === undefined || HIDDEN_CATEGORIES.includes(definition.category)) return null;
  return definition;
}

export function isPageBlock(definition: ComponentDefinition): boolean {
  return slotForCategory(definition.category) === null;
}

export function catalogText(): string {
  const byCategory = new Map<Category, string[]>();
  for (const { definition } of builtInComponents.values()) {
    if (HIDDEN_CATEGORIES.includes(definition.category)) continue;
    const lines = byCategory.get(definition.category) ?? [];
    lines.push(`${definition.id}: ${definition.name}. ${definition.description ?? ''}`.trim());
    byCategory.set(definition.category, lines);
  }
  const groups: string[] = [];
  for (const category of CATEGORIES) {
    const lines = byCategory.get(category.id);
    if (lines === undefined) continue;
    groups.push(`## ${category.label} (category "${category.id}")\n${lines.join('\n')}`);
  }
  return groups.join('\n\n');
}

function exampleOf(field: Field, value: unknown): unknown {
  if (field.type === 'image' && isImageValue(value)) {
    const placeholder = value.source === 'placeholder' ? value.placeholder : null;
    return { alt: value.alt, subject: placeholder?.subject, ratio: placeholder?.ratio };
  }
  if (field.type !== 'list' || !Array.isArray(value)) return value;
  const items: unknown[] = [];
  for (const item of asListItems(value).slice(0, EXAMPLE_ITEMS)) {
    const example: Record<string, unknown> = {};
    for (const itemField of field.itemFields ?? []) {
      example[itemField.name] = exampleOf(itemField, item[itemField.name]);
    }
    items.push(example);
  }
  return items;
}

function fieldBrief(field: Field, hasExample: boolean): Record<string, unknown> {
  const brief: Record<string, unknown> = { name: field.name, type: field.type, label: field.label };
  if (field.required === true) brief.required = true;
  if (field.options !== undefined) brief.options = field.options.map(({ value }) => value);
  if (field.maxLength !== undefined) brief.maxLength = field.maxLength;
  if (field.allowHeadings === true) brief.allowHeadings = true;
  if (field.min !== undefined) brief.min = field.min;
  if (field.max !== undefined) brief.max = field.max;
  if (hasExample) brief.example = exampleOf(field, field.default);
  if (field.type !== 'list') return brief;
  if (field.minItems !== undefined) brief.minItems = field.minItems;
  if (field.maxItems !== undefined) brief.maxItems = field.maxItems;
  brief.usualCount = Array.isArray(field.default) ? field.default.length : 0;
  brief.itemFields = fieldBriefs(field.itemFields ?? [], false);
  return brief;
}

function fieldBriefs(fields: readonly Field[], hasExamples: boolean): Record<string, unknown>[] {
  const briefs: Record<string, unknown>[] = [];
  for (const field of fields) {
    if (!LOCKED_FIELD_NAMES.includes(field.name)) briefs.push(fieldBrief(field, hasExamples));
  }
  return briefs;
}

export function blockBrief(definition: ComponentDefinition): Record<string, unknown> {
  return {
    block: definition.id,
    name: definition.name,
    fields: fieldBriefs(definition.fields, true),
  };
}
