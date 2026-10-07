import Handlebars from 'handlebars/runtime';
import type { Block, ComponentBlock, HtmlBlock, Project } from '../app/types';
import type { RegisteredComponent } from '../components/types';
import { formatHtml } from './formatHtml';
import type { RenderData } from './handlebars';
import { decorateHtmlRoots, stripUnsafeHtml } from './htmlSafety';
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

export type SiteContext = { siteTitle: string; iconSet: string; language: string };

export function siteContextOf(project: Pick<Project, 'settings' | 'designSystem'>): SiteContext {
  return {
    siteTitle: project.settings.title,
    iconSet: project.designSystem.iconSet,
    language: project.settings.language,
  };
}

export function renderContextFor(
  { siteTitle, iconSet, language }: SiteContext,
  pageSlugs: Record<string, string>,
  mode: RenderContext['mode'],
  currentPageId: string | null,
): RenderContext {
  return { mode, site: { title: siteTitle }, pageSlugs, currentPageId, iconSet, language };
}

export function createRenderContext(
  project: Pick<Project, 'settings' | 'pages' | 'designSystem'>,
  mode: RenderContext['mode'],
  currentPageId: string | null = null,
): RenderContext {
  return renderContextFor(siteContextOf(project), pageSlugsOf(project.pages), mode, currentPageId);
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

function rootAttributes(block: ComponentBlock, ctx: RenderContext): string[] {
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
  block: ComponentBlock,
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
    iconSet: ctx.iconSet,
    language: ctx.language,
    collector: ctx.collector,
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

export function renderHtmlBlock(block: HtmlBlock, ctx: RenderContext): string {
  const { html } = stripUnsafeHtml(block.html);
  const decorated = decorateHtmlRoots(html, {
    anchor: block.anchor,
    classes: rootClasses(block, ctx),
  });
  if (ctx.mode === 'export') return decorated;
  const id = Handlebars.escapeExpression(block.id);
  return `<div data-block-id="${id}" data-html-block="">${decorated}</div>`;
}

export function renderAnyBlock(
  block: Block,
  registry: ReadonlyMap<string, RegisteredComponent>,
  ctx: RenderContext,
): string | null {
  if (block.kind === 'html') return renderHtmlBlock(block, ctx);
  const component = registry.get(block.componentId);
  if (component === undefined) return null;
  return renderBlock(block, component, ctx);
}

export function convertBlockToHtml(
  block: ComponentBlock,
  component: RegisteredComponent,
  project: Pick<Project, 'settings' | 'pages' | 'designSystem'>,
): string {
  const plain: ComponentBlock = {
    id: block.id,
    kind: 'component',
    componentId: block.componentId,
    componentVersion: block.componentVersion,
    values: block.values,
    overrides: block.overrides,
    disabled: block.disabled,
    extraClasses: [],
    hideOn: [],
  };
  return formatHtml(renderBlock(plain, component, createRenderContext(project, 'export')));
}
