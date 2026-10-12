import { copyProjectWithNewIds } from '../../app/projectCopy';
import { createBlankProject, createPage, UNTITLED_PROJECT_TITLE } from '../../app/projectFactory';
import { sectionThemeById, supportsSectionThemes } from '../../app/sectionThemes';
import type { Block, ComponentBlock, DesignSystem, HtmlBlock, Project } from '../../app/types';
import { builtInComponents, createBlock } from '../../components/registry';
import { parseProjectDocument } from '../../persistence/validateProject';
import { MAP_SERVICE_FIELD } from '../../render/handlebars';
import { stripUnsafeHtml } from '../../render/htmlSafety';
import { createRenderContext, renderBlock } from '../../render/renderBlock';
import { siteBlock } from './siteCatalog';
import type { SectionPlan, SectionWriting, SitePlan } from './siteSteps';
import { safeValues, type SitePages } from './siteValues';

export type SiteWriting = {
  shared: readonly SectionWriting[] | null;
  pages: Readonly<Record<string, readonly SectionWriting[] | null>>;
};

const REMOVED_ELEMENTS = 'img, picture, video, audio, source, track, form, input, select, textarea';
const LOADING_ATTRIBUTES = ['src', 'srcset', 'poster', 'background'];
const STYLE_URL = /url\s*\(/i;

export function safeCustomHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = stripUnsafeHtml(html).html;
  for (const element of template.content.querySelectorAll(REMOVED_ELEMENTS)) element.remove();
  for (const element of template.content.querySelectorAll('*')) {
    for (const name of LOADING_ATTRIBUTES) element.removeAttribute(name);
    const style = element.getAttribute('style');
    if (style !== null && STYLE_URL.test(style)) element.removeAttribute('style');
  }
  if ((template.content.textContent ?? '').trim() === '') return '';
  return template.innerHTML.trim();
}

function componentBlock(
  blockId: string,
  writing: SectionWriting | undefined,
  pages: SitePages,
): ComponentBlock | null {
  const definition = siteBlock(blockId);
  if (definition === null) return null;
  const block = createBlock(definition);
  const values = writing?.kind === 'values' ? writing.values : undefined;
  block.values = safeValues(definition.fields, values, pages);
  return block;
}

function sectionBlock(
  section: SectionPlan,
  writing: SectionWriting | undefined,
  pages: SitePages,
): Block | null {
  if (section.kind === 'block') {
    const block = componentBlock(section.blockId, writing, pages);
    const definition = siteBlock(section.blockId);
    const theme = sectionThemeById(section.theme);
    if (block === null || definition === null || theme === null) return block;
    if (supportsSectionThemes(definition)) Object.assign(block.overrides, theme.overrides);
    return block;
  }
  const html = writing?.kind === 'html' ? safeCustomHtml(writing.html) : '';
  if (html === '') return null;
  const custom: HtmlBlock = {
    id: crypto.randomUUID(),
    kind: 'html',
    html,
    disabled: false,
    extraClasses: [],
    hideOn: [],
  };
  return custom;
}

const WORDS = /[\p{L}\p{N}]+/gu;
const NAME_WORD = /^\p{Lu}\p{L}{2,}$/u;
const ADDRESS_PARTS = /[\n,]+/;

function wordsOf(text: string): string[] {
  return text.match(WORDS) ?? [];
}

export function knownAddress(address: string, brief: string): string {
  const known = new Set(wordsOf(brief.toLowerCase()));
  const knownParts: string[] = [];
  const knownNames: string[] = [];
  for (const part of address.split(ADDRESS_PARTS)) {
    const words = wordsOf(part);
    if (words.length === 0) continue;
    if (words.every((word) => known.has(word.toLowerCase()))) knownParts.push(part.trim());
    for (const word of words) {
      const isKnownName = NAME_WORD.test(word) && known.has(word.toLowerCase());
      if (isKnownName && !knownNames.includes(word)) knownNames.push(word);
    }
  }
  return knownParts.length > 0 ? knownParts.join(', ') : knownNames.join(' ');
}

export function withKnownMapAddresses(project: Project, brief: string): Project {
  const entities: Record<string, Block> = {};
  for (const block of Object.values(project.blocks.entities)) {
    entities[block.id] = block;
    if (block.kind !== 'component' || !(MAP_SERVICE_FIELD in block.values)) continue;
    const { address } = block.values;
    if (typeof address !== 'string') continue;
    const values = { ...block.values, address: knownAddress(address, brief) };
    entities[block.id] = { ...block, values };
  }
  return { ...project, blocks: { ids: project.blocks.ids, entities } };
}

export function withRenderableBlocks(project: Project): Project {
  const context = createRenderContext(project, 'export');
  const entities: Record<string, Block> = {};
  for (const block of Object.values(project.blocks.entities)) {
    entities[block.id] = block;
    if (block.kind !== 'component') continue;
    const component = builtInComponents.get(block.componentId);
    if (component === undefined) continue;
    try {
      renderBlock(block, component, context);
    } catch (error) {
      console.warn(`The written values of ${block.componentId} did not render`, error);
      entities[block.id] = { ...block, values: createBlock(component.definition).values };
    }
  }
  return { ...project, blocks: { ids: project.blocks.ids, entities } };
}

export function buildSiteProject(
  plan: SitePlan,
  designSystem: DesignSystem,
  writing: SiteWriting,
): Project {
  const title = plan.title === '' ? UNTITLED_PROJECT_TITLE : plan.title;
  const draft = createBlankProject(title);
  const homeId = plan.pages[0].slug;
  const pages: SitePages = { ids: plan.pages.map(({ slug }) => slug), homeId };
  draft.settings.description = plan.description;
  draft.settings.language = plan.language;
  draft.designSystem = structuredClone(designSystem);
  draft.pages = { ids: [], entities: {}, homePageId: homeId };

  function keep(block: Block | null, list: string[]): void {
    if (block === null) return;
    draft.blocks.ids.push(block.id);
    draft.blocks.entities[block.id] = block;
    list.push(block.id);
  }

  for (const pagePlan of plan.pages) {
    const page = createPage(pagePlan.slug, pagePlan.name, pagePlan.slug);
    const written = writing.pages[pagePlan.slug] ?? null;
    for (const [index, section] of pagePlan.sections.entries()) {
      keep(sectionBlock(section, written?.[index], pages), page.blockIds);
    }
    draft.pages.ids.push(page.id);
    draft.pages.entities[page.id] = page;
  }
  keep(componentBlock(plan.headerBlockId, writing.shared?.[0], pages), draft.sharedSlots.header);
  keep(componentBlock(plan.footerBlockId, writing.shared?.[1], pages), draft.sharedSlots.footer);

  return parseProjectDocument(copyProjectWithNewIds(draft, title));
}
