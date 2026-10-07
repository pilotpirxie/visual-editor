import { describe, expect, it } from 'vitest';
import { registry } from '../components/registry';
import { CLEAN_PRESET } from '../presets/presets';
import { blockSectionThemeSet, projectSlice } from './projectSlice';
import { createSampleProject } from './projectFactory';
import {
  activeSectionTheme,
  isThemeToken,
  SECTION_THEMES,
  supportsSectionThemes,
  THEME_TOKEN_NAMES,
  themeTokenName,
} from './sectionThemes';
import { componentBlockOf, homePage } from '../test/fixtures';

function overridesOf(themeId: string): Record<string, string> {
  const theme = SECTION_THEMES.find(({ id }) => id === themeId);
  if (theme === undefined) throw new Error(`No theme ${themeId}`);
  const overrides: Record<string, string> = {};
  for (const [token, value] of Object.entries(theme.overrides)) overrides[token] = value;
  return overrides;
}

describe('section themes', () => {
  it('are Default, Surface, Dark and Primary', () => {
    expect(SECTION_THEMES.map(({ label }) => label)).toEqual([
      'Default',
      'Surface',
      'Dark',
      'Primary',
    ]);
  });

  it('point Dark and Primary at theme tokens every preset defines', () => {
    expect(overridesOf('dark')['--color-primary']).toBe('var(--theme-dark-accent)');
    expect(overridesOf('primary')['--color-background']).toBe('var(--theme-primary-background)');
    expect(themeTokenName('primary', '--color-primary-contrast')).toBe(
      '--theme-primary-accent-contrast',
    );
    for (const name of THEME_TOKEN_NAMES) {
      expect(isThemeToken(name)).toBe(true);
      expect(CLEAN_PRESET.designSystem.tokens[name]?.group, name).toBe('color');
    }
  });

  it('recognizes the theme a block uses and treats a mix as no theme', () => {
    expect(activeSectionTheme({})).toBe('default');
    expect(activeSectionTheme({ '--section-padding-y': '1rem' })).toBe('default');
    expect(activeSectionTheme(overridesOf('dark'))).toBe('dark');
    expect(activeSectionTheme({ ...overridesOf('dark'), '--color-text': '#ffffff' })).toBeNull();
  });

  it('are offered on blocks that let users change their background', () => {
    const hero = registry.get('hero-centered')?.definition;
    const banner = registry.get('cta-banner')?.definition;
    expect(hero !== undefined && supportsSectionThemes(hero)).toBe(true);
    expect(banner !== undefined && supportsSectionThemes(banner)).toBe(false);
  });
});

describe('blockSectionThemeSet', () => {
  it('replaces earlier theme colors and keeps other overrides', () => {
    const project = createSampleProject();
    const heroId = homePage(project).blockIds[1] ?? '';
    componentBlockOf(project, heroId).overrides = {
      '--color-text': '#123456',
      '--section-padding-y': '1rem',
    };
    const next = projectSlice.reducer(
      project,
      blockSectionThemeSet({ blockId: heroId, themeId: 'primary' }),
    );
    expect(componentBlockOf(next, heroId).overrides).toEqual({
      ...overridesOf('primary'),
      '--section-padding-y': '1rem',
    });
  });

  it('ignores unknown themes and blocks without themes', () => {
    const project = createSampleProject();
    const heroId = homePage(project).blockIds[1] ?? '';
    const unknown = projectSlice.reducer(
      project,
      blockSectionThemeSet({ blockId: heroId, themeId: 'neon' }),
    );
    expect(unknown).toBe(project);
    expect(
      projectSlice.reducer(project, blockSectionThemeSet({ blockId: 'missing', themeId: 'dark' })),
    ).toBe(project);
  });
});
