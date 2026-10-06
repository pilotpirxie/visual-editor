import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import { migrateProject } from './migrate';

function storedV1(): Record<string, unknown> {
  const project = createSampleProject();
  const pages: Record<string, unknown> = {};
  for (const [id, page] of Object.entries(project.pages.entities)) {
    pages[id] = { id: page.id, name: page.name, slug: page.slug, blockIds: page.blockIds };
  }
  const blocks: Record<string, unknown> = {};
  for (const [id, block] of Object.entries(project.blocks.entities)) {
    blocks[id] = {
      id: block.id,
      kind: block.kind,
      componentId: block.componentId,
      componentVersion: block.componentVersion,
      values: block.values,
      overrides: block.overrides,
      disabled: block.disabled,
    };
  }
  const tokens: Record<string, unknown> = {};
  for (const [name, token] of Object.entries(project.designSystem.tokens)) {
    if (name !== '--font-mono') tokens[name] = token;
  }
  return {
    schemaVersion: 1,
    id: project.id,
    settings: project.settings,
    designSystem: { tokens },
    pages: { ...project.pages, entities: pages },
    blocks: { ...project.blocks, entities: blocks },
  };
}

function pageIdsOf(stored: Record<string, unknown>): unknown {
  const { pages } = stored;
  if (typeof pages !== 'object' || pages === null || !('ids' in pages)) return null;
  return pages.ids;
}

describe('migrateProject', () => {
  it('returns a current project unchanged', () => {
    const project = createSampleProject();
    expect(migrateProject(project)).toBe(project);
  });

  it('fills the page, block, design system and project defaults of a version 1 project', () => {
    const migrated = migrateProject(storedV1());
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.sharedSlots).toEqual({ header: [], footer: [] });
    expect(migrated.assets).toEqual({});
    for (const page of Object.values(migrated.pages.entities)) {
      expect(page.seo).toEqual({});
      expect(page.showSharedHeader).toBe(true);
      expect(page.showSharedFooter).toBe(true);
    }
    for (const block of Object.values(migrated.blocks.entities)) {
      expect(block.extraClasses).toEqual([]);
      expect(block.hideOn).toEqual([]);
    }
    expect(migrated.designSystem.fonts).toEqual([]);
    expect(migrated.designSystem.generators).toEqual({
      typeBasePx: 16,
      typeRatio: 1.25,
      spaceUnitPx: 4,
    });
    expect(migrated.designSystem.tokens['--font-mono']?.group).toBe('typography');
  });

  it('keeps the content of a version 1 project', () => {
    const stored = storedV1();
    const migrated = migrateProject(stored);
    expect(migrated.id).toBe(stored.id);
    expect(migrated.pages.ids).toEqual(pageIdsOf(stored));
    expect(Object.keys(migrated.blocks.entities)).toHaveLength(4);
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'project'],
    ['an unknown schema version', { ...createSampleProject(), schemaVersion: 99 }],
    ['a project without pages', { schemaVersion: 1, id: 'p1', settings: {}, designSystem: {} }],
  ])('rejects %s', (_name, stored) => {
    expect(() => migrateProject(stored)).toThrow('This project was saved in an unsupported format');
  });
});
