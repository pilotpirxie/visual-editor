import Handlebars from 'handlebars/runtime';
import type { Block, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import type { RenderData } from './handlebars';
import './handlebars';

export type RenderContext = RenderData & {
  mode: 'canvas' | 'export';
  site: { title: string };
};

const ROOT_OPEN_TAG = /^<[a-z][a-z0-9-]*/i;
const EDITOR_ONLY_ATTRIBUTES = ['data-field'];

export function createRenderContext(
  project: Pick<Project, 'settings' | 'pages'>,
  mode: RenderContext['mode'],
): RenderContext {
  const { ids, entities, homePageId } = project.pages;
  const pageSlugs: Record<string, string> = {};
  for (const id of ids) {
    const page = entities[id];
    if (page === undefined) continue;
    pageSlugs[id] = id === homePageId ? 'index' : page.slug;
  }
  return { mode, site: { title: project.settings.title }, pageSlugs };
}

function stripEditorAttributes(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const name of EDITOR_ONLY_ATTRIBUTES) {
    for (const element of template.content.querySelectorAll(`[${name}]`)) {
      element.removeAttribute(name);
    }
  }
  return template.innerHTML;
}

export function renderBlock(
  block: Block,
  component: RegisteredComponent,
  ctx: RenderContext,
): string {
  const templateValues = { ...block.values, block: { id: block.id }, site: ctx.site };
  const renderData: RenderData = {
    pageSlugs: ctx.pageSlugs,
    eagerImages: component.definition.category === 'headers',
  };
  const html = component.template(templateValues, { data: renderData }).trim();
  if (!ROOT_OPEN_TAG.test(html)) {
    throw new Error(
      `Component ${component.definition.id}: template must start with its root element`,
    );
  }
  const escape = Handlebars.escapeExpression;
  const attributes = [`data-component="${escape(block.componentId)}"`];
  if (ctx.mode === 'canvas') attributes.push(`data-block-id="${escape(block.id)}"`);
  const overrideDeclarations: string[] = [];
  for (const [token, value] of Object.entries(block.overrides)) {
    overrideDeclarations.push(`${token}: ${value}`);
  }
  if (overrideDeclarations.length > 0) {
    attributes.push(`style="${escape(overrideDeclarations.join('; '))}"`);
  }

  const withRoot = html.replace(ROOT_OPEN_TAG, (openTag) => `${openTag} ${attributes.join(' ')}`);
  if (ctx.mode === 'export') return stripEditorAttributes(withRoot);
  return withRoot;
}
