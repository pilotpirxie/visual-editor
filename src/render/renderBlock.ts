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
const DATA_FIELD_ATTRIBUTE = /\sdata-field="[^"]*"/g;

export function createRenderContext(
  project: Pick<Project, 'settings' | 'pages'>,
  mode: RenderContext['mode'],
): RenderContext {
  const { ids, entities, homePageId } = project.pages;
  return {
    mode,
    site: { title: project.settings.title },
    pageSlugs: Object.fromEntries(
      ids.map((id) => [id, id === homePageId ? 'index' : entities[id].slug]),
    ),
  };
}

export function renderBlock(
  block: Block,
  component: RegisteredComponent,
  ctx: RenderContext,
): string {
  const html = component
    .template(
      { ...block.values, block: { id: block.id }, site: ctx.site },
      { data: { pageSlugs: ctx.pageSlugs } },
    )
    .trim();
  if (!ROOT_OPEN_TAG.test(html)) {
    throw new Error(
      `Component ${component.definition.id}: template must start with its root element`,
    );
  }
  const escape = Handlebars.escapeExpression;
  const attributes = [`data-component="${escape(block.componentId)}"`];
  if (ctx.mode === 'canvas') attributes.push(`data-block-id="${escape(block.id)}"`);
  const overrides = Object.entries(block.overrides)
    .map(([token, value]) => `${token}: ${value}`)
    .join('; ');
  if (overrides) attributes.push(`style="${escape(overrides)}"`);

  const withRoot = html.replace(ROOT_OPEN_TAG, (openTag) => `${openTag} ${attributes.join(' ')}`);
  return ctx.mode === 'export' ? withRoot.replace(DATA_FIELD_ATTRIBUTE, '') : withRoot;
}
