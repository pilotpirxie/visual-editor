import Handlebars from 'handlebars/runtime';
import type { Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import { buildSiteCss } from './css';
import { createRenderContext, renderBlock } from './renderBlock';

export type SiteRuntimeChunks = { core: string; behaviors: Record<string, string> };
export type ExportFiles = Record<string, string>;

type PageDocument = { lang: string; title: string; body: string; hasScript: boolean };

export function renderPage({ lang, title, body, hasScript }: PageDocument): string {
  const escape = Handlebars.escapeExpression;
  return [
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
    ...(hasScript ? ['<script src="site.js" defer></script>'] : []),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function buildSiteJs(behaviorNames: string[], runtime: SiteRuntimeChunks): string {
  const chunks = behaviorNames.map((name) => {
    const chunk = runtime.behaviors[name];
    if (!chunk) throw new Error(`Unknown site runtime behavior "${name}"`);
    return chunk;
  });
  return [runtime.core, ...chunks, 'siteRuntime.start(document);\n'].join('\n');
}

export function buildExportFiles(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  runtime: SiteRuntimeChunks,
): ExportFiles {
  const page = project.pages.entities[project.pages.homePageId];
  if (!page) throw new Error(`Home page ${project.pages.homePageId} does not exist`);

  const ctx = createRenderContext(project, 'export');
  const blockHtml: string[] = [];
  const usedComponents = new Map<string, RegisteredComponent>();
  for (const blockId of page.blockIds) {
    const block = project.blocks.entities[blockId];
    if (block.disabled) continue;
    const component = registry.get(block.componentId);
    if (!component) {
      console.warn(`Export skipped block ${block.id}: unknown component "${block.componentId}"`);
      continue;
    }
    blockHtml.push(renderBlock(block, component, ctx));
    usedComponents.set(component.definition.id, component);
  }

  const sortedComponents = [...usedComponents.values()].sort((a, b) =>
    a.definition.id.localeCompare(b.definition.id),
  );
  const componentStyles: string[] = [];
  const behaviorNames = new Set<string>();
  for (const { definition, styles } of sortedComponents) {
    componentStyles.push(styles);
    for (const name of definition.behaviors ?? []) behaviorNames.add(name);
  }
  const sortedBehaviorNames = [...behaviorNames].sort();
  const hasScript = sortedBehaviorNames.length > 0;

  const files: ExportFiles = {
    'index.html': renderPage({
      lang: project.settings.language,
      title: `${page.name} | ${project.settings.title}`,
      body: blockHtml.join('\n'),
      hasScript,
    }),
    'site.css': buildSiteCss(project.designSystem.tokens, componentStyles),
  };
  if (hasScript) files['site.js'] = buildSiteJs(sortedBehaviorNames, runtime);
  return files;
}
