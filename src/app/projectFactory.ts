import { createBlock, registry } from '../components/registry';
import clean from '../presets/clean.json';
import {
  TOKEN_GROUPS,
  type DesignSystem,
  type Page,
  type Project,
  type Token,
  type TokenGroup,
} from './types';

export const UNTITLED_PROJECT_TITLE = 'Untitled site';

const SAMPLE_PAGE_COMPONENTS = ['nav-simple', 'hero-centered', 'features-grid-3', 'footer-simple'];

function isTokenGroup(group: string): group is TokenGroup {
  return TOKEN_GROUPS.some((known) => known === group);
}

function presetDesignSystem(preset: typeof clean): DesignSystem {
  const tokens: Record<string, Token> = {};
  for (const token of Object.values(preset.tokens)) {
    if (!isTokenGroup(token.group)) {
      throw new Error(`Preset token ${token.name} has unknown group "${token.group}"`);
    }
    tokens[token.name] = { ...token, group: token.group };
  }
  return { tokens };
}

export function createBlankProject(title: string): Project {
  const home: Page = { id: crypto.randomUUID(), name: 'Home', slug: 'home', blockIds: [] };
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    settings: { title, language: 'en' },
    designSystem: presetDesignSystem(clean),
    pages: { ids: [home.id], entities: { [home.id]: home }, homePageId: home.id },
    blocks: { ids: [], entities: {} },
  };
}

export function createSampleProject(): Project {
  const project = createBlankProject('Fieldnote');
  const blocks = SAMPLE_PAGE_COMPONENTS.map((componentId) => {
    const component = registry.get(componentId);
    if (!component) throw new Error(`The sample project needs component "${componentId}"`);
    return createBlock(component.definition);
  });
  const homeId = project.pages.homePageId;
  const home = { ...project.pages.entities[homeId], blockIds: blocks.map(({ id }) => id) };

  return {
    ...project,
    pages: { ...project.pages, entities: { [homeId]: home } },
    blocks: {
      ids: blocks.map(({ id }) => id),
      entities: Object.fromEntries(blocks.map((block) => [block.id, block])),
    },
  };
}
