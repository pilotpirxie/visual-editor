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

export const DEVICES = ['phone', 'tablet', 'desktop'] as const;

export type Device = (typeof DEVICES)[number];

export const SHARED_SLOTS = ['header', 'footer'] as const;

export type SharedSlot = (typeof SHARED_SLOTS)[number];

export const FONT_ROLES = ['heading', 'body', 'mono'] as const;

export type FontRole = (typeof FONT_ROLES)[number];

export type Token = {
  name: string;
  label: string;
  group: TokenGroup;
  value: string;
};

export type FontSelection = { role: FontRole; family: string; weights: number[] };

export type TokenGenerators = { typeBasePx: number; typeRatio: number; spaceUnitPx: number };

export type DesignSystem = {
  tokens: Record<string, Token>;
  fonts: FontSelection[];
  generators: TokenGenerators;
};

export type PageSeo = {
  title?: string;
  description?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImageAssetId?: string;
};

export type Page = {
  id: string;
  name: string;
  slug: string;
  blockIds: string[];
  seo: PageSeo;
  showSharedHeader: boolean;
  showSharedFooter: boolean;
};

export type ComponentBlock = {
  id: string;
  kind: 'component';
  componentId: string;
  componentVersion: number;
  values: Record<string, unknown>;
  overrides: Record<string, string>;
  disabled: boolean;
  anchor?: string;
  extraClasses: string[];
  hideOn: Device[];
};

export type Block = ComponentBlock;

export type ProjectSettings = {
  title: string;
  language: string;
  baseUrl?: string;
};

export type Asset = { id: string; name: string; mimeType: string; dataUrl: string };

export type Project = {
  schemaVersion: 2;
  id: string;
  settings: ProjectSettings;
  designSystem: DesignSystem;
  pages: EntityState<Page, string> & { homePageId: string };
  blocks: EntityState<Block, string>;
  sharedSlots: Record<SharedSlot, string[]>;
  assets: Record<string, Asset>;
};
