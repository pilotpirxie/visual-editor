import { beforeAll, describe, expect, it } from 'vitest';
import type { Project } from '../app/types';
import { validateField } from '../components/fields';
import { forEachFieldValue } from '../components/fieldValues';
import { registry } from '../components/registry';
import { collectExportWarnings } from '../features/export/exportWarnings';
import { ensureProjectIconSets } from '../features/icons/ensureIconSets';
import { buildExportFiles, renderStandalonePage } from '../render/exportSite';
import { componentBlockOf } from '../test/fixtures';
import { instantiateStarter, loadStarter, STARTERS, type StarterInfo } from './starters';

const runtime = { core: '/* core */', behaviors: { menu: '/* menu */' } };

const EXPECTED_SLUGS: Record<string, string[]> = {
  saas: ['home', 'features', 'pricing', 'about', 'contact', '404'],
  'mobile-app': ['home', 'features', 'download', '404'],
  waitlist: ['home'],
  agency: ['home', 'services', 'work', 'team', 'contact'],
  portfolio: ['home', 'projects', 'about', 'contact'],
  event: ['home', 'schedule', 'speakers', 'tickets'],
  restaurant: ['home', 'menu', 'about', 'booking'],
  consultant: ['home', 'services', 'testimonials', 'contact'],
};

const loaded = new Map<string, Project>();

beforeAll(async () => {
  for (const starter of STARTERS) {
    const project = await loadStarter(starter);
    await ensureProjectIconSets(project);
    loaded.set(starter.id, project);
  }
});

function projectOf(starter: StarterInfo): Project {
  const project = loaded.get(starter.id);
  if (project === undefined) throw new Error(`Starter ${starter.id} did not load`);
  return project;
}

function pageSlugsOf(project: Project): string[] {
  const slugs: string[] = [];
  for (const id of project.pages.ids) slugs.push(project.pages.entities[id]?.slug ?? '');
  return slugs;
}

function pageNamesOf(project: Project): string[] {
  const names: string[] = [];
  for (const id of project.pages.ids) names.push(project.pages.entities[id]?.name ?? '');
  return names;
}

function categoriesOf(project: Project, blockIds: string[]): string[] {
  const categories: string[] = [];
  for (const id of blockIds) {
    const componentId = componentBlockOf(project, id).componentId;
    categories.push(registry.get(componentId)?.definition.category ?? '');
  }
  return categories;
}

function linkedPageIds(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  if ('link' in value) return linkedPageIds(value.link);
  if ('pageId' in value && typeof value.pageId === 'string') return [value.pageId];
  return [];
}

describe.each(STARTERS)('the $name starter', (starter) => {
  it('has the pages and the design preset the PRD lists', () => {
    const project = projectOf(starter);
    expect(pageSlugsOf(project)).toEqual(EXPECTED_SLUGS[starter.id]);
    expect(project.designSystem.presetId).toBe(starter.presetId);
  });

  it('uses only registered components with valid values', () => {
    const project = projectOf(starter);
    for (const blockId of project.blocks.ids) {
      const block = componentBlockOf(project, blockId);
      const component = registry.get(block.componentId);
      expect(component, block.componentId).toBeDefined();
      if (component === undefined) continue;
      forEachFieldValue(component.definition.fields, block.values, (field, value) => {
        expect(validateField(field, value), `${block.componentId}.${field.name}`).toBeNull();
      });
    }
  });

  it('links only to pages that exist', () => {
    const project = projectOf(starter);
    for (const blockId of project.blocks.ids) {
      const block = componentBlockOf(project, blockId);
      const fields = registry.get(block.componentId)?.definition.fields ?? [];
      forEachFieldValue(fields, block.values, (_field, value) => {
        for (const pageId of linkedPageIds(value)) {
          expect(project.pages.entities[pageId], `${block.componentId} → ${pageId}`).toBeDefined();
        }
      });
    }
  });

  it('exports with no warnings other than missing form action URLs', () => {
    const project = projectOf(starter);
    for (const warning of collectExportWarnings(project, registry)) {
      expect(warning.text).toContain('the form has no action URL');
    }
    const { files } = buildExportFiles(project, registry, runtime);
    expect(Object.keys(files)).toContain('index.html');
    expect(Object.keys(files)).toContain('assets/css/site.css');
  });

  it('shares a navigation in the header and a footer on every page', () => {
    const project = projectOf(starter);
    expect(categoriesOf(project, project.sharedSlots.header)).toContain('navigations');
    expect(categoriesOf(project, project.sharedSlots.footer)).toEqual(['footers']);
    for (const pageId of project.pages.ids) {
      expect(project.pages.entities[pageId]?.showSharedHeader, pageId).toBe(true);
      expect(project.pages.entities[pageId]?.showSharedFooter, pageId).toBe(true);
    }
  });

  it('uses realistic copy with no placeholder Latin', () => {
    expect(JSON.stringify(projectOf(starter))).not.toMatch(/lorem|ipsum/i);
  });

  it('renders every page as a standalone preview with no scripts', () => {
    const project = projectOf(starter);
    for (const pageId of project.pages.ids) {
      const html = renderStandalonePage(project, pageId, registry, { shouldLinkFonts: true });
      expect(html).toContain('<main>');
      expect(html.match(/<h1[\s>]/g), `page ${pageId}`).toHaveLength(1);
      expect(html).not.toContain('<script');
    }
  });

  it('copies into a new project that shares no ids with the starter', () => {
    const project = projectOf(starter);
    const copy = instantiateStarter(starter, project, 'My site');
    expect(copy.starterId).toBe(starter.id);
    expect(copy.settings.title).toBe('My site');
    expect(copy.id).not.toBe(project.id);
    for (const id of copy.pages.ids) expect(project.pages.ids).not.toContain(id);
    for (const id of copy.blocks.ids) expect(project.blocks.ids).not.toContain(id);
    expect(pageNamesOf(copy)).toEqual(pageNamesOf(project));
  });
});
