import type { EntityState } from '@reduxjs/toolkit';

export const TOKEN_GROUPS = [
  'color',
  'typography',
  'spacing',
  'shape',
  'elevation',
  'component',
  'motion',
] as const;

export type TokenGroup = (typeof TOKEN_GROUPS)[number];

export type Token = {
  name: string;
  label: string;
  group: TokenGroup;
  value: string;
};

export type DesignSystem = {
  tokens: Record<string, Token>;
};

export type Page = {
  id: string;
  name: string;
  slug: string;
  blockIds: string[];
};

export type ComponentBlock = {
  id: string;
  kind: 'component';
  componentId: string;
  componentVersion: number;
  values: Record<string, unknown>;
  overrides: Record<string, string>;
  disabled: boolean;
};

export type Block = ComponentBlock;

export type ProjectSettings = {
  title: string;
  language: string;
};

export type Project = {
  schemaVersion: 1;
  id: string;
  settings: ProjectSettings;
  designSystem: DesignSystem;
  pages: EntityState<Page, string> & { homePageId: string };
  blocks: EntityState<Block, string>;
};
