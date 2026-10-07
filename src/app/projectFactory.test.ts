import { describe, expect, it } from 'vitest';
import { BUILTIN_PRESETS, CLEAN_PRESET } from '../presets/presets';
import { DEFAULT_TITLE_TEMPLATE } from '../render/pageHead';
import { componentBlockOf } from '../test/fixtures';
import {
  createBlankProject,
  createPage,
  createSampleProject,
  UNTITLED_PROJECT_TITLE,
} from './projectFactory';
import { SCHEMA_VERSION, type DesignSystemPreset } from './types';

function presetById(id: string): DesignSystemPreset {
  const preset = BUILTIN_PRESETS.find((item) => item.id === id);
  if (preset === undefined) throw new Error(`No built-in preset "${id}"`);
  return preset;
}

describe('createPage', () => {
  it('creates an empty page with the given id, name and slug', () => {
    expect(createPage('about', 'About', 'about')).toEqual({
      id: 'about',
      name: 'About',
      slug: 'about',
      blockIds: [],
      seo: { noindex: false },
      showSharedHeader: true,
      showSharedFooter: true,
    });
  });

  it('returns separate block lists for separate pages', () => {
    const first = createPage('a', 'A', 'a');
    const second = createPage('b', 'B', 'b');
    first.blockIds.push('block');
    expect(second.blockIds).toEqual([]);
  });
});

describe('createBlankProject', () => {
  it('uses the given title and default settings', () => {
    const project = createBlankProject('Harbor Bakery');
    expect(project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(project.settings).toEqual({
      title: 'Harbor Bakery',
      description: '',
      language: 'en',
      titleTemplate: DEFAULT_TITLE_TEMPLATE,
      indexable: true,
    });
  });

  it('starts with one home page and no blocks, shared blocks or assets', () => {
    const project = createBlankProject(UNTITLED_PROJECT_TITLE);
    const { homePageId } = project.pages;
    expect(project.pages.ids).toEqual([homePageId]);
    expect(project.pages.entities[homePageId]?.name).toBe('Home');
    expect(project.pages.entities[homePageId]?.slug).toBe('home');
    expect(project.pages.entities[homePageId]?.blockIds).toEqual([]);
    expect(project.blocks).toEqual({ ids: [], entities: {} });
    expect(project.sharedSlots).toEqual({ header: [], footer: [] });
    expect(project.customDefinitions).toEqual({});
    expect(project.assets).toEqual({});
  });

  it('uses the Clean preset when no preset is given', () => {
    const project = createBlankProject('Fieldnote');
    expect(project.designSystem.presetId).toBe('clean');
    expect(project.designSystem.tokens).toEqual(CLEAN_PRESET.designSystem.tokens);
    expect(project.designSystem.fonts).toEqual(CLEAN_PRESET.designSystem.fonts);
    expect(project.designSystem.iconSet).toBe(CLEAN_PRESET.designSystem.iconSet);
  });

  it('takes tokens, fonts, generators and the icon set from the given preset', () => {
    const midnight = presetById('midnight');
    const project = createBlankProject('Orbit', midnight);
    expect(project.designSystem).toEqual({ ...midnight.designSystem, presetId: 'midnight' });
  });

  it('copies the preset so editing the project never changes the preset', () => {
    const playful = presetById('playful');
    const primaryBefore = playful.designSystem.tokens['--color-primary']?.value;
    const project = createBlankProject('Tandem', playful);
    const primary = project.designSystem.tokens['--color-primary'];
    if (primary === undefined) throw new Error('The preset has no primary color');
    primary.value = '#000000';
    project.designSystem.fonts.length = 0;
    expect(playful.designSystem.tokens['--color-primary']?.value).toBe(primaryBefore);
    expect(playful.designSystem.fonts.length).toBeGreaterThan(0);
  });

  it('gives each new project its own project and page ids', () => {
    const first = createBlankProject('One');
    const second = createBlankProject('Two');
    expect(first.id).not.toBe(second.id);
    expect(first.pages.homePageId).not.toBe(second.pages.homePageId);
    expect(first.id).not.toBe(first.pages.homePageId);
  });

  it('keeps an empty title as given, leaving validation to the caller', () => {
    expect(createBlankProject('').settings.title).toBe('');
  });
});

describe('createSampleProject', () => {
  it('places a navigation, hero, features and footer block on the home page', () => {
    const project = createSampleProject();
    const home = project.pages.entities[project.pages.homePageId];
    const componentIds: string[] = [];
    for (const blockId of home?.blockIds ?? []) {
      componentIds.push(componentBlockOf(project, blockId).componentId);
    }
    expect(componentIds).toEqual([
      'nav-simple',
      'hero-centered',
      'features-grid-3',
      'footer-simple',
    ]);
    expect(project.blocks.ids).toEqual(home?.blockIds);
  });

  it('titles the sample project Fieldnote', () => {
    expect(createSampleProject().settings.title).toBe('Fieldnote');
  });
});
