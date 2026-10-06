import { visibleBlockLists } from '../app/blockLists';
import { slugify } from '../app/slugs';
import type { Asset, Page, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import { escapeHtml } from './attributes';
import { buildSiteCss } from './css';
import { buildPageHead } from './pageHead';
import { pageSlugsOf, renderBlock, renderContextFor, type RenderContext } from './renderBlock';

export type SiteRuntimeChunks = { core: string; behaviors: Record<string, string> };
export type ExportFiles = Record<string, string | Blob>;

type PageBlocks = { header: string[]; main: string[]; footer: string[] };

type PageDocument = { lang: string; head: string[]; blocks: PageBlocks; hasScript: boolean };

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DATA_URL = /^data:(?<mimeType>[^;,]+);base64,(?<data>.*)$/;
const FILE_EXTENSION = /\.[a-z0-9]+$/i;
const ASSET_ID_LENGTH = 8;

function renderPage({ lang, head, blocks, hasScript }: PageDocument): string {
  const lines = [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
    '<head>',
    ...head,
    '</head>',
    '<body>',
    ...blocks.header,
    '<main>',
    ...blocks.main,
    '</main>',
    ...blocks.footer,
  ];
  if (hasScript) lines.push('<script src="site.js" defer></script>');
  lines.push('</body>', '</html>', '');
  return lines.join('\n');
}

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
  return `${baseName}-${asset.id.slice(0, ASSET_ID_LENGTH)}.${extension}`;
}

function collectAssetFiles(project: Project): Record<string, string> {
  const assetFiles: Record<string, string> = {};
  for (const pageId of project.pages.ids) {
    const assetId = project.pages.entities[pageId]?.seo.socialImageAssetId;
    const asset = assetId === undefined ? undefined : project.assets[assetId];
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

type ComponentAssets = { styles: string[]; behaviorNames: string[] };

type UsedComponents = Map<string, RegisteredComponent>;

type RenderedPage = { page: Page; fileName: string; blocks: PageBlocks };

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
    const component = registry.get(block.componentId);
    if (component === undefined) {
      console.warn(`Export skipped block ${block.id}: unknown component "${block.componentId}"`);
      continue;
    }
    blockHtml.push(renderBlock(block, component, ctx));
    usedComponents.set(component.definition.id, component);
  }
  return blockHtml;
}

function collectComponentAssets(usedComponents: UsedComponents): ComponentAssets {
  const sortedComponents = [...usedComponents.values()];
  sortedComponents.sort((left, right) => left.definition.id.localeCompare(right.definition.id));
  const styles: string[] = [];
  const behaviorNames = new Set<string>();
  for (const { definition, styles: componentStyles } of sortedComponents) {
    styles.push(componentStyles);
    for (const name of definition.behaviors ?? []) behaviorNames.add(name);
  }
  const sortedBehaviorNames = [...behaviorNames];
  sortedBehaviorNames.sort();
  return { styles, behaviorNames: sortedBehaviorNames };
}

export function buildExportFiles(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  runtime: SiteRuntimeChunks,
): ExportFiles {
  if (project.pages.entities[project.pages.homePageId] === undefined) {
    throw new Error(`Home page ${project.pages.homePageId} does not exist`);
  }
  const pageSlugs = pageSlugsOf(project.pages);
  const usedComponents: UsedComponents = new Map();
  const renderedPages: RenderedPage[] = [];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    const slug = pageSlugs[pageId];
    if (page === undefined || slug === undefined) continue;
    const ctx = renderContextFor(project.settings, pageSlugs, 'export', pageId);
    const lists = visibleBlockLists(project, page);
    const blocks: PageBlocks = {
      header: renderBlocks(lists.header, project, registry, ctx, usedComponents),
      main: renderBlocks(lists.page, project, registry, ctx, usedComponents),
      footer: renderBlocks(lists.footer, project, registry, ctx, usedComponents),
    };
    renderedPages.push({ page, fileName: `${slug}.html`, blocks });
  }

  const assets = collectComponentAssets(usedComponents);
  const hasScript = assets.behaviorNames.length > 0;
  const assetFiles = collectAssetFiles(project);
  const files: ExportFiles = {};
  for (const { page, fileName, blocks } of renderedPages) {
    files[fileName] = renderPage({
      lang: project.settings.language,
      head: buildPageHead({ project, page, fileName, assetFiles }),
      blocks,
      hasScript,
    });
  }
  for (const [assetId, fileName] of Object.entries(assetFiles)) {
    const asset = project.assets[assetId];
    if (asset !== undefined) files[fileName] = dataUrlToBlob(asset.dataUrl);
  }
  files['site.css'] = buildSiteCss(project.designSystem.tokens, assets.styles);
  if (hasScript) files['site.js'] = buildSiteJs(assets.behaviorNames, runtime);
  return files;
}
