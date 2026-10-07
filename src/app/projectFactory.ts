import { createBlock, registry } from '../components/registry';
import { CLEAN_PRESET, presetDesignSystem } from '../presets/presets';
import { DEFAULT_TITLE_TEMPLATE } from '../render/pageHead';
import type { Block, DesignSystemPreset, Page, Project, TokenGenerators } from './types';

export const UNTITLED_PROJECT_TITLE = 'Untitled site';

export const DEFAULT_GENERATORS: TokenGenerators = {
  typeBasePx: 16,
  typeRatio: 1.25,
  spaceUnitPx: 4,
};

const SAMPLE_PAGE_COMPONENTS = ['nav-simple', 'hero-centered', 'features-grid-3', 'footer-simple'];

export function createPage(id: string, name: string, slug: string): Page {
  return {
    id,
    name,
    slug,
    blockIds: [],
    seo: {},
    showSharedHeader: true,
    showSharedFooter: true,
  };
}

export function createBlankProject(
  title: string,
  preset: DesignSystemPreset = CLEAN_PRESET,
): Project {
  const home = createPage(crypto.randomUUID(), 'Home', 'home');
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    settings: { title, description: '', language: 'en', titleTemplate: DEFAULT_TITLE_TEMPLATE },
    designSystem: presetDesignSystem(preset),
    pages: { ids: [home.id], entities: { [home.id]: home }, homePageId: home.id },
    blocks: { ids: [], entities: {} },
    sharedSlots: { header: [], footer: [] },
    assets: {},
  };
}

export function createSampleProject(): Project {
  const project = createBlankProject('Fieldnote');
  const blockIds: string[] = [];
  const blockEntities: Record<string, Block> = {};
  for (const componentId of SAMPLE_PAGE_COMPONENTS) {
    const component = registry.get(componentId);
    if (component === undefined) {
      throw new Error(`The sample project needs component "${componentId}"`);
    }
    const block = createBlock(component.definition);
    blockIds.push(block.id);
    blockEntities[block.id] = block;
  }
  const homeId = project.pages.homePageId;
  const home: Page = { ...project.pages.entities[homeId], blockIds };

  return {
    ...project,
    pages: { ...project.pages, entities: { [homeId]: home } },
    blocks: { ids: [...blockIds], entities: blockEntities },
  };
}
