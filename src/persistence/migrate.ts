import { cleanPresetToken, DEFAULT_GENERATORS } from '../app/projectFactory';
import type { Block, DesignSystem, Page, Project } from '../app/types';

type StoredV1 = Omit<
  Project,
  'schemaVersion' | 'designSystem' | 'pages' | 'blocks' | 'sharedSlots' | 'assets'
> & {
  schemaVersion: 1;
  designSystem: Pick<DesignSystem, 'tokens'>;
  pages: Omit<Project['pages'], 'entities'> & {
    entities: Record<string, Pick<Page, 'id' | 'name' | 'slug' | 'blockIds'>>;
  };
  blocks: Omit<Project['blocks'], 'entities'> & {
    entities: Record<string, Omit<Block, 'extraClasses' | 'hideOn'>>;
  };
};

const MONO_TOKEN = '--font-mono';

function hasProjectShape(value: object): boolean {
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'settings' in value &&
    'designSystem' in value &&
    'pages' in value &&
    'blocks' in value
  );
}

function schemaVersionOf(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !hasProjectShape(value)) return null;
  if (!('schemaVersion' in value) || typeof value.schemaVersion !== 'number') return null;
  return value.schemaVersion;
}

function isStoredV1(value: unknown): value is StoredV1 {
  return schemaVersionOf(value) === 1;
}

function isProjectV2(value: unknown): value is Project {
  return schemaVersionOf(value) === 2;
}

function migratePages(pages: StoredV1['pages']): Project['pages'] {
  const entities: Record<string, Page> = {};
  for (const [id, page] of Object.entries(pages.entities)) {
    entities[id] = { ...page, seo: {}, showSharedHeader: true, showSharedFooter: true };
  }
  return { ids: pages.ids, entities, homePageId: pages.homePageId };
}

function migrateBlocks(blocks: StoredV1['blocks']): Project['blocks'] {
  const entities: Record<string, Block> = {};
  for (const [id, block] of Object.entries(blocks.entities)) {
    entities[id] = { ...block, extraClasses: [], hideOn: [] };
  }
  return { ids: blocks.ids, entities };
}

function migrateDesignSystem(designSystem: StoredV1['designSystem']): DesignSystem {
  const tokens = { ...designSystem.tokens };
  const monoToken = cleanPresetToken(MONO_TOKEN);
  if (tokens[MONO_TOKEN] === undefined && monoToken !== undefined) tokens[MONO_TOKEN] = monoToken;
  return { tokens, fonts: [], generators: { ...DEFAULT_GENERATORS } };
}

function migrateV1(stored: StoredV1): Project {
  return {
    ...stored,
    schemaVersion: 2,
    designSystem: migrateDesignSystem(stored.designSystem),
    pages: migratePages(stored.pages),
    blocks: migrateBlocks(stored.blocks),
    sharedSlots: { header: [], footer: [] },
    assets: {},
  };
}

export function migrateProject(stored: unknown): Project {
  if (isProjectV2(stored)) return stored;
  if (isStoredV1(stored)) return migrateV1(stored);
  throw new Error('This project was saved in an unsupported format');
}
