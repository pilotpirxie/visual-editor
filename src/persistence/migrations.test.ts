import { describe, expect, it, vi } from 'vitest';
import { THEME_TOKEN_NAMES } from '../app/sectionThemes';
import { SCHEMA_VERSION, type ComponentBlock } from '../app/types';
import { registry } from '../components/registry';
import type { ComponentDefinition } from '../components/types';
import { ensureProjectIconSets } from '../features/icons/ensureIconSets';
import { BUILTIN_PRESETS } from '../presets/presets';
import { buildExportFiles } from '../render/exportSite';
import projectV2 from './fixtures/project-v2.json';
import {
  migrateProjectDocument,
  openProjectDocument,
  upgradeComponentBlock,
  withFieldDefaults,
} from './migrations';
import { isRecord } from './parseBlock';
import { ProjectFormatError } from './validateProject';

const runtime = { core: '/* core */', behaviors: {} };

function savedV2(): Record<string, unknown> {
  return structuredClone(projectV2);
}

function designTokensOf(document: unknown): Record<string, unknown> {
  if (!isRecord(document) || !isRecord(document.designSystem)) throw new Error('No design system');
  const { tokens } = document.designSystem;
  if (!isRecord(tokens)) throw new Error('No tokens');
  return tokens;
}

function presetToken(presetId: string, name: string): unknown {
  return BUILTIN_PRESETS.find((preset) => preset.id === presetId)?.designSystem.tokens[name];
}

function withPresetId(document: Record<string, unknown>, presetId: string | null): unknown {
  const designSystem = structuredClone(document.designSystem);
  if (!isRecord(designSystem)) throw new Error('No design system');
  if (presetId === null) {
    delete designSystem.presetId;
  } else {
    designSystem.presetId = presetId;
  }
  return { ...document, designSystem };
}

const ITEMS_FIELD = {
  name: 'items',
  label: 'Items',
  type: 'list',
  default: [],
  itemFields: [
    { name: 'title', label: 'Title', type: 'text', default: 'Item' },
    { name: 'badge', label: 'Badge', type: 'text', default: 'New' },
  ],
} satisfies ComponentDefinition['fields'][number];

function testDefinition(overrides: Partial<ComponentDefinition> = {}): ComponentDefinition {
  return {
    id: 'test-block',
    version: 2,
    name: 'Test block',
    category: 'content',
    styleOverrides: [],
    fields: [
      { name: 'title', label: 'Title', type: 'text', default: 'Hello' },
      { name: 'showButton', label: 'Show button', type: 'boolean', default: true },
      ITEMS_FIELD,
    ],
    ...overrides,
  };
}

function blockAt(version: number, values: Record<string, unknown>): ComponentBlock {
  return {
    id: 'b1',
    kind: 'component',
    componentId: 'test-block',
    componentVersion: version,
    values,
    overrides: {},
    disabled: false,
    extraClasses: [],
    hideOn: [],
  };
}

describe('migrateProjectDocument', () => {
  it('moves a version 2 document to the current version and adds the section theme tokens', () => {
    const migrated = migrateProjectDocument(savedV2());
    expect(isRecord(migrated) && migrated.schemaVersion).toBe(SCHEMA_VERSION);
    const tokens = designTokensOf(migrated);
    for (const name of THEME_TOKEN_NAMES) {
      expect(tokens[name], name).toEqual(presetToken('clean', name));
    }
  });

  it('takes theme colors from the preset the project started from, or from Clean', () => {
    const fromMidnight = designTokensOf(
      migrateProjectDocument(withPresetId(savedV2(), 'midnight')),
    );
    expect(fromMidnight['--theme-dark-background']).toEqual(
      presetToken('midnight', '--theme-dark-background'),
    );
    const withoutPreset = designTokensOf(migrateProjectDocument(withPresetId(savedV2(), null)));
    expect(withoutPreset['--theme-dark-background']).toEqual(
      presetToken('clean', '--theme-dark-background'),
    );
  });

  it('keeps theme tokens the document already has and leaves the input untouched', () => {
    const saved = savedV2();
    const own = { name: '--theme-dark-accent', label: 'Mine', group: 'color', value: '#ffcc00' };
    designTokensOf(saved)['--theme-dark-accent'] = own;
    const before = structuredClone(saved);
    expect(designTokensOf(migrateProjectDocument(saved))['--theme-dark-accent']).toEqual(own);
    expect(saved).toEqual(before);
  });

  it('refuses documents from a newer or a retired format', () => {
    expect(() =>
      migrateProjectDocument({ ...savedV2(), schemaVersion: SCHEMA_VERSION + 1 }),
    ).toThrow('saved by a newer version of the editor');
    expect(() => migrateProjectDocument({ ...savedV2(), schemaVersion: 1 })).toThrow(
      ProjectFormatError,
    );
  });

  it('passes through values it cannot read, so validation can name the problem', () => {
    expect(migrateProjectDocument('nope')).toBe('nope');
    expect(() => openProjectDocument({ schemaVersion: 'two' })).toThrow('unsupported format');
  });
});

describe('withFieldDefaults', () => {
  const { fields } = testDefinition();

  it('fills fields and list item fields that are missing, and keeps unknown keys', () => {
    const values = { title: 'Mine', retired: 'kept', items: [{ title: 'First' }] };
    expect(withFieldDefaults(fields, values)).toEqual({
      title: 'Mine',
      retired: 'kept',
      showButton: true,
      items: [{ title: 'First', badge: 'New' }],
    });
  });

  it('returns the same object when nothing is missing', () => {
    const values = { title: 'Mine', showButton: false, items: [{ title: 'A', badge: 'B' }] };
    expect(withFieldDefaults(fields, values)).toBe(values);
  });
});

describe('upgradeComponentBlock', () => {
  it('runs migrate from the saved version and records the new version', () => {
    const migrate = vi.fn((values: Record<string, unknown>) => ({
      ...values,
      title: values.headline,
    }));
    const upgraded = upgradeComponentBlock(
      blockAt(1, { headline: 'Old name', showButton: false, items: [] }),
      testDefinition({ migrate }),
    );
    expect(migrate).toHaveBeenCalledWith(expect.objectContaining({ headline: 'Old name' }), 1);
    expect(upgraded.componentVersion).toBe(2);
    expect(upgraded.values).toMatchObject({ title: 'Old name', showButton: false });
  });

  it('upgrades without migrate by filling defaults', () => {
    const upgraded = upgradeComponentBlock(blockAt(1, { title: 'Hi' }), testDefinition());
    expect(upgraded).toMatchObject({
      componentVersion: 2,
      values: { title: 'Hi', showButton: true, items: [] },
    });
  });

  it('returns the same block when it is current and complete', () => {
    const block = blockAt(2, { title: 'Hi', showButton: true, items: [] });
    expect(upgradeComponentBlock(block, testDefinition())).toBe(block);
  });

  it('keeps a block made by a newer version as it is', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const block = blockAt(3, { title: 'From the future' });
    expect(upgradeComponentBlock(block, testDefinition())).toBe(block);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('newer'));
  });
});

describe('openProjectDocument with a project saved at schema version 2', () => {
  it('opens at the current version with every block and its content', () => {
    const project = openProjectDocument(savedV2());
    expect(project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(project.blocks.ids).toEqual(projectV2.blocks.ids);
    for (const id of project.blocks.ids) {
      const block = project.blocks.entities[id];
      if (block?.kind !== 'component') continue;
      const definition = registry.get(block.componentId)?.definition;
      expect(block.componentVersion, block.componentId).toBe(definition?.version);
    }
  });

  it('keeps numbers saved before count-up still, while new number blocks count up', () => {
    const project = openProjectDocument(savedV2());
    const statsBlocks = [];
    for (const id of project.blocks.ids) {
      const block = project.blocks.entities[id];
      if (block?.kind === 'component' && block.componentId.startsWith('stats-')) {
        statsBlocks.push(block);
      }
    }
    expect(statsBlocks.map(({ componentId }) => componentId).sort()).toEqual([
      'stats-described',
      'stats-row',
    ]);
    for (const block of statsBlocks) expect(block.values.countUp).toBe(false);
    expect(registry.get('stats-row')?.definition.fields.at(-1)?.default).toBe(true);
  });

  it('exports the same pages it exported before the update', async () => {
    const project = openProjectDocument(savedV2());
    await ensureProjectIconSets(project);
    const { files } = buildExportFiles(project, registry, runtime);
    const pages: string[] = [];
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.html') && typeof content === 'string') {
        pages.push(`<!-- ${path} -->\n${content}`);
      }
    }
    await expect(pages.join('\n')).toMatchFileSnapshot('./fixtures/project-v2.export.html');
  });
});
