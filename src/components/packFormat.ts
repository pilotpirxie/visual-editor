import { isRecord } from '../persistence/parseBlock';
import { HANDLEBARS_BUILTIN_HELPERS, TEMPLATE_HELPERS } from '../render/helperNames';
import { normalizeRichText } from '../render/sanitize';
import { asListItems, validateField } from './fields';
import {
  CATEGORIES,
  type Category,
  type ComponentDefinition,
  type CustomDefinition,
  type Field,
  type FieldOption,
  type FieldType,
  type PackInfo,
} from './types';

export type PackError = {
  block: string | null;
  field: string | null;
  line: number | null;
  message: string;
};

export type ParsedPackBlock = { definition: CustomDefinition | null; errors: PackError[] };

export type ParsedPackFile = {
  info: PackInfo | null;
  blocks: CustomDefinition[];
  errors: PackError[];
};

type Report = (field: string | null, message: string) => void;

export const PACK_FORMAT = 'block-pack';
export const PACK_FORMAT_VERSION = 1;

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD_NAME = /^[a-z][a-zA-Z0-9]*$/;
const VERSION = /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)$/;
const TOKEN_NAME = /^--[a-z0-9-]+$/;
const THUMBNAIL = /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-z0-9+/]+={0,2}$/i;
const ICON_REF = /^(?:[a-z0-9-]+:)?[a-z0-9-]+$/;
const ICON_PURPOSES = ['logo', 'brand'] as const;
const MAX_LIST_DEPTH = 2;

const FIELD_TYPES: readonly FieldType[] = [
  'text',
  'textarea',
  'richtext',
  'number',
  'range',
  'boolean',
  'select',
  'segmented',
  'color',
  'image',
  'icon',
  'link',
  'button',
  'list',
  'date',
];

const RESERVED_FIELD_NAMES = new Set<string>([
  ...TEMPLATE_HELPERS,
  ...HANDLEBARS_BUILTIN_HELPERS,
  'block',
  'site',
  'this',
  'constructor',
  'prototype',
]);

export function customComponentId(packId: string, blockId: string): string {
  return `${packId}/${blockId}`;
}

export function customRootClass(componentId: string): string {
  return `b-${componentId.replace('/', '-')}`;
}

export function isPackVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION.test(value);
}

function versionParts(version: string): number[] {
  const groups = VERSION.exec(version)?.groups;
  if (groups === undefined) throw new Error(`"${version}" is not a version like 1.2.0`);
  return [Number(groups.major), Number(groups.minor), Number(groups.patch)];
}

export function compareVersions(left: string, right: string): number {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  for (const [index, part] of leftParts.entries()) {
    const difference = part - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function textAt(value: unknown, field: string, report: Report): string {
  if (typeof value === 'string' && value.trim() !== '') return value;
  report(field, 'must be text');
  return '';
}

function optionalTextAt(value: unknown, field: string, report: Report): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  report(field, 'must be text');
  return undefined;
}

function textListAt(value: unknown, field: string, report: Report): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    report(field, 'must be a list of text');
    return [];
  }
  return value;
}

function optionalTextListAt(value: unknown, field: string, report: Report): string[] | undefined {
  if (value === undefined) return undefined;
  return textListAt(value, field, report);
}

function wholeNumberAt(value: unknown, field: string, min: number, report: Report): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= min) return value;
  report(field, `must be a whole number of ${min} or more`);
  return min;
}

function optionalNumberAt(value: unknown, field: string, report: Report): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  report(field, 'must be a number');
  return undefined;
}

function optionalWholeNumberAt(value: unknown, field: string, report: Report): number | undefined {
  if (value === undefined) return undefined;
  return wholeNumberAt(value, field, 0, report);
}

function optionalBooleanAt(value: unknown, field: string, report: Report): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  report(field, 'must be true or false');
  return undefined;
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  field: string,
  report: Report,
): T | undefined {
  const match = options.find((option) => option === value);
  if (match === undefined) report(field, `must be one of ${options.join(', ')}`);
  return match;
}

function parseOptions(value: unknown, path: string, report: Report): FieldOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    report(`${path}.options`, 'must be a list of options');
    return [];
  }
  const options: FieldOption[] = [];
  const values = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const optionPath = `${path}.options[${index}]`;
    if (!isRecord(raw) || typeof raw.value !== 'string' || typeof raw.label !== 'string') {
      report(optionPath, 'needs a text value and label');
      continue;
    }
    if (values.has(raw.value)) report(optionPath, `repeats the value "${raw.value}"`);
    values.add(raw.value);
    const option: FieldOption = { value: raw.value, label: raw.label };
    const icon = optionalTextAt(raw.icon, `${optionPath}.icon`, report);
    if (icon !== undefined) option.icon = icon;
    options.push(option);
  }
  return options;
}

function iconProblem(value: unknown): string | null {
  if (typeof value !== 'string') return 'must be an icon name';
  if (value !== '' && !ICON_REF.test(value)) return 'must be an icon name like star or lucide:star';
  return null;
}

function valueProblem(field: Field, value: unknown): string | null {
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'must be true or false';
    case 'richtext':
      return typeof value === 'string' ? null : 'must be text';
    case 'icon':
      return iconProblem(value);
    case 'list':
      return listProblem(field, value);
    default:
      return validateField(field, value);
  }
}

function listProblem(field: Field, value: unknown): string | null {
  if (!Array.isArray(value) || !value.every(isRecord)) return 'must be a list of items';
  if (field.minItems !== undefined && value.length < field.minItems) {
    return `needs at least ${field.minItems} items`;
  }
  if (field.maxItems !== undefined && value.length > field.maxItems) {
    return `allows at most ${field.maxItems} items`;
  }
  for (const [index, item] of value.entries()) {
    for (const itemField of field.itemFields ?? []) {
      const problem = valueProblem(itemField, item[itemField.name] ?? itemField.default);
      if (problem !== null) return `item ${index + 1}: ${itemField.name} ${problem}`;
    }
  }
  return null;
}

function normalizedValue(field: Field, value: unknown): unknown {
  if (field.type === 'richtext' && typeof value === 'string') {
    return normalizeRichText(value, { allowHeadings: field.allowHeadings === true });
  }
  if (field.type !== 'list') return value;
  return asListItems(value).map((item) => {
    const normalized = { ...item };
    for (const itemField of field.itemFields ?? []) {
      if (itemField.name in normalized) {
        normalized[itemField.name] = normalizedValue(itemField, normalized[itemField.name]);
      }
    }
    return normalized;
  });
}

function addOptionalProperties(
  field: Field,
  raw: Record<string, unknown>,
  path: string,
  report: Report,
): void {
  const group = optionalTextAt(raw.group, `${path}.group`, report);
  if (group !== undefined) field.group = group;
  const help = optionalTextAt(raw.help, `${path}.help`, report);
  if (help !== undefined) field.help = help;
  const required = optionalBooleanAt(raw.required, `${path}.required`, report);
  if (required !== undefined) field.required = required;
  const min = optionalNumberAt(raw.min, `${path}.min`, report);
  if (min !== undefined) field.min = min;
  const max = optionalNumberAt(raw.max, `${path}.max`, report);
  if (max !== undefined) field.max = max;
  const step = optionalNumberAt(raw.step, `${path}.step`, report);
  if (step !== undefined) field.step = step;
  const maxLength = optionalWholeNumberAt(raw.maxLength, `${path}.maxLength`, report);
  if (maxLength !== undefined) field.maxLength = maxLength;
  const allowHeadings = optionalBooleanAt(raw.allowHeadings, `${path}.allowHeadings`, report);
  if (allowHeadings !== undefined) field.allowHeadings = allowHeadings;
  if (raw.iconPurpose !== undefined) {
    const purpose = oneOf(raw.iconPurpose, ICON_PURPOSES, `${path}.iconPurpose`, report);
    if (purpose !== undefined) field.iconPurpose = purpose;
  }
}

function addListProperties(
  field: Field,
  raw: Record<string, unknown>,
  path: string,
  depth: number,
  report: Report,
): void {
  if (depth > MAX_LIST_DEPTH) report(path, 'nests lists too deeply: one level of nesting only');
  field.itemFields = parseFields(raw.itemFields, path, depth + 1, report);
  const minItems = optionalWholeNumberAt(raw.minItems, `${path}.minItems`, report);
  if (minItems !== undefined) field.minItems = minItems;
  const maxItems = optionalWholeNumberAt(raw.maxItems, `${path}.maxItems`, report);
  if (maxItems !== undefined) field.maxItems = maxItems;
  if (minItems !== undefined && maxItems !== undefined && minItems > maxItems) {
    report(path, 'has minItems greater than maxItems');
  }
  const itemLabel = optionalTextAt(raw.itemLabel, `${path}.itemLabel`, report);
  if (itemLabel === undefined) return;
  if (!field.itemFields.some(({ name }) => name === itemLabel)) {
    report(`${path}.itemLabel`, `names no item field "${itemLabel}"`);
  }
  field.itemLabel = itemLabel;
}

function parseField(
  raw: Record<string, unknown>,
  path: string,
  depth: number,
  report: Report,
): Field | null {
  const type = oneOf(raw.type, FIELD_TYPES, `${path}.type`, report);
  if (type === undefined) return null;
  const name = typeof raw.name === 'string' ? raw.name : '';
  const field: Field = {
    name,
    label: textAt(raw.label, `${path}.label`, report),
    type,
    default: raw.default,
  };
  addOptionalProperties(field, raw, path, report);
  if (type === 'select' || type === 'segmented')
    field.options = parseOptions(raw.options, path, report);
  if (type === 'list') addListProperties(field, raw, path, depth, report);
  if (isRecord(raw.visibleWhen) && typeof raw.visibleWhen.field === 'string') {
    field.visibleWhen = { field: raw.visibleWhen.field, equals: raw.visibleWhen.equals };
  } else if (raw.visibleWhen !== undefined) {
    report(`${path}.visibleWhen`, 'needs a field name and a value');
  }
  if (raw.default === undefined) {
    report(`${path}.default`, 'is missing');
    return null;
  }
  const problem = valueProblem(field, raw.default);
  if (problem !== null) report(`${path}.default`, problem);
  field.default = normalizedValue(field, raw.default);
  return field;
}

function parseFields(value: unknown, parentPath: string, depth: number, report: Report): Field[] {
  const listPath = parentPath === '' ? 'fields' : `${parentPath}.itemFields`;
  if (!Array.isArray(value)) {
    report(listPath, 'must be a list of fields');
    return [];
  }
  const fields: Field[] = [];
  const names = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const rawName = isRecord(raw) && typeof raw.name === 'string' ? raw.name : `#${index + 1}`;
    const path = parentPath === '' ? rawName : `${parentPath}.${rawName}`;
    if (!isRecord(raw)) {
      report(path, 'is not a field');
      continue;
    }
    if (!FIELD_NAME.test(rawName)) {
      report(path, 'needs a camelCase name');
    } else if (RESERVED_FIELD_NAMES.has(rawName)) {
      report(path, `can't be named "${rawName}": templates use that name`);
    } else if (names.has(rawName)) {
      report(path, 'repeats a field name');
    }
    names.add(rawName);
    const field = parseField(raw, path, depth, report);
    if (field !== null) fields.push(field);
  }
  for (const field of fields) {
    const target = field.visibleWhen?.field;
    if (target !== undefined && !names.has(target)) {
      const path = parentPath === '' ? field.name : `${parentPath}.${field.name}`;
      report(`${path}.visibleWhen`, `names no field "${target}"`);
    }
  }
  return fields;
}

function parseFieldRenames(
  value: unknown,
  fields: Field[],
  report: Report,
): Record<string, string> {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    report('fieldRenames', 'must map old field names to new ones');
    return {};
  }
  const renames: Record<string, string> = {};
  const names = new Set(fields.map(({ name }) => name));
  for (const [from, to] of Object.entries(value)) {
    if (typeof to !== 'string' || !names.has(to)) {
      report(`fieldRenames.${from}`, `must name one of this block's fields`);
      continue;
    }
    if (names.has(from)) {
      report(`fieldRenames.${from}`, 'renames a field that still exists');
      continue;
    }
    renames[from] = to;
  }
  return renames;
}

function parseStyleOverrides(value: unknown, report: Report): string[] {
  const tokens = textListAt(value, 'styleOverrides', report);
  for (const token of tokens) {
    if (!TOKEN_NAME.test(token)) report('styleOverrides', `"${token}" is not a design token name`);
  }
  return tokens;
}

function parseBehaviors(
  value: unknown,
  behaviorNames: readonly string[],
  report: Report,
): string[] | undefined {
  const names = optionalTextListAt(value, 'behaviors', report);
  for (const name of names ?? []) {
    if (!behaviorNames.includes(name))
      report('behaviors', `"${name}" is not a site runtime behavior`);
  }
  return names;
}

export type PackBlockContext = { pack: PackInfo; behaviorNames: readonly string[]; index: number };

export function parsePackBlock(
  raw: unknown,
  { pack, behaviorNames, index }: PackBlockContext,
): ParsedPackBlock {
  const blockLabel =
    isRecord(raw) && typeof raw.id === 'string' && raw.id !== '' ? raw.id : `block ${index + 1}`;
  const errors: PackError[] = [];
  const report: Report = (field, message) => {
    errors.push({ block: blockLabel, field, line: null, message });
  };
  if (!isRecord(raw)) {
    report(null, 'is not an object');
    return { definition: null, errors };
  }
  if (typeof raw.id !== 'string' || !KEBAB_ID.test(raw.id))
    report('id', 'must be kebab-case, like hero-split');
  const version = wholeNumberAt(raw.version, 'version', 1, report);
  const name = textAt(raw.name, 'name', report);
  const category: Category | undefined = oneOf(
    raw.category,
    CATEGORIES.map(({ id }) => id),
    'category',
    report,
  );
  const description = optionalTextAt(raw.description, 'description', report);
  const tags = optionalTextListAt(raw.tags, 'tags', report);
  const fieldGroups = optionalTextListAt(raw.fieldGroups, 'fieldGroups', report);
  const fields = parseFields(raw.fields, '', 1, report);
  const template = textAt(raw.template, 'template', report);
  const styles = textAt(raw.styles, 'styles', report);
  const behaviors = parseBehaviors(raw.behaviors, behaviorNames, report);
  const styleOverrides = parseStyleOverrides(raw.styleOverrides, report);
  if (typeof raw.thumbnail !== 'string' || !THUMBNAIL.test(raw.thumbnail)) {
    report('thumbnail', 'must be a base64 PNG, JPEG, WebP or SVG data URL');
  }
  const fieldRenames = parseFieldRenames(raw.fieldRenames, fields, report);
  if (errors.length > 0 || category === undefined || typeof raw.id !== 'string') {
    return { definition: null, errors };
  }
  const definition: ComponentDefinition = {
    id: customComponentId(pack.id, raw.id),
    version,
    name,
    category,
    fields,
    styleOverrides,
  };
  if (description !== undefined) definition.description = description;
  if (tags !== undefined) definition.tags = tags;
  if (fieldGroups !== undefined) definition.fieldGroups = fieldGroups;
  if (behaviors !== undefined) definition.behaviors = behaviors;
  const thumbnail = String(raw.thumbnail);
  return { definition: { pack, definition, template, styles, thumbnail, fieldRenames }, errors };
}

export function parsePackInfo(raw: Record<string, unknown>): {
  info: PackInfo | null;
  errors: PackError[];
} {
  const errors: PackError[] = [];
  const report: Report = (field, message) => {
    errors.push({ block: null, field, line: null, message });
  };
  if (typeof raw.id !== 'string' || !KEBAB_ID.test(raw.id))
    report('id', 'must be kebab-case, like acme-marketing');
  if (!isPackVersion(raw.version)) report('version', 'must be a version like 1.2.0');
  const name = textAt(raw.name, 'name', report);
  const author = textAt(raw.author, 'author', report);
  const license = textAt(raw.license, 'license', report);
  if (errors.length > 0 || typeof raw.id !== 'string' || !isPackVersion(raw.version)) {
    return { info: null, errors };
  }
  return { info: { id: raw.id, name, version: raw.version, author, license }, errors };
}

export function parsePackFile(raw: unknown, behaviorNames: readonly string[]): ParsedPackFile {
  if (!isRecord(raw)) {
    const message = 'This file is not a block pack: it must hold one JSON object';
    return { info: null, blocks: [], errors: [{ block: null, field: null, line: null, message }] };
  }
  const { info, errors } = parsePackInfo(raw);
  if (raw.format !== PACK_FORMAT) {
    errors.push({ block: null, field: 'format', line: null, message: `must be "${PACK_FORMAT}"` });
  }
  if (raw.formatVersion !== PACK_FORMAT_VERSION) {
    const message = `must be ${PACK_FORMAT_VERSION}; this editor can't read other versions`;
    errors.push({ block: null, field: 'formatVersion', line: null, message });
  }
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    errors.push({
      block: null,
      field: 'blocks',
      line: null,
      message: 'must list at least one block',
    });
  }
  if (info === null || errors.length > 0 || !Array.isArray(raw.blocks)) {
    return { info, blocks: [], errors };
  }
  const blocks: CustomDefinition[] = [];
  const ids = new Set<string>();
  for (const [index, rawBlock] of raw.blocks.entries()) {
    const parsed = parsePackBlock(rawBlock, { pack: info, behaviorNames, index });
    errors.push(...parsed.errors);
    if (parsed.definition === null) continue;
    const id = parsed.definition.definition.id;
    if (ids.has(id)) {
      errors.push({
        block: id,
        field: 'id',
        line: null,
        message: 'is used by another block in this pack',
      });
      continue;
    }
    ids.add(id);
    blocks.push(parsed.definition);
  }
  return { info, blocks, errors };
}

export function packBlockId(custom: CustomDefinition): string {
  return custom.definition.id.slice(custom.pack.id.length + 1);
}

export function toPackBlockJson(custom: CustomDefinition): Record<string, unknown> {
  const { definition, template, styles, thumbnail, fieldRenames } = custom;
  return {
    ...definition,
    id: packBlockId(custom),
    template,
    styles,
    thumbnail,
    ...(Object.keys(fieldRenames).length > 0 ? { fieldRenames } : {}),
  };
}

export function toPackFileJson(
  pack: PackInfo,
  blocks: CustomDefinition[],
): Record<string, unknown> {
  return {
    format: PACK_FORMAT,
    formatVersion: PACK_FORMAT_VERSION,
    id: pack.id,
    name: pack.name,
    version: pack.version,
    author: pack.author,
    license: pack.license,
    blocks: blocks.map(toPackBlockJson),
  };
}

function parseEmbeddedDefinition(
  id: string,
  raw: unknown,
  behaviorNames: readonly string[],
): CustomDefinition | null {
  if (!isRecord(raw) || !isRecord(raw.pack) || !isRecord(raw.definition)) return null;
  const { info } = parsePackInfo(raw.pack);
  if (info === null || !id.startsWith(`${info.id}/`)) return null;
  const blockRaw = {
    ...raw.definition,
    id: id.slice(info.id.length + 1),
    template: raw.template,
    styles: raw.styles,
    thumbnail: raw.thumbnail,
    fieldRenames: raw.fieldRenames,
  };
  const parsed = parsePackBlock(blockRaw, { pack: info, behaviorNames, index: 0 });
  if (parsed.definition === null || parsed.definition.definition.id !== id) return null;
  return parsed.definition;
}

export function parseEmbeddedDefinitions(
  value: unknown,
  behaviorNames: readonly string[],
): Record<string, CustomDefinition> {
  const definitions: Record<string, CustomDefinition> = {};
  if (!isRecord(value)) return definitions;
  for (const [id, raw] of Object.entries(value)) {
    const definition = parseEmbeddedDefinition(id, raw, behaviorNames);
    if (definition === null) {
      console.warn(`Skipped the embedded custom block "${id}": its definition is not valid`);
      continue;
    }
    definitions[id] = definition;
  }
  return definitions;
}
