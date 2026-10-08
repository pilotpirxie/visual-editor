import { describeError } from '../app/errors';
import { TOKEN_NAME } from '../persistence/parseBlock';
import { HANDLEBARS_BUILTIN_HELPERS, TEMPLATE_HELPERS } from '../render/helperNames';
import { normalizeRichText } from '../render/sanitize';
import { asListItems, isRecord, validateField } from './fields';
import { jsonErrorLine } from './jsonLines';
import manifest from './library/pack.json';
import {
  CATEGORIES,
  FIELD_TYPES,
  type Category,
  type ComponentDefinition,
  type Field,
  type FieldOption,
  type PackBlock,
  type PackInfo,
} from './types';

export type PackError = {
  block: string | null;
  field: string | null;
  line: number | null;
  message: string;
};

export type PackFiles = ReadonlyMap<string, Uint8Array>;

export type ParsedPackFile = {
  info: PackInfo | null;
  blocks: PackBlock[];
  errors: PackError[];
};

export type PackBlockSources = { template: unknown; styles: unknown; thumbnail: unknown };

type Report = (field: string | null, message: string, line?: number | null) => void;

export const BUILT_IN_PACK: PackInfo = manifest;

export const PACK_FILE = 'pack.json';
export const BLOCK_FILE = 'block.json';
export const TEMPLATE_FILE = 'template.hbs';
export const STYLES_FILE = 'styles.css';
export const THUMBNAIL_FILE = 'thumbnail.webp';

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD_NAME = /^[a-z][a-zA-Z0-9]*$/;
const VERSION = /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)$/;
const THUMBNAIL_PREFIX = 'data:image/webp;base64,';
const THUMBNAIL = /^data:image\/webp;base64,[a-z0-9+/]+={0,2}$/i;
const ICON_PURPOSES = ['logo', 'brand'] as const;
const MAX_LIST_DEPTH = 2;
const BASE64_CHUNK = 0x8000;

const RESERVED_FIELD_NAMES = new Set<string>([
  ...TEMPLATE_HELPERS,
  ...HANDLEBARS_BUILTIN_HELPERS,
  'block',
  'site',
  'this',
  'constructor',
  'prototype',
]);

const textDecoder = new TextDecoder();

export function isBuiltIn(pack: PackInfo): boolean {
  return pack.id === BUILT_IN_PACK.id;
}

export function componentIdOf(packId: string, blockId: string): string {
  return packId === BUILT_IN_PACK.id ? blockId : `${packId}/${blockId}`;
}

export function rootClassOf(componentId: string): string {
  return `b-${componentId.replace('/', '-')}`;
}

export function packBlockId(packBlock: PackBlock): string {
  if (isBuiltIn(packBlock.pack)) return packBlock.definition.id;
  return packBlock.definition.id.slice(packBlock.pack.id.length + 1);
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

function valueProblem(field: Field, value: unknown): string | null {
  const problem = validateField(field, value);
  if (problem !== null || field.type !== 'list') return problem;
  return listProblem(field, value);
}

function listProblem(field: Field, value: unknown): string | null {
  const items = asListItems(value);
  if (field.minItems !== undefined && items.length < field.minItems) {
    return `needs at least ${field.minItems} items`;
  }
  if (field.maxItems !== undefined && items.length > field.maxItems) {
    return `allows at most ${field.maxItems} items`;
  }
  for (const [index, item] of items.entries()) {
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
      report(path, `can’t be named "${rawName}": templates use that name`);
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

function parseStyleOverrides(value: unknown, report: Report): string[] {
  const tokens = textListAt(value, 'styleOverrides', report);
  for (const token of tokens) {
    if (!TOKEN_NAME.test(token)) report('styleOverrides', `"${token}" is not a design token name`);
  }
  return tokens;
}

function sourceTextAt(value: unknown, file: string, report: Report): string {
  if (typeof value === 'string' && value.trim() !== '') return value;
  report(file, 'is missing or empty');
  return '';
}

export function parsePackBlock(
  pack: PackInfo,
  blockId: string,
  raw: unknown,
  sources: PackBlockSources,
): { packBlock: PackBlock | null; errors: PackError[] } {
  const errors: PackError[] = [];
  const report: Report = (field, message, line = null) => {
    errors.push({ block: blockId, field, line, message });
  };
  if (!KEBAB_ID.test(blockId)) report(null, 'needs a kebab-case folder name, like hero-split');
  if (!isRecord(raw)) {
    report(BLOCK_FILE, 'must hold one JSON object');
    return { packBlock: null, errors };
  }
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
  const styleOverrides = parseStyleOverrides(raw.styleOverrides, report);
  const template = sourceTextAt(sources.template, TEMPLATE_FILE, report);
  const styles = sourceTextAt(sources.styles, STYLES_FILE, report);
  const { thumbnail } = sources;
  if (typeof thumbnail !== 'string' || !THUMBNAIL.test(thumbnail)) {
    report(THUMBNAIL_FILE, 'is missing or not a WebP image');
  }
  if (errors.length > 0 || category === undefined || typeof thumbnail !== 'string') {
    return { packBlock: null, errors };
  }
  const definition: ComponentDefinition = {
    id: componentIdOf(pack.id, blockId),
    name,
    category,
    fields,
    styleOverrides,
  };
  if (description !== undefined) definition.description = description;
  if (tags !== undefined) definition.tags = tags;
  if (fieldGroups !== undefined) definition.fieldGroups = fieldGroups;
  return { packBlock: { pack, definition, template, styles, thumbnail }, errors };
}

export function parsePackInfo(raw: unknown): { info: PackInfo | null; errors: PackError[] } {
  const errors: PackError[] = [];
  const report: Report = (field, message) => {
    errors.push({
      block: null,
      field: field === null ? PACK_FILE : `${PACK_FILE} ${field}`,
      line: null,
      message,
    });
  };
  if (!isRecord(raw)) {
    report(null, 'must hold one JSON object');
    return { info: null, errors };
  }
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

export function base64Of(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function thumbnailBytes(thumbnail: string): Uint8Array<ArrayBuffer> {
  const binary = atob(thumbnail.slice(THUMBNAIL_PREFIX.length));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isWebp(bytes: Uint8Array): boolean {
  const riff = textDecoder.decode(bytes.subarray(0, 4));
  const webp = textDecoder.decode(bytes.subarray(8, 12));
  return riff === 'RIFF' && webp === 'WEBP';
}

function thumbnailOf(bytes: Uint8Array | undefined): string | undefined {
  if (bytes === undefined || !isWebp(bytes)) return undefined;
  return `${THUMBNAIL_PREFIX}${base64Of(bytes)}`;
}

function readJsonFile(bytes: Uint8Array, report: (line: number, message: string) => void): unknown {
  const text = textDecoder.decode(bytes);
  try {
    return JSON.parse(text);
  } catch (error) {
    report(jsonErrorLine(text), `is not valid JSON: ${describeError(error)}`);
    return undefined;
  }
}

function packRootOf(files: PackFiles): string | null {
  let root: string | null = null;
  for (const path of files.keys()) {
    if (path !== PACK_FILE && !path.endsWith(`/${PACK_FILE}`)) continue;
    const folder = path.slice(0, path.length - PACK_FILE.length);
    if (root === null || folder.split('/').length < root.split('/').length) root = folder;
  }
  return root;
}

function blockIdsIn(files: PackFiles, root: string): string[] {
  const ids: string[] = [];
  for (const path of files.keys()) {
    if (!path.startsWith(root)) continue;
    const parts = path.slice(root.length).split('/');
    const [blockId, file] = parts;
    if (parts.length === 2 && file === BLOCK_FILE && blockId !== undefined) ids.push(blockId);
  }
  return ids.sort();
}

function textOf(bytes: Uint8Array | undefined): string | undefined {
  return bytes === undefined ? undefined : textDecoder.decode(bytes);
}

export function parsePackFiles(files: PackFiles): ParsedPackFile {
  const root = packRootOf(files);
  if (root === null) {
    const message = `This is not a block pack: it has no ${PACK_FILE}`;
    return { info: null, blocks: [], errors: [{ block: null, field: null, line: null, message }] };
  }
  const errors: PackError[] = [];
  const manifestBytes = files.get(`${root}${PACK_FILE}`) ?? new Uint8Array();
  const rawInfo = readJsonFile(manifestBytes, (line, message) => {
    errors.push({ block: null, field: PACK_FILE, line, message });
  });
  if (errors.length > 0) return { info: null, blocks: [], errors };
  const { info, errors: infoErrors } = parsePackInfo(rawInfo);
  errors.push(...infoErrors);
  const blockIds = blockIdsIn(files, root);
  if (blockIds.length === 0) {
    const message = `must hold at least one block folder with a ${BLOCK_FILE}`;
    errors.push({ block: null, field: null, line: null, message });
  }
  if (info === null || errors.length > 0) return { info, blocks: [], errors };
  const blocks: PackBlock[] = [];
  for (const blockId of blockIds) {
    const folder = `${root}${blockId}/`;
    let isReadable = true;
    const raw = readJsonFile(
      files.get(`${folder}${BLOCK_FILE}`) ?? new Uint8Array(),
      (line, message) => {
        isReadable = false;
        errors.push({ block: blockId, field: BLOCK_FILE, line, message });
      },
    );
    if (!isReadable) continue;
    const parsed = parsePackBlock(info, blockId, raw, {
      template: textOf(files.get(`${folder}${TEMPLATE_FILE}`)),
      styles: textOf(files.get(`${folder}${STYLES_FILE}`)),
      thumbnail: thumbnailOf(files.get(`${folder}${THUMBNAIL_FILE}`)),
    });
    errors.push(...parsed.errors);
    if (parsed.packBlock !== null) blocks.push(parsed.packBlock);
  }
  return { info, blocks, errors };
}

function parseEmbeddedBlock(id: string, raw: unknown): PackBlock | null {
  if (!isRecord(raw) || !isRecord(raw.definition)) return null;
  const { info } = parsePackInfo(raw.pack);
  if (info === null || isBuiltIn(info) || !id.startsWith(`${info.id}/`)) return null;
  const blockId = id.slice(info.id.length + 1);
  const { packBlock } = parsePackBlock(info, blockId, raw.definition, {
    template: raw.template,
    styles: raw.styles,
    thumbnail: raw.thumbnail,
  });
  if (packBlock === null || packBlock.definition.id !== id) return null;
  return packBlock;
}

export function parseEmbeddedBlocks(value: unknown): Record<string, PackBlock> {
  const packBlocks: Record<string, PackBlock> = {};
  if (!isRecord(value)) return packBlocks;
  for (const [id, raw] of Object.entries(value)) {
    const packBlock = parseEmbeddedBlock(id, raw);
    if (packBlock === null) {
      console.warn(`Skipped the embedded pack block "${id}": its definition is not valid`);
      continue;
    }
    packBlocks[id] = packBlock;
  }
  return packBlocks;
}
