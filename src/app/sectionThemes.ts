import type { ComponentDefinition } from '../components/types';

export const THEMED_TOKENS = [
  '--color-background',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-border',
  '--color-primary',
  '--color-primary-contrast',
] as const;

export type ThemedToken = (typeof THEMED_TOKENS)[number];

export const THEME_FAMILIES = ['dark', 'primary'] as const;

export type ThemeFamily = (typeof THEME_FAMILIES)[number];

export const SECTION_THEME_IDS = ['default', 'surface', 'dark', 'primary'] as const;

export type SectionThemeId = (typeof SECTION_THEME_IDS)[number];

export type SectionTheme = {
  id: SectionThemeId;
  label: string;
  overrides: Partial<Record<ThemedToken, string>>;
};

const THEME_TOKEN_ROLES: Record<ThemedToken, string> = {
  '--color-background': 'background',
  '--color-surface': 'surface',
  '--color-text': 'text',
  '--color-text-muted': 'text-muted',
  '--color-border': 'border',
  '--color-primary': 'accent',
  '--color-primary-contrast': 'accent-contrast',
};

const THEME_TOKEN_PREFIX = '--theme-';

export function themeTokenName(family: ThemeFamily, token: ThemedToken): string {
  return `${THEME_TOKEN_PREFIX}${family}-${THEME_TOKEN_ROLES[token]}`;
}

export function isThemeToken(name: string): boolean {
  return name.startsWith(THEME_TOKEN_PREFIX);
}

export function themeFamilyTokenNames(family: ThemeFamily): string[] {
  return THEMED_TOKENS.map((token) => themeTokenName(family, token));
}

function allThemeTokenNames(): string[] {
  const names: string[] = [];
  for (const family of THEME_FAMILIES) names.push(...themeFamilyTokenNames(family));
  return names;
}

export const THEME_TOKEN_NAMES = allThemeTokenNames();

function familyOverrides(family: ThemeFamily): Partial<Record<ThemedToken, string>> {
  const overrides: Partial<Record<ThemedToken, string>> = {};
  for (const token of THEMED_TOKENS) overrides[token] = `var(${themeTokenName(family, token)})`;
  return overrides;
}

export const SECTION_THEMES: readonly SectionTheme[] = [
  { id: 'default', label: 'Default', overrides: {} },
  { id: 'surface', label: 'Surface', overrides: { '--color-background': 'var(--color-surface)' } },
  { id: 'dark', label: 'Dark', overrides: familyOverrides('dark') },
  { id: 'primary', label: 'Primary', overrides: familyOverrides('primary') },
];

export function sectionThemeById(id: string): SectionTheme | null {
  return SECTION_THEMES.find((theme) => theme.id === id) ?? null;
}

export function activeSectionTheme(overrides: Record<string, string>): SectionThemeId | null {
  const theme = SECTION_THEMES.find(({ overrides: themeOverrides }) =>
    THEMED_TOKENS.every((token) => overrides[token] === themeOverrides[token]),
  );
  return theme?.id ?? null;
}

export function supportsSectionThemes(definition: ComponentDefinition): boolean {
  return definition.styleOverrides.includes('--color-background');
}
