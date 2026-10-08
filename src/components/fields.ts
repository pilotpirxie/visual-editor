import { isSafeUrl } from '../render/sanitize';
import { cachedByText } from '../render/textCache';
import {
  BUTTON_VARIANTS,
  LINK_TYPES,
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  UPLOADED_IMAGE_TYPES,
  type ButtonValue,
  type ComponentDefinition,
  type Field,
  type ImageValue,
  type LinkValue,
} from './types';

export type FieldGroup = { name: string; fields: Field[] };

export type ListItem = Record<string, unknown>;

const UNGROUPED = 'General';
const COLOR_TOKEN = /^var\(--[a-z0-9-]+\)$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const UPLOAD_CHECK_CACHE_SIZE = 20;
const ISO_DATE = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const HTML_TAG = /<[^>]*>/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{3,}$/;
export const ICON_REF = /^(?:[a-z0-9-]+:)?[a-z0-9-]+$/;

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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asListItems(value: unknown): ListItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
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

const isUploadedImageSrc = cachedByText(UPLOAD_CHECK_CACHE_SIZE, (src) => {
  for (const type of UPLOADED_IMAGE_TYPES) {
    const prefix = `data:${type};base64,`;
    if (src.startsWith(prefix)) return BASE64.test(src.slice(prefix.length));
  }
  return false;
});

export function isImageValue(value: unknown): value is ImageValue {
  if (typeof value !== 'object' || value === null) return false;
  if (!('source' in value) || !('src' in value) || !('alt' in value)) return false;
  if (!('decorative' in value) || !('width' in value) || !('height' in value)) return false;
  if (typeof value.src !== 'string' || typeof value.alt !== 'string') return false;
  if (typeof value.decorative !== 'boolean') return false;
  if (!Number.isFinite(value.width) || !Number.isFinite(value.height)) return false;
  if (value.source === 'upload') {
    return 'name' in value && typeof value.name === 'string' && isUploadedImageSrc(value.src);
  }
  if (value.source !== 'placeholder' || !('placeholder' in value)) return false;
  const { placeholder } = value;
  if (typeof placeholder !== 'object' || placeholder === null) return false;
  if (!('ratio' in placeholder) || !('subject' in placeholder)) return false;
  return (
    PLACEHOLDER_RATIOS.some((ratio) => ratio === placeholder.ratio) &&
    PLACEHOLDER_SUBJECTS.some((subject) => subject === placeholder.subject)
  );
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

export function isLinkValue(value: unknown): value is LinkValue {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value) || !('newTab' in value)) return false;
  const isKnownType = LINK_TYPES.some((type) => type === value.type);
  return (
    isKnownType &&
    typeof value.newTab === 'boolean' &&
    isOptionalString('pageId' in value ? value.pageId : undefined) &&
    isOptionalString('anchor' in value ? value.anchor : undefined) &&
    isOptionalString('url' in value ? value.url : undefined)
  );
}

export function isButtonValue(value: unknown): value is ButtonValue {
  if (typeof value !== 'object' || value === null) return false;
  if (!('label' in value) || !('link' in value) || !('variant' in value)) return false;
  const isKnownVariant = BUTTON_VARIANTS.some((variant) => variant === value.variant);
  return typeof value.label === 'string' && isLinkValue(value.link) && isKnownVariant;
}

function linkError(value: unknown): string | null {
  if (!isLinkValue(value)) return 'Choose where the link goes';
  const address = value.url?.trim() ?? '';
  if (address === '') return null;
  if (value.type === 'url' && !isSafeUrl(address)) {
    return 'This address cannot be used as a link';
  } else if (value.type === 'email' && !EMAIL.test(address)) {
    return 'Enter an email address like hello@example.com';
  } else if (value.type === 'phone' && !PHONE.test(address)) {
    return 'Enter a phone number using digits, spaces and + ( ) -';
  } else {
    return null;
  }
}

function buttonError(value: unknown): string | null {
  if (!isButtonValue(value)) return 'Set up the button';
  if (value.label.trim() === '') return 'Enter the button label';
  return linkError(value.link);
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

function lengthError(field: Field, value: string): string | null {
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return `Use at most ${field.maxLength} characters`;
  }
  return null;
}

function rangeError(field: Field, value: number): string | null {
  if (field.min !== undefined && value < field.min) return `Use ${field.min} or more`;
  if (field.max !== undefined && value > field.max) return `Use ${field.max} or less`;
  return null;
}

function validateOption(field: Field, value: unknown): string | null {
  const isKnownOption = field.options?.some((option) => option.value === value) ?? false;
  return isKnownOption ? null : 'Choose one of the options';
}

function typeError(field: Field, value: unknown): string | null {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'richtext':
      return typeof value === 'string' ? null : 'Enter some text';
    case 'date':
      return typeof value === 'string' ? null : 'Enter a valid date';
    case 'icon':
      return typeof value === 'string' && (value === '' || ICON_REF.test(value))
        ? null
        : 'Choose an icon like star or lucide:star';
    case 'number':
    case 'range':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'Enter a number';
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Choose on or off';
    case 'select':
    case 'segmented':
      return validateOption(field, value);
    case 'color':
      return isColorValue(value) ? null : 'Choose a design color or a hex color like #4f46e5';
    case 'image':
      return isImageValue(value) ? null : 'Choose an image';
    case 'link':
      return isLinkValue(value) ? null : 'Choose where the link goes';
    case 'button':
      return isButtonValue(value) ? null : 'Set up the button';
    case 'list':
      return Array.isArray(value) && value.every(isRecord) ? null : 'Add a list of items';
    default: {
      const unknownType: never = field.type;
      throw new Error(`Unknown field type "${String(unknownType)}"`);
    }
  }
}

function constraintError(field: Field, value: unknown): string | null {
  if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
    return lengthError(field, value);
  }
  if ((field.type === 'number' || field.type === 'range') && typeof value === 'number') {
    return rangeError(field, value);
  }
  if (field.type === 'date' && typeof value === 'string') {
    if (value === '' && !field.required) return null;
    return isValidDate(value) ? null : 'Enter a valid date';
  }
  if (field.type === 'image' && isImageValue(value)) {
    const isMissingAlt = !value.decorative && value.alt.trim() === '';
    return isMissingAlt ? 'Add alt text or mark the image as decorative' : null;
  }
  if (field.type === 'link') return linkError(value);
  if (field.type === 'button') return buttonError(value);
  return null;
}

export function fitsField(field: Field, value: unknown): boolean {
  return typeError(field, value) === null;
}

export function validateField(field: Field, value: unknown): string | null {
  if (field.required && isBlank(field, value)) return 'This field is required';
  return typeError(field, value) ?? constraintError(field, value);
}
