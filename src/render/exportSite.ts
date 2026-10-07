import { visibleBlockLists } from '../app/blockLists';
import { slugify } from '../app/slugs';
import type { Asset, FontSelection, Page, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import { escapeHtml } from './attributes';
import { buildSiteCss, buildTokensCss, CANVAS_BASE_CSS } from './css';
import { googleFontsHref } from './fonts';
import { formatHtml } from './formatHtml';
import { createRenderCollector, PLACEHOLDER_FOLDER, type RenderCollector } from './handlebars';
import { buildIconSprite } from './icons';
import { buildPageHead, SITE_CSS_PATH } from './pageHead';
import { placeholderSvg } from './placeholder';
import {
  pageSlugsOf,
  renderBlock,
  renderContextFor,
  siteContextOf,
  renderHtmlBlock,
  type RenderContext,
} from './renderBlock';
import { blockComponentId } from '../components/registry';

export type SiteRuntimeChunks = { core: string; behaviors: Record<string, string> };

export type ExportFiles = Record<string, string | Blob>;

export type ExportOmissions = { components: number; primitives: string[]; tokens: number };

export type ExportResult = { files: ExportFiles; notes: string[]; omitted: ExportOmissions };

export type PageBlocks = { header: string[]; main: string[]; footer: string[] };

export type RenderedPage = {
  page: Page;
  fileName: string;
  blocks: PageBlocks;
  collector: RenderCollector;
};

type UsedComponents = Map<string, RegisteredComponent>;

export const SITE_JS_PATH = 'assets/js/site.js';

const LICENSES_PATH = 'licenses.txt';
const GOOGLE_FONTS_ATTRIBUTION = 'https://fonts.google.com/attribution';
const BLOCK_INDENT = 1;
const MAIN_INDENT = 2;
const BEHAVIOR_ATTRIBUTE = /\sdata-behavior="(?<names>[^"]*)"/g;
const CLASS_ATTRIBUTE = /\sclass="(?<names>[^"]*)"/g;
const WHITESPACE = /\s+/;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
};

const DATA_URL = /^data:(?<mimeType>[^;,]+);base64,(?<data>.*)$/;
const FILE_EXTENSION = /\.[a-z0-9]+$/i;
const ASSET_ID_LENGTH = 8;

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = DATA_URL.exec(dataUrl)?.groups;
  if (parts?.mimeType === undefined || parts.data === undefined) {
    throw new Error('Only base64 data URLs can be exported as files');
  }
  const binary = atob(parts.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: parts.mimeType });
}

function assetFileName(asset: Asset): string {
  const extension = IMAGE_EXTENSIONS[asset.mimeType] ?? 'bin';
  const baseName = slugify(asset.name.replace(FILE_EXTENSION, ''));
  return `${PLACEHOLDER_FOLDER}/${baseName}-${asset.id.slice(0, ASSET_ID_LENGTH)}.${extension}`;
}

function usedAssetIds(project: Project): string[] {
  const assetIds: string[] = [];
  const { faviconAssetId, socialImageAssetId } = project.settings;
  if (faviconAssetId !== undefined) assetIds.push(faviconAssetId);
  if (socialImageAssetId !== undefined) assetIds.push(socialImageAssetId);
  for (const pageId of project.pages.ids) {
    const assetId = project.pages.entities[pageId]?.seo.socialImageAssetId;
    if (assetId !== undefined) assetIds.push(assetId);
  }
  return assetIds;
}

function collectAssetFiles(project: Project): Record<string, string> {
  const assetFiles: Record<string, string> = {};
  for (const assetId of usedAssetIds(project)) {
    const asset = project.assets[assetId];
    if (asset !== undefined) assetFiles[asset.id] = assetFileName(asset);
  }
  return assetFiles;
}

export function buildSiteJs(behaviorNames: string[], runtime: SiteRuntimeChunks): string {
  const chunks: string[] = [runtime.core];
  for (const name of behaviorNames) {
    const chunk = runtime.behaviors[name];
    if (chunk === undefined) throw new Error(`Unknown site runtime behavior "${name}"`);
    chunks.push(chunk);
  }
  chunks.push('siteRuntime.start(document);\n');
  return chunks.join('\n');
}

function renderBlocks(
  blockIds: string[],
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  ctx: RenderContext,
  usedComponents: UsedComponents,
): string[] {
  const blockHtml: string[] = [];
  for (const blockId of blockIds) {
    const block = project.blocks.entities[blockId];
    if (block === undefined) {
      console.warn(`Export skipped block ${blockId}: it is missing from the project`);
      continue;
    }
    if (block.disabled) continue;
    const componentId = blockComponentId(block);
    const component = componentId === null ? undefined : registry.get(componentId);
    if (component !== undefined) usedComponents.set(component.definition.id, component);
    if (block.kind === 'html') {
      blockHtml.push(renderHtmlBlock(block, ctx));
      continue;
    }
    if (component === undefined) {
      console.warn(`Export skipped block ${block.id}: unknown component "${block.componentId}"`);
      continue;
    }
    blockHtml.push(renderBlock(block, component, ctx));
  }
  return blockHtml;
}

export function renderProjectPage(
  project: Project,
  pageId: string,
  registry: ReadonlyMap<string, RegisteredComponent>,
  usedComponents: UsedComponents = new Map(),
): RenderedPage {
  const page = project.pages.entities[pageId];
  const pageSlugs = pageSlugsOf(project.pages);
  const slug = pageSlugs[pageId];
  if (page === undefined || slug === undefined) throw new Error(`Page ${pageId} does not exist`);
  const collector = createRenderCollector();
  const site = siteContextOf(project);
  const ctx: RenderContext = { ...renderContextFor(site, pageSlugs, 'export', pageId), collector };
  const lists = visibleBlockLists(project, page);
  const blocks: PageBlocks = {
    header: renderBlocks(lists.header, project, registry, ctx, usedComponents),
    main: renderBlocks(lists.page, project, registry, ctx, usedComponents),
    footer: renderBlocks(lists.footer, project, registry, ctx, usedComponents),
  };
  return { page, fileName: `${slug}.html`, blocks, collector };
}

function namesIn(html: string, pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const attributeValue = match.groups?.names ?? '';
    for (const name of attributeValue.split(WHITESPACE)) {
      if (name !== '') names.add(name);
    }
  }
  return names;
}

function sortedComponents(usedComponents: UsedComponents): RegisteredComponent[] {
  const components = [...usedComponents.values()];
  components.sort((left, right) => left.definition.id.localeCompare(right.definition.id));
  return components;
}

function usedFonts(fonts: FontSelection[], usedTokens: ReadonlySet<string>): FontSelection[] {
  const used: FontSelection[] = [];
  for (const font of fonts) {
    if (usedTokens.has(`--font-${font.role}`)) used.push(font);
  }
  return used;
}

export function buildLicensesText(iconSetIds: Iterable<string>, fonts: FontSelection[]): string {
  const lines = ['Third-party material used on this site', ''];
  const sortedSets = [...new Set(iconSetIds)];
  sortedSets.sort();
  if (sortedSets.length > 0) lines.push('Icons');
  for (const id of sortedSets) {
    const info = iconSetInfo(id);
    if (info === undefined) continue;
    lines.push(`- ${info.label}: ${info.license} (${info.licenseUrl})`);
  }
  const families = [...new Set(fonts.map((font) => font.family))];
  families.sort();
  if (families.length > 0) {
    if (sortedSets.length > 0) lines.push('');
    lines.push('Fonts, served by Google Fonts');
    for (const family of families) lines.push(`- ${family}`);
    lines.push(`Font licenses: ${GOOGLE_FONTS_ATTRIBUTION}`);
  }
  if (sortedSets.length === 0 && families.length === 0) lines.push('None.');
  return `${lines.join('\n')}\n`;
}

type PageDocument = {
  lang: string;
  head: string[];
  sprite: string | null;
  blocks: PageBlocks;
  hasScript: boolean;
};

function formattedBlocks(blocks: string[], depth: number): string[] {
  const lines: string[] = [];
  for (const html of blocks) lines.push(formatHtml(html, depth));
  return lines;
}

function renderPageDocument({ lang, head, sprite, blocks, hasScript }: PageDocument): string {
  const lines = [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
    '<head>',
    ...head,
    '</head>',
  ];
  lines.push('<body>');
  if (sprite !== null) lines.push(`  ${sprite}`);
  lines.push(...formattedBlocks(blocks.header, BLOCK_INDENT));
  lines.push('  <main>', ...formattedBlocks(blocks.main, MAIN_INDENT), '  </main>');
  lines.push(...formattedBlocks(blocks.footer, BLOCK_INDENT));
  if (hasScript) lines.push(`  <script src="${SITE_JS_PATH}" defer></script>`);
  lines.push('</body>', '</html>', '');
  return lines.join('\n');
}

function knownBehaviors(names: Set<string>, runtime: SiteRuntimeChunks, notes: string[]): string[] {
  const known: string[] = [];
  for (const name of names) {
    if (runtime.behaviors[name] === undefined) {
      notes.push(`Skipped the unknown behavior "${name}"`);
      continue;
    }
    known.push(name);
  }
  known.sort();
  return known;
}

export function buildExportFiles(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  runtime: SiteRuntimeChunks,
): ExportResult {
  if (project.pages.entities[project.pages.homePageId] === undefined) {
    throw new Error(`Home page ${project.pages.homePageId} does not exist`);
  }
  const usedComponents: UsedComponents = new Map();
  const renderedPages: RenderedPage[] = [];
  for (const pageId of project.pages.ids) {
    renderedPages.push(renderProjectPage(project, pageId, registry, usedComponents));
  }

  const allHtml: string[] = [];
  const iconSets = new Set<string>();
  const placeholders = new Map<string, string>();
  for (const { blocks, collector } of renderedPages) {
    allHtml.push(...blocks.header, ...blocks.main, ...blocks.footer);
    for (const set of collector.iconSets) iconSets.add(set);
    for (const [path, placeholder] of collector.images) {
      placeholders.set(path, placeholderSvg(placeholder));
    }
  }
  const html = allHtml.join('\n');
  const notes: string[] = [];
  const behaviorNames = knownBehaviors(namesIn(html, BEHAVIOR_ATTRIBUTE), runtime, notes);
  const hasScript = behaviorNames.length > 0;
  const components = sortedComponents(usedComponents);
  const siteCss = buildSiteCss({
    tokens: project.designSystem.tokens,
    componentStyles: components.map((component) => component.styles),
    usedClasses: namesIn(html, CLASS_ATTRIBUTE),
    htmlSources: [html],
  });
  const fonts = usedFonts(project.designSystem.fonts, siteCss.usedTokens);
  const fontsHref = googleFontsHref(fonts);
  const assetFiles = collectAssetFiles(project);

  const files: ExportFiles = {};
  for (const { page, fileName, blocks, collector } of renderedPages) {
    files[fileName] = renderPageDocument({
      lang: project.settings.language,
      head: buildPageHead({ project, page, fileName, assetFiles, fontsHref }),
      sprite: buildIconSprite(collector.icons.values()),
      blocks,
      hasScript,
    });
  }
  files[SITE_CSS_PATH] = siteCss.css;
  if (hasScript) files[SITE_JS_PATH] = buildSiteJs(behaviorNames, runtime);
  for (const [assetId, fileName] of Object.entries(assetFiles)) {
    const asset = project.assets[assetId];
    if (asset !== undefined) files[fileName] = dataUrlToBlob(asset.dataUrl);
  }
  for (const [path, svg] of placeholders) files[path] = svg;
  files[LICENSES_PATH] = buildLicensesText(iconSets, fonts);

  return {
    files,
    notes,
    omitted: {
      components: registry.size - components.length,
      primitives: siteCss.omittedPrimitives,
      tokens: Object.keys(project.designSystem.tokens).length - siteCss.usedTokens.size,
    },
  };
}

export function renderStandalonePage(
  project: Project,
  pageId: string,
  registry: ReadonlyMap<string, RegisteredComponent>,
  options: { shouldLinkFonts: boolean },
): string {
  const page = project.pages.entities[pageId];
  if (page === undefined) throw new Error(`Page ${pageId} does not exist`);
  const ctx = renderContextFor(
    siteContextOf(project),
    pageSlugsOf(project.pages),
    'preview',
    pageId,
  );
  const lists = visibleBlockLists(project, page);
  const usedComponents: UsedComponents = new Map();
  const header = renderBlocks(lists.header, project, registry, ctx, usedComponents);
  const main = renderBlocks(lists.page, project, registry, ctx, usedComponents);
  const footer = renderBlocks(lists.footer, project, registry, ctx, usedComponents);
  const styles = [CANVAS_BASE_CSS, buildTokensCss(project.designSystem.tokens)];
  for (const component of sortedComponents(usedComponents)) styles.push(component.styles);
  const fontsHref = options.shouldLinkFonts ? googleFontsHref(project.designSystem.fonts) : null;
  const fontsLink =
    fontsHref === null ? '' : `<link rel="stylesheet" href="${escapeHtml(fontsHref)}">`;
  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(project.settings.language)}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(page.name)}</title>`,
    fontsLink,
    `<style>${styles.join('\n')}</style>`,
    '</head>',
    `<body>${header.join('')}<main>${main.join('')}</main>${footer.join('')}</body>`,
    '</html>',
  ].join('\n');
}
