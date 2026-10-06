import Handlebars from 'handlebars/runtime';
import type { Page, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import { buildSiteCss } from './css';
import { createRenderContext, renderBlock } from './renderBlock';

export type SiteRuntimeChunks = { core: string; behaviors: Record<string, string> };
export type ExportFiles = Record<string, string>;

type PageDocument = { lang: string; title: string; body: string; hasScript: boolean };

function renderPage({ lang, title, body, hasScript }: PageDocument): string {
  const escape = Handlebars.escapeExpression;
  const lines = [
    '<!doctype html>',
    `<html lang="${escape(lang)}">`,
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escape(title)}</title>`,
    '  <link rel="stylesheet" href="site.css">',
    '</head>',
    '<body>',
    '<main>',
    body,
    '</main>',
  ];
  if (hasScript) lines.push('<script src="site.js" defer></script>');
  lines.push('</body>', '</html>', '');
  return lines.join('\n');
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

type RenderedPage = { blockHtml: string[]; usedComponents: RegisteredComponent[] };

type ComponentAssets = { styles: string[]; behaviorNames: string[] };

function renderPageBlocks(
  page: Page,
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): RenderedPage {
  const ctx = createRenderContext(project, 'export');
  const blockHtml: string[] = [];
  const usedComponents = new Map<string, RegisteredComponent>();
  for (const blockId of page.blockIds) {
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
  return { blockHtml, usedComponents: [...usedComponents.values()] };
}

function collectComponentAssets(components: RegisteredComponent[]): ComponentAssets {
  const sortedComponents = [...components];
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
  const page = project.pages.entities[project.pages.homePageId];
  if (page === undefined) throw new Error(`Home page ${project.pages.homePageId} does not exist`);

  const { blockHtml, usedComponents } = renderPageBlocks(page, project, registry);
  const assets = collectComponentAssets(usedComponents);
  const hasScript = assets.behaviorNames.length > 0;

  const files: ExportFiles = {
    'index.html': renderPage({
      lang: project.settings.language,
      title: `${page.name} | ${project.settings.title}`,
      body: blockHtml.join('\n'),
      hasScript,
    }),
    'site.css': buildSiteCss(project.designSystem.tokens, assets.styles),
  };
  if (hasScript) files['site.js'] = buildSiteJs(assets.behaviorNames, runtime);
  return files;
}
