import {
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  type ComponentDefinition,
  type Field,
  type ImageValue,
} from './types';

export type FieldGroup = { name: string; fields: Field[] };

export type ListItem = Record<string, unknown>;

const UNGROUPED = 'General';
const COLOR_TOKEN = /^var\(--[a-z0-9-]+\)$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ISO_DATE = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const HTML_TAG = /<[^>]*>/g;

export function defaultValues(fields: Field[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) values[field.name] = structuredClone(field.default);
  return values;
}

export function groupFields(definition: ComponentDefinition): FieldGroup[] {
  const groups = new Map<string, Field[]>();
  for (const name of definition.fieldGroups ?? []) groups.set(name, []);
  const ungrouped: Field[] = [];
  for (const field of definition.fields) {
    if (field.group === undefined) {
      ungrouped.push(field);
      continue;
    }
    const fields = groups.get(field.group) ?? [];
    fields.push(field);
    groups.set(field.group, fields);
  }
  const generalFields = groups.get(UNGROUPED) ?? [];
  groups.set(UNGROUPED, [...generalFields, ...ungrouped]);
  const nonEmptyGroups: FieldGroup[] = [];
  for (const [name, fields] of groups) {
    if (fields.length > 0) nonEmptyGroups.push({ name, fields });
  }
  return nonEmptyGroups;
}

export function isFieldVisible(field: Field, values: Record<string, unknown>): boolean {
  if (field.visibleWhen === undefined) return true;
  return values[field.visibleWhen.field] === field.visibleWhen.equals;
}

function isListItem(value: unknown): value is ListItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asListItems(value: unknown): ListItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isListItem);
}

export function canAddItem(field: Field, items: readonly ListItem[]): boolean {
  return field.maxItems === undefined || items.length < field.maxItems;
}

export function canRemoveItem(field: Field, items: readonly ListItem[]): boolean {
  return items.length > (field.minItems ?? 0);
}

export function addItem(field: Field, items: readonly ListItem[]): ListItem[] {
  if (!canAddItem(field, items)) return [...items];
  return [...items, defaultValues(field.itemFields ?? [])];
}

export function removeItem(field: Field, items: readonly ListItem[], index: number): ListItem[] {
  if (!canRemoveItem(field, items)) return [...items];
  return items.filter((_item, itemIndex) => itemIndex !== index);
}

export function duplicateItem(field: Field, items: readonly ListItem[], index: number): ListItem[] {
  const source = items[index];
  if (source === undefined || !canAddItem(field, items)) return [...items];
  return [...items.slice(0, index + 1), structuredClone(source), ...items.slice(index + 1)];
}

export function moveItem(items: readonly ListItem[], from: number, to: number): ListItem[] {
  const moved = [...items];
  const target = Math.min(Math.max(to, 0), items.length - 1);
  const [item] = moved.splice(from, 1);
  if (item === undefined) return moved;
  moved.splice(target, 0, item);
  return moved;
}

export function replaceItem(items: readonly ListItem[], index: number, item: ListItem): ListItem[] {
  return items.map((existing, itemIndex) => (itemIndex === index ? item : existing));
}

export function itemTitle(field: Field, item: ListItem, index: number): string {
  const fallbackTitle = `Item ${index + 1}`;
  if (field.itemLabel === undefined) return fallbackTitle;
  const label = item[field.itemLabel];
  if (typeof label === 'string' && label.trim() !== '') return label;
  return fallbackTitle;
}

export function isColorValue(value: unknown): value is string {
  return typeof value === 'string' && (COLOR_TOKEN.test(value) || HEX_COLOR.test(value));
}

export function isImageValue(value: unknown): value is ImageValue {
  if (typeof value !== 'object' || value === null) return false;
  if (!('source' in value) || !('src' in value) || !('alt' in value)) return false;
  if (!('decorative' in value) || !('width' in value) || !('height' in value)) return false;
  if (!('placeholder' in value)) return false;
  const { placeholder } = value;
  if (typeof placeholder !== 'object' || placeholder === null) return false;
  if (!('ratio' in placeholder) || !('subject' in placeholder)) return false;
  return (
    value.source === 'placeholder' &&
    typeof value.src === 'string' &&
    typeof value.alt === 'string' &&
    typeof value.decorative === 'boolean' &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    PLACEHOLDER_RATIOS.some((ratio) => ratio === placeholder.ratio) &&
    PLACEHOLDER_SUBJECTS.some((subject) => subject === placeholder.subject)
  );
}

function isValidDate(value: string): boolean {
  const groups = ISO_DATE.exec(value)?.groups;
  if (groups === undefined) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    date.getUTCFullYear() === Number(groups.year) &&
    date.getUTCMonth() + 1 === Number(groups.month) &&
    date.getUTCDate() === Number(groups.day)
  );
}

function isBlank(field: Field, value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  const text = field.type === 'richtext' ? value.replace(HTML_TAG, '') : value;
  return text.trim() === '';
}

function validateText(field: Field, value: unknown): string | null {
  if (typeof value !== 'string') return 'Enter some text';
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return `Use at most ${field.maxLength} characters`;
  }
  return null;
}

function validateNumber(field: Field, value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Enter a number';
  if (field.min !== undefined && value < field.min) return `Use ${field.min} or more`;
  if (field.max !== undefined && value > field.max) return `Use ${field.max} or less`;
  return null;
}

function validateOption(field: Field, value: unknown): string | null {
  const isKnownOption = field.options?.some((option) => option.value === value) ?? false;
  return isKnownOption ? null : 'Choose one of the options';
}

export function validateField(field: Field, value: unknown): string | null {
  if (field.required && isBlank(field, value)) return 'This field is required';

  switch (field.type) {
    case 'text':
    case 'textarea':
      return validateText(field, value);
    case 'number':
    case 'range':
      return validateNumber(field, value);
    case 'select':
    case 'segmented':
      return validateOption(field, value);
    case 'date': {
      if (value === '' && !field.required) return null;
      const isDate = typeof value === 'string' && isValidDate(value);
      return isDate ? null : 'Enter a valid date';
    }
    case 'color':
      return isColorValue(value) ? null : 'Choose a design color or a hex color like #4f46e5';
    case 'image':
      if (!isImageValue(value)) return 'Choose an image';
      if (!value.decorative && value.alt.trim() === '') {
        return 'Add alt text or mark the image as decorative';
      }
      return null;
    case 'richtext':
    case 'boolean':
    case 'icon':
    case 'link':
    case 'button':
    case 'list':
      return null;
    default: {
      const unknownType: never = field.type;
      throw new Error(`Unknown field type "${String(unknownType)}"`);
    }
  }
}
