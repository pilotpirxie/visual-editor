import {
  APP_ICON_TYPES,
  FAVICON_TYPES,
  PAGE_META_RULES,
  type Parsed,
  settingError,
  SITE_META_RULES,
  SOCIAL_IMAGE_TYPES,
} from '../app/settingsRules';
import { slugError } from '../app/slugs';
import {
  FONT_ROLES,
  SCHEMA_VERSION,
  SHARED_SLOTS,
  TOKEN_GROUPS,
  type Asset,
  type Block,
  type DesignSystem,
  type FontSelection,
  type Page,
  type PageSeo,
  type Project,
  type ProjectSettings,
  type Token,
  type TokenGenerators,
} from '../app/types';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import { parseEmbeddedBlocks } from '../components/packFormat';
import { isSafeCssValue } from '../render/sanitize';
import { isRecord } from '../components/fields';
import { parseBlock, TOKEN_NAME } from './parseBlock';

export class ProjectFormatError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProjectFormatError';
  }
}

const ASSET_TYPES = [...new Set([...SOCIAL_IMAGE_TYPES, ...FAVICON_TYPES, ...APP_ICON_TYPES])];
const SEO_TEXT_KEYS = ['title', 'description', 'socialTitle', 'socialDescription'] as const;

function fail(path: string, problem: string): never {
  throw new ProjectFormatError(`This is not a valid project: ${path} ${problem}`);
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, 'is missing or not an object');
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'is not text');
  return value;
}

function optionalStringAt(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return stringAt(value, path);
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'is not a number');
  return value;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'is not true or false');
  return value;
}

function stringListAt(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, 'is not a list');
  const items: string[] = [];
  for (const [index, item] of value.entries()) items.push(stringAt(item, `${path}[${index}]`));
  return items;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  for (const option of options) {
    if (option === value) return option;
  }
  fail(path, `must be one of ${options.join(', ')}`);
}

function parseAssets(value: unknown): Record<string, Asset> {
  const assets: Record<string, Asset> = {};
  for (const [id, raw] of Object.entries(recordAt(value, 'assets'))) {
    const path = `assets.${id}`;
    const asset = recordAt(raw, path);
    const mimeType = oneOf(asset.mimeType, ASSET_TYPES, `${path}.mimeType`);
    const dataUrl = stringAt(asset.dataUrl, `${path}.dataUrl`);
    if (!dataUrl.startsWith(`data:${mimeType};base64,`)) fail(`${path}.dataUrl`, 'is not an image');
    if (asset.id !== id) fail(`${path}.id`, 'does not match its key');
    assets[id] = { id, name: stringAt(asset.name, `${path}.name`), mimeType, dataUrl };
  }
  return assets;
}

function assetIdAt(
  value: unknown,
  path: string,
  assets: Record<string, Asset>,
): string | undefined {
  const assetId = optionalStringAt(value, path);
  if (assetId !== undefined && assets[assetId] === undefined)
    fail(path, 'points to a missing image');
  return assetId;
}

type MetaRules = Record<string, (value: unknown) => Parsed<unknown>>;

function copyMeta(
  raw: Record<string, unknown>,
  rules: MetaRules,
  path: string,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const [key, parse] of Object.entries(rules)) {
    if (raw[key] === undefined) continue;
    const parsed = parse(raw[key]);
    if ('error' in parsed) fail(`${path}.${key}`, `is invalid: ${parsed.error}`);
    meta[key] = parsed.value;
  }
  return meta;
}

function parseSettings(value: unknown, assets: Record<string, Asset>): ProjectSettings {
  const raw = recordAt(value, 'settings');
  const title = stringAt(raw.title, 'settings.title');
  const language = stringAt(raw.language, 'settings.language');
  const baseUrl = optionalStringAt(raw.baseUrl, 'settings.baseUrl');
  if (settingError('title', title) !== null) fail('settings.title', 'is empty');
  if (settingError('language', language) !== null) fail('settings.language', 'is not a language');
  if (baseUrl !== undefined && settingError('baseUrl', baseUrl) !== null) {
    fail('settings.baseUrl', 'is not a web address');
  }
  const settings: ProjectSettings = {
    ...copyMeta(raw, SITE_META_RULES, 'settings'),
    title,
    description: stringAt(raw.description, 'settings.description'),
    language,
    titleTemplate: stringAt(raw.titleTemplate, 'settings.titleTemplate'),
    indexable: booleanAt(raw.indexable, 'settings.indexable'),
  };
  if (baseUrl !== undefined && baseUrl !== '') settings.baseUrl = baseUrl;
  const faviconAssetId = assetIdAt(raw.faviconAssetId, 'settings.faviconAssetId', assets);
  if (faviconAssetId !== undefined) settings.faviconAssetId = faviconAssetId;
  const socialAssetId = assetIdAt(raw.socialImageAssetId, 'settings.socialImageAssetId', assets);
  if (socialAssetId !== undefined) settings.socialImageAssetId = socialAssetId;
  const appIconAssetId = assetIdAt(raw.appIconAssetId, 'settings.appIconAssetId', assets);
  if (appIconAssetId !== undefined) settings.appIconAssetId = appIconAssetId;
  return settings;
}

function parseTokens(value: unknown): Record<string, Token> {
  const tokens: Record<string, Token> = {};
  for (const [name, raw] of Object.entries(recordAt(value, 'designSystem.tokens'))) {
    const path = `designSystem.tokens.${name}`;
    const token = recordAt(raw, path);
    const tokenValue = stringAt(token.value, `${path}.value`);
    if (!TOKEN_NAME.test(name) || token.name !== name) fail(path, 'has an invalid name');
    if (!isSafeCssValue(tokenValue)) fail(`${path}.value`, 'is not a safe CSS value');
    tokens[name] = {
      name,
      label: stringAt(token.label, `${path}.label`),
      group: oneOf(token.group, TOKEN_GROUPS, `${path}.group`),
      value: tokenValue,
    };
  }
  return tokens;
}

function parseFonts(value: unknown): FontSelection[] {
  if (!Array.isArray(value)) fail('designSystem.fonts', 'is not a list');
  const fonts: FontSelection[] = [];
  for (const [index, raw] of value.entries()) {
    const path = `designSystem.fonts[${index}]`;
    const font = recordAt(raw, path);
    if (!Array.isArray(font.weights)) fail(`${path}.weights`, 'is not a list');
    const weights: number[] = [];
    for (const weight of font.weights) weights.push(numberAt(weight, `${path}.weights`));
    fonts.push({
      role: oneOf(font.role, FONT_ROLES, `${path}.role`),
      family: stringAt(font.family, `${path}.family`),
      weights,
    });
  }
  return fonts;
}

function parseGenerators(value: unknown): TokenGenerators {
  const raw = recordAt(value, 'designSystem.generators');
  return {
    typeBasePx: numberAt(raw.typeBasePx, 'designSystem.generators.typeBasePx'),
    typeRatio: numberAt(raw.typeRatio, 'designSystem.generators.typeRatio'),
    spaceUnitPx: numberAt(raw.spaceUnitPx, 'designSystem.generators.spaceUnitPx'),
  };
}

function parseIconSet(value: unknown): string {
  const iconSet = stringAt(value, 'designSystem.iconSet');
  const info = iconSetInfo(iconSet);
  if (info === undefined || info.isBrandOnly)
    fail('designSystem.iconSet', 'is not a known icon set');
  return iconSet;
}

export function parseDesignSystem(value: unknown): DesignSystem {
  const raw = recordAt(value, 'designSystem');
  const designSystem: DesignSystem = {
    tokens: parseTokens(raw.tokens),
    fonts: parseFonts(raw.fonts),
    generators: parseGenerators(raw.generators),
    iconSet: parseIconSet(raw.iconSet),
  };
  const presetId = optionalStringAt(raw.presetId, 'designSystem.presetId');
  if (presetId !== undefined) designSystem.presetId = presetId;
  return designSystem;
}

function parseBlocks(value: unknown): Project['blocks'] {
  const raw = recordAt(value, 'blocks');
  const ids = stringListAt(raw.ids, 'blocks.ids');
  const rawEntities = recordAt(raw.entities, 'blocks.entities');
  const entities: Record<string, Block> = {};
  for (const id of ids) {
    const block = parseBlock(rawEntities[id]);
    if (block === null || block.id !== id) fail(`blocks.entities.${id}`, 'is not a valid block');
    entities[id] = block;
  }
  if (Object.keys(rawEntities).length !== ids.length) fail('blocks', 'lists different blocks');
  return { ids, entities };
}

function parseSeo(value: unknown, path: string, assets: Record<string, Asset>): PageSeo {
  const raw = recordAt(value, path);
  const seo: PageSeo = {
    ...copyMeta(raw, PAGE_META_RULES, path),
    noindex: booleanAt(raw.noindex, `${path}.noindex`),
  };
  for (const key of SEO_TEXT_KEYS) {
    const text = optionalStringAt(raw[key], `${path}.${key}`);
    if (text !== undefined) seo[key] = text;
  }
  const imageId = assetIdAt(raw.socialImageAssetId, `${path}.socialImageAssetId`, assets);
  if (imageId !== undefined) seo.socialImageAssetId = imageId;
  return seo;
}

function blockIdsAt(value: unknown, path: string, blocks: Project['blocks']): string[] {
  const blockIds = stringListAt(value, path);
  for (const blockId of blockIds) {
    if (blocks.entities[blockId] === undefined) fail(path, `points to a missing block ${blockId}`);
  }
  return blockIds;
}

function parsePages(
  value: unknown,
  blocks: Project['blocks'],
  assets: Record<string, Asset>,
): Project['pages'] {
  const raw = recordAt(value, 'pages');
  const ids = stringListAt(raw.ids, 'pages.ids');
  const rawEntities = recordAt(raw.entities, 'pages.entities');
  const homePageId = stringAt(raw.homePageId, 'pages.homePageId');
  const entities: Record<string, Page> = {};
  const slugs: string[] = [];
  for (const id of ids) {
    const path = `pages.entities.${id}`;
    const page = recordAt(rawEntities[id], path);
    const slug = stringAt(page.slug, `${path}.slug`);
    if (page.id !== id) fail(`${path}.id`, 'does not match its key');
    if (slugError(slug, slugs) !== null) fail(`${path}.slug`, 'is not a valid, unique slug');
    slugs.push(slug);
    entities[id] = {
      id,
      name: stringAt(page.name, `${path}.name`),
      slug,
      blockIds: blockIdsAt(page.blockIds, `${path}.blockIds`, blocks),
      seo: parseSeo(page.seo, `${path}.seo`, assets),
      showSharedHeader: booleanAt(page.showSharedHeader, `${path}.showSharedHeader`),
      showSharedFooter: booleanAt(page.showSharedFooter, `${path}.showSharedFooter`),
    };
  }
  if (ids.length === 0) fail('pages', 'has no pages');
  if (entities[homePageId] === undefined) fail('pages.homePageId', 'is not one of the pages');
  return { ids, entities, homePageId };
}

export function parseProjectDocument(value: unknown): Project {
  const raw = recordAt(value, 'project');
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new ProjectFormatError('This project was saved in an unsupported format');
  }
  const id = stringAt(raw.id, 'id');
  if (id === '') fail('id', 'is empty');
  const assets = parseAssets(raw.assets);
  const blocks = parseBlocks(raw.blocks);
  const slots = recordAt(raw.sharedSlots, 'sharedSlots');
  const sharedSlots = {
    [SHARED_SLOTS[0]]: blockIdsAt(slots.header, 'sharedSlots.header', blocks),
    [SHARED_SLOTS[1]]: blockIdsAt(slots.footer, 'sharedSlots.footer', blocks),
  };
  const starterId = optionalStringAt(raw.starterId, 'starterId');
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    ...(starterId === undefined ? {} : { starterId }),
    settings: parseSettings(raw.settings, assets),
    designSystem: parseDesignSystem(raw.designSystem),
    pages: parsePages(raw.pages, blocks, assets),
    blocks,
    sharedSlots,
    packBlocks: parseEmbeddedBlocks(raw.packBlocks),
    assets,
  };
}
