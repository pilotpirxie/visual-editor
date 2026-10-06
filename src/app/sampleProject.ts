import { createBlock, registry } from '../components/registry';
import clean from '../presets/clean.json';
import {
  TOKEN_GROUPS,
  type DesignSystem,
  type Project,
  type Token,
  type TokenGroup,
} from './types';

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

export function createSampleProject(): Project {
  const blocks = SAMPLE_PAGE_COMPONENTS.map((componentId) => {
    const component = registry.get(componentId);
    if (!component) throw new Error(`The sample project needs component "${componentId}"`);
    return createBlock(component.definition);
  });
  const home = {
    id: crypto.randomUUID(),
    name: 'Home',
    slug: 'home',
    blockIds: blocks.map(({ id }) => id),
  };

  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    settings: { title: 'Fieldnote', language: 'en' },
    designSystem: presetDesignSystem(clean),
    pages: { ids: [home.id], entities: { [home.id]: home }, homePageId: home.id },
    blocks: {
      ids: blocks.map(({ id }) => id),
      entities: Object.fromEntries(blocks.map((block) => [block.id, block])),
    },
  };
}
