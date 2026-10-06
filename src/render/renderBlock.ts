import Handlebars from 'handlebars/runtime';
import type { Block, Project, ProjectSettings } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import type { RenderData } from './handlebars';
import './handlebars';

export type RenderContext = RenderData & {
  mode: 'canvas' | 'preview' | 'export';
  site: { title: string };
};

const ROOT_OPEN_TAG = /^<(?<tag>[a-z][a-z0-9-]*)(?<attributes>[^>]*)>/i;
const CLASS_ATTRIBUTE = /\sclass="(?<classes>[^"]*)"/i;
const EDITOR_ONLY_ATTRIBUTES = ['data-field'];

export function pageSlugsOf(pages: Project['pages']): Record<string, string> {
  const { ids, entities, homePageId } = pages;
  const pageSlugs: Record<string, string> = {};
  for (const id of ids) {
    const page = entities[id];
    if (page === undefined) continue;
    pageSlugs[id] = id === homePageId ? 'index' : page.slug;
  }
  return pageSlugs;
}

export function renderContextFor(
  settings: ProjectSettings,
  pageSlugs: Record<string, string>,
  mode: RenderContext['mode'],
  currentPageId: string | null,
): RenderContext {
  return { mode, site: { title: settings.title }, pageSlugs, currentPageId };
}

export function createRenderContext(
  project: Pick<Project, 'settings' | 'pages'>,
  mode: RenderContext['mode'],
  currentPageId: string | null = null,
): RenderContext {
  return renderContextFor(project.settings, pageSlugsOf(project.pages), mode, currentPageId);
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

function rootAttributes(block: Block, ctx: RenderContext): string[] {
  const escape = Handlebars.escapeExpression;
  const attributes = [`data-component="${escape(block.componentId)}"`];
  if (ctx.mode !== 'export') attributes.push(`data-block-id="${escape(block.id)}"`);
  if (block.anchor !== undefined) attributes.push(`id="${escape(block.anchor)}"`);
  const overrideDeclarations: string[] = [];
  for (const [token, value] of Object.entries(block.overrides)) {
    overrideDeclarations.push(`${token}: ${value}`);
  }
  if (overrideDeclarations.length > 0) {
    attributes.push(`style="${escape(overrideDeclarations.join('; '))}"`);
  }
  return attributes;
}

function rootClasses(block: Block, ctx: RenderContext): string[] {
  const classes = [...block.extraClasses];
  if (ctx.mode !== 'canvas') {
    for (const device of block.hideOn) classes.push(`hide-${device}`);
  }
  return classes;
}

function withClasses(attributes: string, classes: string[]): string {
  if (classes.length === 0) return attributes;
  const added = Handlebars.escapeExpression(classes.join(' '));
  const existing = CLASS_ATTRIBUTE.exec(attributes)?.groups?.classes;
  if (existing === undefined) return `${attributes} class="${added}"`;
  return attributes.replace(CLASS_ATTRIBUTE, ` class="${existing} ${added}"`);
}

export function renderBlock(
  block: Block,
  component: RegisteredComponent,
  ctx: RenderContext,
): string {
  const templateValues = {
    ...block.values,
    block: { id: block.id, anchor: block.anchor ?? '' },
    site: ctx.site,
  };
  const renderData: RenderData = {
    pageSlugs: ctx.pageSlugs,
    currentPageId: ctx.currentPageId,
    eagerImages: component.definition.category === 'headers',
  };
  const html = component.template(templateValues, { data: renderData }).trim();
  const root = ROOT_OPEN_TAG.exec(html)?.groups;
  if (root?.tag === undefined || root.attributes === undefined) {
    throw new Error(
      `Component ${component.definition.id}: template must start with its root element`,
    );
  }
  const attributes = rootAttributes(block, ctx).join(' ');
  const openTag = `<${root.tag} ${attributes}${withClasses(root.attributes, rootClasses(block, ctx))}>`;
  const withRoot = html.replace(ROOT_OPEN_TAG, () => openTag);
  if (ctx.mode === 'export') return stripEditorAttributes(withRoot);
  return withRoot;
}
