import { AI_CRAWLERS } from '../app/settingsRules';
import { slugify } from '../app/slugs';
import type { Asset, FontSelection, Page, Project, ProjectSettings, Token } from '../app/types';
import { resolveColor } from '../features/design-system/colors';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import { escapeHtml } from './attributes';
import { buildSiteCss } from './css';
import { textDirection } from './direction';
import { googleFontsHref } from './fonts';
import {
  absoluteUrl,
  buildPageHead,
  IMAGES_FOLDER,
  isPageIndexed,
  MANIFEST_PATH,
  resolvePageMeta,
  SITE_CSS_PATH,
} from './pageHead';

export type SiteRuntimeChunks = { core: string; behaviors: Record<string, string> };

export type ExportFiles = Record<string, string | Blob>;

export type ExportOmissions = { components: number; primitives: string[]; tokens: number };

export type ExportResult = { files: ExportFiles; notes: string[]; omitted: ExportOmissions };

export type PageBlocks = { header: string[]; main: string[]; footer: string[] };

export type PreparedPage = {
  pageId: string;
  fileName: string;
  blocks: PageBlocks;
  sprite: string | null;
};

export type PreparedFile = { path: string; content: string };

export type ExportSite = Pick<Project, 'settings' | 'pages' | 'assets' | 'designSystem'>;

export type ExportInput = {
  site: ExportSite;
  pages: PreparedPage[];
  iconSets: string[];
  placeholders: PreparedFile[];
  uploads: PreparedFile[];
  componentStyles: string[];
  omittedComponents: number;
};

export const SITE_JS_PATH = 'assets/js/site.js';

const LICENSES_PATH = 'licenses.txt';
const SITEMAP_PATH = 'sitemap.xml';
const ROBOTS_PATH = 'robots.txt';
const GOOGLE_FONTS_ATTRIBUTION = 'https://fonts.google.com/attribution';
const BEHAVIOR_ATTRIBUTE = /\sdata-behavior="(?<names>[^"]*)"/g;
const CLASS_ATTRIBUTE = /\sclass="(?<names>[^"]*)"/g;
const WHITESPACE = /\s+/;
const SKIP_LINK_CLASS = 'skip-link';
const MAIN_ID = 'main';
const ENGLISH = /^en(?:-|$)/i;

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
const LINE_BREAK = /\r?\n/;
const MANIFEST_INDENT = 2;

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
  return `${IMAGES_FOLDER}/${baseName}-${asset.id.slice(0, ASSET_ID_LENGTH)}.${extension}`;
}

const PNG_SIGNATURE_LENGTH = 8;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const PNG_HEADER_LENGTH = 24;
const PNG_HEADER_BASE64_LENGTH = 32;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export type ImageSize = { width: number; height: number };

export function pngSize(dataUrl: string): ImageSize | null {
  const data = DATA_URL.exec(dataUrl)?.groups?.data;
  if (data === undefined) return null;
  let binary: string;
  try {
    binary = atob(data.slice(0, PNG_HEADER_BASE64_LENGTH));
  } catch (error) {
    console.warn('Could not read the size of a PNG image', error);
    return null;
  }
  if (binary.length < PNG_HEADER_LENGTH) return null;
  for (let index = 0; index < PNG_SIGNATURE_LENGTH; index += 1) {
    if (binary.charCodeAt(index) !== PNG_SIGNATURE[index]) return null;
  }
  const view = new DataView(Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer);
  return { width: view.getUint32(PNG_WIDTH_OFFSET), height: view.getUint32(PNG_HEIGHT_OFFSET) };
}

function usedAssetIds(site: ExportSite): string[] {
  const assetIds: string[] = [];
  const { faviconAssetId, socialImageAssetId, appIconAssetId } = site.settings;
  if (faviconAssetId !== undefined) assetIds.push(faviconAssetId);
  if (socialImageAssetId !== undefined) assetIds.push(socialImageAssetId);
  if (appIconAssetId !== undefined) assetIds.push(appIconAssetId);
  for (const pageId of site.pages.ids) {
    const assetId = site.pages.entities[pageId]?.seo.socialImageAssetId;
    if (assetId !== undefined) assetIds.push(assetId);
  }
  return assetIds;
}

function collectAssetFiles(site: ExportSite): Record<string, string> {
  const assetFiles: Record<string, string> = {};
  for (const assetId of usedAssetIds(site)) {
    const asset = site.assets[assetId];
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

type IndexedFile = { page: Page; fileName: string };

type PageFile = IndexedFile & { prepared: PreparedPage };

function sitemapEntry(location: string, site: Pick<Project, 'settings'>, page: Page): string {
  const meta = resolvePageMeta(site, page);
  let entry = `<loc>${escapeHtml(location)}</loc>`;
  if (meta.sitemapFrequency !== undefined) {
    entry += `<changefreq>${meta.sitemapFrequency}</changefreq>`;
  }
  if (meta.sitemapPriority !== undefined) {
    entry += `<priority>${meta.sitemapPriority.toFixed(1)}</priority>`;
  }
  return `  <url>${entry}</url>`;
}

export function buildSitemap(site: Pick<Project, 'settings'>, files: IndexedFile[]): string | null {
  const entries: string[] = [];
  for (const { page, fileName } of files) {
    const location = absoluteUrl(site.settings.baseUrl, fileName);
    const isListed = isPageIndexed(site, page) && page.seo.sitemapExcluded !== true;
    if (location !== null && isListed) entries.push(sitemapEntry(location, site, page));
  }
  if (entries.length === 0) return null;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

function extraRobotsLines(rules: string | undefined): string[] {
  const lines: string[] = [];
  for (const line of rules?.split(LINE_BREAK) ?? []) {
    if (line.trim() !== '') lines.push(line.trim());
  }
  return lines;
}

export function buildRobotsTxt(settings: ProjectSettings, sitemapUrl: string | null): string {
  const lines = ['User-agent: *', 'Allow: /', ...extraRobotsLines(settings.robotsRules)];
  if (settings.blockAiCrawlers === true) {
    lines.push('');
    for (const crawler of AI_CRAWLERS) lines.push(`User-agent: ${crawler}`);
    lines.push('Disallow: /');
  }
  if (sitemapUrl !== null) lines.push('', `Sitemap: ${sitemapUrl}`);
  return `${lines.join('\n')}\n`;
}

function hasRobotsRules(settings: ProjectSettings): boolean {
  return settings.blockAiCrawlers === true || extraRobotsLines(settings.robotsRules).length > 0;
}

function addSearchEngineFiles(files: ExportFiles, site: ExportSite, pages: IndexedFile[]): void {
  const sitemap = buildSitemap(site, pages);
  const sitemapUrl = absoluteUrl(site.settings.baseUrl, SITEMAP_PATH);
  if (sitemap !== null && sitemapUrl !== null) files[SITEMAP_PATH] = sitemap;
  if (sitemapUrl === null && !hasRobotsRules(site.settings)) return;
  files[ROBOTS_PATH] = buildRobotsTxt(site.settings, sitemap === null ? null : sitemapUrl);
}

function manifestColor(
  value: string | undefined,
  tokens: Record<string, Token>,
): string | undefined {
  if (value === undefined) return undefined;
  return resolveColor(value, tokens);
}

export function buildWebManifest(
  site: ExportSite,
  assetFiles: Record<string, string>,
): string | null {
  const { settings, assets, designSystem } = site;
  const iconId = settings.appIconAssetId;
  const icon = iconId === undefined ? undefined : assets[iconId];
  const iconFile = iconId === undefined ? undefined : assetFiles[iconId];
  if (icon === undefined || iconFile === undefined) return null;
  const size = pngSize(icon.dataUrl);
  const manifest = {
    name: settings.title,
    short_name: settings.appName?.trim() || settings.title,
    description: settings.description.trim() || undefined,
    lang: settings.language,
    dir: textDirection(settings.language),
    start_url: './',
    scope: './',
    display: 'browser',
    theme_color: manifestColor(settings.themeColor, designSystem.tokens),
    background_color: manifestColor(settings.backgroundColor, designSystem.tokens),
    icons: [
      {
        src: iconFile,
        sizes: size === null ? undefined : `${size.width}x${size.height}`,
        type: icon.mimeType,
      },
    ],
  };
  return `${JSON.stringify(manifest, null, MANIFEST_INDENT)}\n`;
}

type PageDocument = {
  lang: string;
  head: string[];
  sprite: string | null;
  blocks: PageBlocks;
  hasScript: boolean;
};

function renderPageDocument({ lang, head, sprite, blocks, hasScript }: PageDocument): string {
  const lines = [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}" dir="${textDirection(lang)}">`,
    '<head>',
    ...head,
    '</head>',
  ];
  lines.push('<body>');
  const skipLinkLang = ENGLISH.test(lang) ? '' : ' lang="en"';
  lines.push(
    `  <a class="${SKIP_LINK_CLASS}" href="#${MAIN_ID}"${skipLinkLang}>Skip to content</a>`,
  );
  if (sprite !== null) lines.push(`  ${sprite}`);
  lines.push(...blocks.header);
  lines.push(`  <main id="${MAIN_ID}">`, ...blocks.main, '  </main>');
  lines.push(...blocks.footer);
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

function pageHtml(pages: PreparedPage[]): string {
  const uniqueBlocks = new Set<string>();
  for (const { blocks } of pages) {
    for (const html of [...blocks.header, ...blocks.main, ...blocks.footer]) uniqueBlocks.add(html);
  }
  return [...uniqueBlocks].join('\n');
}

function pageFilesOf(site: ExportSite, pages: PreparedPage[]): PageFile[] {
  const files: PageFile[] = [];
  for (const prepared of pages) {
    const page = site.pages.entities[prepared.pageId];
    if (page !== undefined) files.push({ page, fileName: prepared.fileName, prepared });
  }
  return files;
}

export function assembleSite(input: ExportInput, runtime: SiteRuntimeChunks): ExportResult {
  const { site, pages } = input;
  const html = pageHtml(pages);
  const notes: string[] = [];
  const behaviorNames = knownBehaviors(namesIn(html, BEHAVIOR_ATTRIBUTE), runtime, notes);
  const hasScript = behaviorNames.length > 0;
  const usedClasses = namesIn(html, CLASS_ATTRIBUTE);
  usedClasses.add(SKIP_LINK_CLASS);
  const siteCss = buildSiteCss({
    tokens: site.designSystem.tokens,
    componentStyles: input.componentStyles,
    usedClasses,
    htmlSources: [html],
  });
  const fonts = usedFonts(site.designSystem.fonts, siteCss.usedTokens);
  const fontsHref = googleFontsHref(fonts);
  const assetFiles = collectAssetFiles(site);
  const pageFiles = pageFilesOf(site, pages);

  const files: ExportFiles = {};
  for (const { page, fileName, prepared } of pageFiles) {
    files[fileName] = renderPageDocument({
      lang: site.settings.language,
      head: buildPageHead({ project: site, page, fileName, assetFiles, fontsHref }),
      sprite: prepared.sprite,
      blocks: prepared.blocks,
      hasScript,
    });
  }
  files[SITE_CSS_PATH] = siteCss.css;
  if (hasScript) files[SITE_JS_PATH] = buildSiteJs(behaviorNames, runtime);
  for (const [assetId, fileName] of Object.entries(assetFiles)) {
    const asset = site.assets[assetId];
    if (asset !== undefined) files[fileName] = dataUrlToBlob(asset.dataUrl);
  }
  for (const { path, content } of input.placeholders) files[path] = content;
  for (const { path, content } of input.uploads) files[path] = dataUrlToBlob(content);
  files[LICENSES_PATH] = buildLicensesText(input.iconSets, fonts);
  const manifest = buildWebManifest(site, assetFiles);
  if (manifest !== null) files[MANIFEST_PATH] = manifest;
  addSearchEngineFiles(files, site, pageFiles);

  return {
    files,
    notes,
    omitted: {
      components: input.omittedComponents,
      primitives: siteCss.omittedPrimitives,
      tokens: Object.keys(site.designSystem.tokens).length - siteCss.usedTokens.size,
    },
  };
}
