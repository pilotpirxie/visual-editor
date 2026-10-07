import { THEME_TOKEN_NAMES } from '../app/sectionThemes';
import { SCHEMA_VERSION, type Block, type ComponentBlock, type Project } from '../app/types';
import { definitionOf } from '../components/registry';
import type { ComponentDefinition, Field } from '../components/types';
import { BUILTIN_PRESETS, CLEAN_PRESET } from '../presets/presets';
import { isRecord } from './parseBlock';
import { parseProjectDocument, ProjectFormatError } from './validateProject';

type RawDocument = Record<string, unknown>;

type DocumentMigration = (document: RawDocument) => RawDocument;

const MIN_SCHEMA_VERSION = 2;

function addSectionThemeTokens(document: RawDocument): RawDocument {
  const { designSystem } = document;
  if (!isRecord(designSystem) || !isRecord(designSystem.tokens)) return document;
  const preset =
    BUILTIN_PRESETS.find((candidate) => candidate.id === designSystem.presetId) ?? CLEAN_PRESET;
  const tokens = { ...designSystem.tokens };
  for (const name of THEME_TOKEN_NAMES) {
    const token = preset.designSystem.tokens[name];
    if (tokens[name] === undefined && token !== undefined) tokens[name] = { ...token };
  }
  return { ...document, designSystem: { ...designSystem, tokens } };
}

function pagesWithNoindex(pages: unknown): unknown {
  if (!isRecord(pages) || !isRecord(pages.entities)) return pages;
  const entities: Record<string, unknown> = {};
  for (const [id, page] of Object.entries(pages.entities)) {
    const seo = isRecord(page) && isRecord(page.seo) ? page.seo : null;
    entities[id] =
      isRecord(page) && seo !== null
        ? { ...page, seo: { ...seo, noindex: seo.noindex === true } }
        : page;
  }
  return { ...pages, entities };
}

function addCustomBlocksAndIndexing(document: RawDocument): RawDocument {
  const settings = isRecord(document.settings)
    ? { ...document.settings, indexable: document.settings.indexable !== false }
    : document.settings;
  return {
    ...document,
    settings,
    pages: pagesWithNoindex(document.pages),
    customDefinitions: isRecord(document.customDefinitions) ? document.customDefinitions : {},
  };
}

const PROJECT_MIGRATIONS: Record<number, DocumentMigration> = {
  2: addSectionThemeTokens,
  3: addCustomBlocksAndIndexing,
};

export function migrateProjectDocument(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const version = value.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return value;
  if (version > SCHEMA_VERSION) {
    throw new ProjectFormatError(
      'This project was saved by a newer version of the editor. Reload the app to open it.',
    );
  }
  if (version < MIN_SCHEMA_VERSION) {
    throw new ProjectFormatError('This project was saved in an unsupported format');
  }
  let document = structuredClone(value);
  for (let from = version; from < SCHEMA_VERSION; from += 1) {
    const migration = PROJECT_MIGRATIONS[from];
    if (migration === undefined) throw new Error(`No project migration from schema ${from}`);
    document = { ...migration(document), schemaVersion: from + 1 };
  }
  return document;
}

function itemsWithDefaults(itemFields: readonly Field[], items: unknown[]): unknown[] {
  let filled: unknown[] | null = null;
  for (const [index, item] of items.entries()) {
    if (!isRecord(item)) continue;
    const filledItem = withFieldDefaults(itemFields, item);
    if (filledItem === item) continue;
    filled ??= [...items];
    filled[index] = filledItem;
  }
  return filled ?? items;
}

export function withFieldDefaults(
  fields: readonly Field[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  let filled: Record<string, unknown> | null = null;
  for (const field of fields) {
    const value = values[field.name];
    if (value === undefined) {
      filled ??= { ...values };
      filled[field.name] = structuredClone(field.default);
      continue;
    }
    if (field.type !== 'list' || !Array.isArray(value)) continue;
    const items = itemsWithDefaults(field.itemFields ?? [], value);
    if (items === value) continue;
    filled ??= { ...values };
    filled[field.name] = items;
  }
  return filled ?? values;
}

export function upgradeComponentBlock(
  block: ComponentBlock,
  definition: ComponentDefinition,
): ComponentBlock {
  if (block.componentVersion > definition.version) {
    console.warn(
      `Block ${block.id} was made with ${definition.id} version ${block.componentVersion}, newer than this app's version ${definition.version}; it is kept as it is`,
    );
    return block;
  }
  const isOutdated = block.componentVersion < definition.version;
  let values = block.values;
  if (isOutdated && definition.migrate !== undefined) {
    values = definition.migrate(structuredClone(block.values), block.componentVersion);
  }
  values = withFieldDefaults(definition.fields, values);
  if (!isOutdated && values === block.values) return block;
  return { ...block, componentVersion: definition.version, values };
}

function upgradeBlock(block: Block, project: Project): Block {
  if (block.kind !== 'component') return block;
  const definition = definitionOf(project, block.componentId);
  if (definition === undefined) return block;
  return upgradeComponentBlock(block, definition);
}

function upgradeProjectBlocks(project: Project): Project {
  let entities: Record<string, Block> | null = null;
  for (const id of project.blocks.ids) {
    const block = project.blocks.entities[id];
    if (block === undefined) continue;
    const upgraded = upgradeBlock(block, project);
    if (upgraded === block) continue;
    entities ??= { ...project.blocks.entities };
    entities[id] = upgraded;
  }
  if (entities === null) return project;
  return { ...project, blocks: { ...project.blocks, entities } };
}

export function openProjectDocument(value: unknown): Project {
  return upgradeProjectBlocks(parseProjectDocument(migrateProjectDocument(value)));
}
