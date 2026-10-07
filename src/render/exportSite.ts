import { visibleBlockLists } from '../app/blockLists';
import type { Page, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import {
  assembleSite,
  type ExportInput,
  type ExportResult,
  type PageBlocks,
  type PreparedFile,
  type PreparedPage,
  type SiteRuntimeChunks,
} from './assembleSite';
import { escapeHtml } from './attributes';
import { buildTokensCss, CANVAS_BASE_CSS } from './css';
import { textDirection } from './direction';
import { googleFontsHref } from './fonts';
import { formatHtml } from './formatHtml';
import { createRenderCollector, type RenderCollector } from './handlebars';
import { buildIconSprite } from './icons';
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

export type RenderedPage = {
  page: Page;
  fileName: string;
  blocks: PageBlocks;
  collector: RenderCollector;
};

type UsedComponents = Map<string, RegisteredComponent>;

const BLOCK_INDENT = 1;
const MAIN_INDENT = 2;

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

function sortedComponents(usedComponents: UsedComponents): RegisteredComponent[] {
  const components = [...usedComponents.values()];
  components.sort((left, right) => compareCodeUnits(left.definition.id, right.definition.id));
  return components;
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function formattedBlocks(blocks: string[], depth: number): string[] {
  const lines: string[] = [];
  for (const html of blocks) lines.push(formatHtml(html, depth));
  return lines;
}

export function prepareExportInput(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): ExportInput {
  if (project.pages.entities[project.pages.homePageId] === undefined) {
    throw new Error(`Home page ${project.pages.homePageId} does not exist`);
  }
  const usedComponents: UsedComponents = new Map();
  const iconSets = new Set<string>();
  const placeholders = new Map<string, string>();
  const pages: PreparedPage[] = [];
  for (const pageId of project.pages.ids) {
    const { fileName, blocks, collector } = renderProjectPage(
      project,
      pageId,
      registry,
      usedComponents,
    );
    for (const set of collector.iconSets) iconSets.add(set);
    for (const [path, placeholder] of collector.images) {
      placeholders.set(path, placeholderSvg(placeholder));
    }
    pages.push({
      pageId,
      fileName,
      blocks: {
        header: formattedBlocks(blocks.header, BLOCK_INDENT),
        main: formattedBlocks(blocks.main, MAIN_INDENT),
        footer: formattedBlocks(blocks.footer, BLOCK_INDENT),
      },
      sprite: buildIconSprite(collector.icons.values()),
    });
  }
  const components = sortedComponents(usedComponents);
  const placeholderFiles: PreparedFile[] = [];
  for (const [path, content] of placeholders) placeholderFiles.push({ path, content });
  const { settings, pages: projectPages, assets, designSystem } = project;
  return {
    site: { settings, pages: projectPages, assets, designSystem },
    pages,
    iconSets: [...iconSets],
    placeholders: placeholderFiles,
    componentStyles: components.map((component) => component.styles),
    omittedComponents: registry.size - components.length,
  };
}

export function buildExportFiles(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  runtime: SiteRuntimeChunks,
): ExportResult {
  return assembleSite(prepareExportInput(project, registry), runtime);
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
    `<html lang="${escapeHtml(project.settings.language)}" dir="${textDirection(project.settings.language)}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(page.name)}</title>`,
    fontsLink,
    `<style>${styles.join('\n')}</style>`,
    '</head>',
    `<body>${header.join('')}<main>${main.join('')}</main>${footer.join('')}</body>`,
    '</html>',
  ].join('\n');
}
