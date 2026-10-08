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
  EDITOR_ONLY_ATTRIBUTES,
  type RenderContext,
} from './renderBlock';
import { blockComponentId } from '../components/registry';

export type RenderedBlock = { html: string; isComponent: boolean };

type RenderedBlocks = Record<keyof PageBlocks, RenderedBlock[]>;

export type RenderedPage = {
  page: Page;
  fileName: string;
  blocks: RenderedBlocks;
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
): RenderedBlock[] {
  const rendered: RenderedBlock[] = [];
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
      rendered.push({ html: renderHtmlBlock(block, ctx), isComponent: false });
      continue;
    }
    if (component === undefined) {
      console.warn(`Export skipped block ${block.id}: unknown component "${block.componentId}"`);
      continue;
    }
    rendered.push({ html: renderBlock(block, component, ctx), isComponent: true });
  }
  return rendered;
}

function renderPageBlocks(
  project: Project,
  page: Page,
  registry: ReadonlyMap<string, RegisteredComponent>,
  ctx: RenderContext,
  usedComponents: UsedComponents,
): RenderedBlocks {
  const lists = visibleBlockLists(project, page);
  return {
    header: renderBlocks(lists.header, project, registry, ctx, usedComponents),
    main: renderBlocks(lists.page, project, registry, ctx, usedComponents),
    footer: renderBlocks(lists.footer, project, registry, ctx, usedComponents),
  };
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
  const blocks = renderPageBlocks(project, page, registry, ctx, usedComponents);
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

type BlockFormatter = (blocks: RenderedBlock[], depth: number) => string[];

function createBlockFormatter(): BlockFormatter {
  const formatted = new Map<string, string>();
  return (blocks, depth) => {
    const lines: string[] = [];
    for (const { html, isComponent } of blocks) {
      const key = `${depth}:${isComponent ? 'c' : 'h'}:${html}`;
      let output = formatted.get(key);
      if (output === undefined) {
        output = formatHtml(html, depth, isComponent ? EDITOR_ONLY_ATTRIBUTES : []);
        formatted.set(key, output);
      }
      lines.push(output);
    }
    return lines;
  };
}

function htmlOf(blocks: RenderedBlock[]): string {
  let html = '';
  for (const block of blocks) html += block.html;
  return html;
}

export function prepareExportInput(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): ExportInput {
  if (project.pages.entities[project.pages.homePageId] === undefined) {
    throw new Error(`Home page ${project.pages.homePageId} does not exist`);
  }
  const usedComponents: UsedComponents = new Map();
  const formatBlocks = createBlockFormatter();
  const iconSets = new Set<string>();
  const placeholders = new Map<string, string>();
  const uploads = new Map<string, string>();
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
    for (const [path, dataUrl] of collector.uploads) uploads.set(path, dataUrl);
    pages.push({
      pageId,
      fileName,
      blocks: {
        header: formatBlocks(blocks.header, BLOCK_INDENT),
        main: formatBlocks(blocks.main, MAIN_INDENT),
        footer: formatBlocks(blocks.footer, BLOCK_INDENT),
      },
      sprite: buildIconSprite(collector.icons.values()),
    });
  }
  const components = sortedComponents(usedComponents);
  const placeholderFiles: PreparedFile[] = [];
  for (const [path, content] of placeholders) placeholderFiles.push({ path, content });
  const uploadFiles: PreparedFile[] = [];
  for (const [path, content] of uploads) uploadFiles.push({ path, content });
  const { settings, pages: projectPages, assets, designSystem } = project;
  return {
    site: { settings, pages: projectPages, assets, designSystem },
    pages,
    iconSets: [...iconSets],
    placeholders: placeholderFiles,
    uploads: uploadFiles,
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
  const usedComponents: UsedComponents = new Map();
  const { header, main, footer } = renderPageBlocks(project, page, registry, ctx, usedComponents);
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
    `<body>${htmlOf(header)}<main>${htmlOf(main)}</main>${htmlOf(footer)}</body>`,
    '</html>',
  ].join('\n');
}
