import type { EntityState } from '@reduxjs/toolkit';
import type { PackBlock } from '../components/types';

export const SCHEMA_VERSION = 1;

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

export const FONT_ROLES = ['heading', 'body'] as const;

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
  presetId?: string;
  tokens: Record<string, Token>;
  fonts: FontSelection[];
  generators: TokenGenerators;
  iconSet: string;
};

export type DesignSystemPreset = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  source: 'builtin' | 'user';
  designSystem: DesignSystem;
};

export const OPEN_GRAPH_TYPES = ['website', 'article', 'profile'] as const;

export type OpenGraphType = (typeof OPEN_GRAPH_TYPES)[number];

export const IMAGE_PREVIEW_SIZES = ['large', 'standard', 'none'] as const;

export type ImagePreviewSize = (typeof IMAGE_PREVIEW_SIZES)[number];

export const SITEMAP_FREQUENCIES = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const;

export type SitemapFrequency = (typeof SITEMAP_FREQUENCIES)[number];

export const PAGE_SCHEMA_TYPES = [
  'WebPage',
  'AboutPage',
  'ContactPage',
  'CollectionPage',
  'FAQPage',
  'ProfilePage',
] as const;

export type PageSchemaType = (typeof PAGE_SCHEMA_TYPES)[number];

export const SITE_ENTITY_TYPES = ['Organization', 'Person'] as const;

export type SiteEntityType = (typeof SITE_ENTITY_TYPES)[number];

export const META_ATTRIBUTES = ['name', 'property'] as const;

export type MetaAttribute = (typeof META_ATTRIBUTES)[number];

export type MetaTag = { attribute: MetaAttribute; key: string; content: string };

export const VERIFICATION_SERVICES = ['google', 'bing', 'yandex', 'pinterest', 'facebook'] as const;

export type VerificationService = (typeof VERIFICATION_SERVICES)[number];

export type SharedMeta = {
  author?: string;
  keywords?: string;
  follow?: boolean;
  snippets?: boolean;
  imagePreview?: ImagePreviewSize;
  translate?: boolean;
  openGraphType?: OpenGraphType;
  socialImageAlt?: string;
  twitterCreator?: string;
  themeColor?: string;
  sitemapFrequency?: SitemapFrequency;
  sitemapPriority?: number;
  metaTags?: MetaTag[];
  jsonLd?: string;
};

export type SiteMeta = SharedMeta & {
  appName?: string;
  backgroundColor?: string;
  twitterSite?: string;
  verification?: Partial<Record<VerificationService, string>>;
  blockAiCrawlers?: boolean;
  robotsRules?: string;
  schemaMarkup?: boolean;
  schemaEntity?: SiteEntityType;
  entityName?: string;
  socialProfiles?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type PageMeta = SharedMeta & {
  canonicalUrl?: string;
  sitemapExcluded?: boolean;
  schemaType?: PageSchemaType;
};

export type PageSeo = PageMeta & {
  title?: string;
  description?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImageAssetId?: string;
  noindex: boolean;
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

export type BlockBase = {
  id: string;
  disabled: boolean;
  anchor?: string;
  extraClasses: string[];
  hideOn: Device[];
};

export type ComponentBlock = BlockBase & {
  kind: 'component';
  componentId: string;
  values: Record<string, unknown>;
  overrides: Record<string, string>;
};

export type HtmlBlock = BlockBase & {
  kind: 'html';
  html: string;
  sourceComponentId?: string;
};

export type Block = ComponentBlock | HtmlBlock;

export type ProjectSettings = SiteMeta & {
  title: string;
  description: string;
  language: string;
  baseUrl?: string;
  titleTemplate: string;
  indexable: boolean;
  faviconAssetId?: string;
  socialImageAssetId?: string;
  appIconAssetId?: string;
};

export type Asset = { id: string; name: string; mimeType: string; dataUrl: string };

export type Project = {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  starterId?: string;
  settings: ProjectSettings;
  designSystem: DesignSystem;
  pages: EntityState<Page, string> & { homePageId: string };
  blocks: EntityState<Block, string>;
  sharedSlots: Record<SharedSlot, string[]>;
  packBlocks: Record<string, PackBlock>;
  assets: Record<string, Asset>;
};
