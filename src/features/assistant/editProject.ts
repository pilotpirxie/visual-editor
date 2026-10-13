import { findBlockList } from '../../app/blockLists';
import {
  blockInserted,
  blockMoved,
  blockRemoved,
  blockSectionThemeSet,
  blockValueSet,
  fontSet,
  pageAdded,
  projectSlice,
  settingSet,
  tokensSet,
  type FontChange,
  type NewPage,
} from '../../app/projectSlice';
import { activeSectionTheme, type SectionThemeId } from '../../app/sectionThemes';
import { uniqueSlug } from '../../app/slugs';
import type { Block, ComponentBlock, FontRole, Project } from '../../app/types';
import { asListItems, isImageValue, isRecord } from '../../components/fields';
import { builtInComponents } from '../../components/registry';
import type { ComponentDefinition, Field, ImageValue } from '../../components/types';
import { fontStack } from '../../render/fonts';
import { loadFontList } from '../design-system/fontList';
import { sectionBlock } from './buildSite';
import {
  decideRequest,
  parseDecision,
  parsePicks,
  pickRequest,
  writeRequest,
  type Decision,
  type Exchange,
  type SiteFacts,
} from './editSteps';
import type { Ask } from './generateSite';
import { parseSections, type PageName, type SectionWriting } from './siteSteps';
import { LOCKED_FIELD_NAMES, usableValue, type Kept, type SitePages } from './siteValues';

export type EditInput = {
  project: Project;
  openPageId: string;
  selectedBlockId: string | null;
  request: string;
  earlier: readonly Exchange[];
};

export type ProjectChange =
  | { kind: 'page'; page: NewPage }
  | { kind: 'add'; pageId: string; afterBlockId: string | null; block: Block }
  | { kind: 'values'; blockId: string; values: Record<string, unknown> }
  | { kind: 'theme'; blockId: string; themeId: SectionThemeId }
  | { kind: 'move'; blockId: string; afterBlockId: string | null }
  | { kind: 'remove'; blockId: string }
  | { kind: 'tokens'; values: Record<string, string> }
  | { kind: 'font'; change: FontChange }
  | { kind: 'setting'; key: 'title' | 'description'; value: string };

export type ProjectEdit = { reply: string; changes: ProjectChange[] };

export type AppliedEdit = { project: Project; summary: string[] };

export type Outline = { text: string; blockIds: ReadonlyMap<string, string> };

type KnownPages = { names: PageName[]; idOf: ReadonlyMap<string, string>; site: SitePages };

type CurrentContent = { shown: Record<string, unknown>; kept: Kept };

type Task = {
  definition: ComponentDefinition;
  note: string;
  current: Record<string, unknown> | null;
  target:
    | { kind: 'edit'; block: ComponentBlock; kept: Kept }
    | { kind: 'add'; pageId: string; afterBlockId: string | null; theme: SectionThemeId };
};

const WRITE_BATCH = 5;
const MAX_GIST_CHARS = 160;
const TEXT_TYPES = ['text', 'textarea', 'richtext'];
const TAGS = /<[^>]+>/g;
const SPACES = /\s+/g;
const FONT_LABELS: Record<FontRole, string> = { heading: 'headings', body: 'text' };

function definitionOf(project: Project, componentId: string): ComponentDefinition | null {
  const builtIn = builtInComponents.get(componentId)?.definition;
  return builtIn ?? project.packBlocks[componentId]?.definition ?? null;
}

function gistOf(definition: ComponentDefinition, values: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const field of definition.fields) {
    const value = values[field.name];
    if (typeof value !== 'string' || !TEXT_TYPES.includes(field.type)) continue;
    const plain = value.replace(TAGS, ' ').replace(SPACES, ' ').trim();
    if (plain !== '') parts.push(plain);
  }
  return parts.join(' | ').slice(0, MAX_GIST_CHARS);
}

function blockName(project: Project, blockId: string): string {
  const block = project.blocks.entities[blockId];
  if (block === undefined) return 'a section';
  if (block.kind === 'html') return 'Custom HTML section';
  return definitionOf(project, block.componentId)?.name ?? block.componentId;
}

function sectionSummary(project: Project, block: Block, isSelected: boolean): string {
  const marks: string[] = [];
  let gist = '';
  if (block.kind === 'html') {
    marks.push('cannot be edited');
  } else {
    const definition = definitionOf(project, block.componentId);
    if (definition !== null) {
      marks.push(definition.category);
      gist = gistOf(definition, block.values);
    }
    const theme = activeSectionTheme(block.overrides);
    if (theme !== null) marks.push(`theme ${theme}`);
  }
  if (block.disabled) marks.push('hidden');
  if (isSelected) marks.push('selected');
  const summary = `${blockName(project, block.id)} (${marks.join(', ')})`;
  return gist === '' ? summary : `${summary}: "${gist}"`;
}

export function editOutline(
  project: Project,
  openPageId: string,
  selectedBlockId: string | null,
): Outline {
  const blockIds = new Map<string, string>();

  function sectionLines(listed: readonly string[]): string[] {
    const lines: string[] = [];
    for (const blockId of listed) {
      const block = project.blocks.entities[blockId];
      if (block === undefined) continue;
      const ref = `s${blockIds.size + 1}`;
      blockIds.set(ref, blockId);
      lines.push(`  [${ref}] ${sectionSummary(project, block, blockId === selectedBlockId)}`);
    }
    if (lines.length === 0) lines.push('  (no sections)');
    return lines;
  }

  const { settings, designSystem, pages, sharedSlots } = project;
  const lines = [
    `Site name: ${settings.title}`,
    `Site description: ${settings.description}`,
    `Language: ${settings.language}`,
    '',
    'Navigation shown on every page:',
    ...sectionLines(sharedSlots.header),
  ];
  for (const pageId of pages.ids) {
    const page = pages.entities[pageId];
    if (page === undefined) continue;
    const openMark = pageId === openPageId ? ', the page the person has open' : '';
    lines.push(`Page "${page.name}" (slug "${page.slug}"${openMark}):`);
    lines.push(...sectionLines(page.blockIds));
  }
  lines.push('Footer shown on every page:', ...sectionLines(sharedSlots.footer));
  lines.push('', 'Design tokens as "name: value":');
  for (const token of Object.values(designSystem.tokens)) {
    lines.push(`  ${token.name}: ${token.value}`);
  }
  for (const font of designSystem.fonts) {
    lines.push(`Font for ${FONT_LABELS[font.role]}: ${font.family}`);
  }
  return { text: lines.join('\n'), blockIds };
}

function currentContent(
  definition: ComponentDefinition,
  block: ComponentBlock,
  slugOf: ReadonlyMap<string, string>,
): CurrentContent {
  const pictures = new Map<string, ImageValue>();
  const icons = new Set<string>();
  const anchors = new Set<string>();

  function shownLink(link: unknown): unknown {
    if (!isRecord(link)) return link;
    if (link.type === 'section' && typeof link.anchor === 'string') anchors.add(link.anchor);
    if (typeof link.pageId !== 'string') return link;
    return { ...link, pageId: slugOf.get(link.pageId) ?? link.pageId };
  }

  function shownImage(image: ImageValue): unknown {
    if (image.source === 'placeholder') {
      const { subject, ratio } = image.placeholder;
      return { alt: image.alt, subject, ratio };
    }
    const picture = `p${pictures.size + 1}`;
    pictures.set(picture, image);
    return { picture, alt: image.alt };
  }

  function shownValue(field: Field, value: unknown): unknown {
    if (field.type === 'list') {
      const items: unknown[] = [];
      for (const item of asListItems(value)) items.push(shownValues(field.itemFields ?? [], item));
      return items;
    } else if (field.type === 'image' && isImageValue(value)) {
      return shownImage(value);
    } else if (field.type === 'link') {
      return shownLink(value);
    } else if (field.type === 'button' && isRecord(value)) {
      return { ...value, link: shownLink(value.link) };
    } else {
      if (field.type === 'icon' && typeof value === 'string') icons.add(value);
      return value;
    }
  }

  function shownValues(
    fields: readonly Field[],
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const shown: Record<string, unknown> = {};
    for (const field of fields) {
      if (LOCKED_FIELD_NAMES.includes(field.name)) continue;
      shown[field.name] = shownValue(field, values[field.name]);
    }
    return shown;
  }

  const shown = shownValues(definition.fields, block.values);
  return { shown, kept: { pictures, icons, anchors } };
}

function withPageIds(value: unknown, idOf: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (const item of value) items.push(withPageIds(item, idOf));
    return items;
  }
  if (!isRecord(value)) return value;
  const mapped: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const pageId = key === 'pageId' && typeof entry === 'string' ? idOf.get(entry) : undefined;
    mapped[key] = pageId ?? withPageIds(entry, idOf);
  }
  return mapped;
}

function knownPages(
  project: Project,
  wanted: readonly PageName[],
): { known: KnownPages; added: NewPage[] } {
  const names: PageName[] = [];
  const idOf = new Map<string, string>();
  const ids: string[] = [];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page === undefined) continue;
    names.push({ name: page.name, slug: page.slug });
    idOf.set(page.slug, page.id);
    ids.push(page.id);
  }
  const added: NewPage[] = [];
  for (const { name, slug: wantedSlug } of wanted) {
    const takenSlugs = names.map((page) => page.slug);
    const slug = uniqueSlug(wantedSlug === '' ? name : wantedSlug, takenSlugs);
    const page: NewPage = { id: crypto.randomUUID(), name, slug };
    added.push(page);
    names.push({ name, slug });
    idOf.set(slug, page.id);
    if (!idOf.has(wantedSlug)) idOf.set(wantedSlug, page.id);
    ids.push(page.id);
  }
  const site: SitePages = { ids, homeId: project.pages.homePageId };
  return { known: { names, idOf, site }, added };
}

function editTasks(project: Project, decision: Decision, outline: Outline): Task[] {
  const slugOf = new Map<string, string>();
  for (const page of Object.values(project.pages.entities)) slugOf.set(page.id, page.slug);
  const tasks = new Map<string, Task>();
  for (const { ref, instruction } of decision.edits) {
    const block = project.blocks.entities[outline.blockIds.get(ref) ?? ''];
    if (block?.kind !== 'component') continue;
    const definition = definitionOf(project, block.componentId);
    if (definition === null) continue;
    const earlier = tasks.get(block.id);
    if (earlier !== undefined) {
      tasks.set(block.id, { ...earlier, note: `${earlier.note} ${instruction}` });
      continue;
    }
    const { shown, kept } = currentContent(definition, block, slugOf);
    const target = { kind: 'edit', block, kept } as const;
    tasks.set(block.id, { definition, note: instruction, current: shown, target });
  }
  return [...tasks.values()];
}

function addTasks(
  project: Project,
  decision: Decision,
  outline: Outline,
  picked: readonly (ComponentDefinition | null)[],
  pages: KnownPages,
): Task[] {
  const tasks: Task[] = [];
  for (const [index, add] of decision.adds.entries()) {
    const definition = picked[index] ?? null;
    const pageId = pages.idOf.get(add.page);
    if (definition === null || pageId === undefined) continue;
    const listed = project.pages.entities[pageId]?.blockIds ?? [];
    let afterBlockId: string | null = null;
    if (add.after !== '') afterBlockId = outline.blockIds.get(add.after) ?? listed.at(-1) ?? null;
    const target = { kind: 'add', pageId, afterBlockId, theme: add.theme } as const;
    tasks.push({ definition, note: add.note, current: null, target });
  }
  return tasks;
}

async function writtenSections(
  ask: Ask,
  facts: SiteFacts,
  tasks: readonly Task[],
  signal: AbortSignal,
): Promise<SectionWriting[]> {
  const batches: Task[][] = [];
  for (let first = 0; first < tasks.length; first += WRITE_BATCH) {
    batches.push(tasks.slice(first, first + WRITE_BATCH));
  }
  const written = await Promise.all(
    batches.map(async (batch) => {
      const answer = await ask(writeRequest(facts, batch), signal);
      return parseSections(answer.value, batch.length);
    }),
  );
  return written.flat();
}

function taskChange(task: Task, writing: SectionWriting, pages: KnownPages): ProjectChange | null {
  const { definition, target } = task;
  const written = writing.kind === 'values' ? withPageIds(writing.values, pages.idOf) : undefined;
  if (target.kind === 'add') {
    const section = {
      kind: 'block',
      blockId: definition.id,
      theme: target.theme,
      note: '',
    } as const;
    const block = sectionBlock(section, { kind: 'values', values: written }, pages.site);
    if (block === null) return null;
    return { kind: 'add', pageId: target.pageId, afterBlockId: target.afterBlockId, block };
  }
  const given = isRecord(written) ? written : {};
  const values: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (!(field.name in given)) continue;
    const value = usableValue(field, given[field.name], pages.site, target.kept);
    const isSame = JSON.stringify(value) === JSON.stringify(target.block.values[field.name]);
    if (value !== undefined && !isSame) values[field.name] = value;
  }
  if (Object.keys(values).length === 0) return null;
  return { kind: 'values', blockId: target.block.id, values };
}

async function fontChanges(decision: Decision): Promise<ProjectChange[]> {
  const wanted: { role: FontRole; family: string }[] = [];
  if (decision.headingFont !== '') wanted.push({ role: 'heading', family: decision.headingFont });
  if (decision.bodyFont !== '') wanted.push({ role: 'body', family: decision.bodyFont });
  if (wanted.length === 0) return [];
  const fontList = await loadFontList();
  const changes: ProjectChange[] = [];
  for (const { role, family } of wanted) {
    const found = fontList.find((font) => font.family.toLowerCase() === family.toLowerCase());
    if (found === undefined) continue;
    const stack = fontStack(found.family, found.category);
    const change = { role, family: found.family, availableWeights: found.weights, stack };
    changes.push({ kind: 'font', change });
  }
  return changes;
}

function directChanges(project: Project, decision: Decision, outline: Outline): ProjectChange[] {
  const changes: ProjectChange[] = [];
  for (const { ref, theme } of decision.themes) {
    const blockId = outline.blockIds.get(ref);
    if (blockId !== undefined) changes.push({ kind: 'theme', blockId, themeId: theme });
  }
  for (const { ref, after } of decision.moves) {
    const blockId = outline.blockIds.get(ref);
    const afterBlockId = after === '' ? null : outline.blockIds.get(after);
    if (blockId === undefined || afterBlockId === undefined) continue;
    changes.push({ kind: 'move', blockId, afterBlockId });
  }
  for (const ref of decision.removes) {
    const blockId = outline.blockIds.get(ref);
    if (blockId !== undefined) changes.push({ kind: 'remove', blockId });
  }
  const tokens: Record<string, string> = {};
  for (const [name, value] of Object.entries(decision.tokens)) {
    if (name in project.designSystem.tokens) tokens[name] = value;
  }
  if (Object.keys(tokens).length > 0) changes.push({ kind: 'tokens', values: tokens });
  return changes;
}

export async function planProjectEdit(
  ask: Ask,
  input: EditInput,
  signal: AbortSignal,
): Promise<ProjectEdit> {
  const { project } = input;
  const outline = editOutline(project, input.openPageId, input.selectedBlockId);
  const decided = await ask(decideRequest(outline.text, input.request, input.earlier), signal);
  const decision = parseDecision(decided.value);
  const { known: pages, added } = knownPages(project, decision.pages);

  let picked: (ComponentDefinition | null)[] = [];
  if (decision.adds.length > 0) {
    const picks = await ask(pickRequest(decision.adds), signal);
    picked = parsePicks(picks.value, decision.adds);
  }
  const tasks = [
    ...addTasks(project, decision, outline, picked, pages),
    ...editTasks(project, decision, outline),
  ];
  const title = decision.title === '' ? project.settings.title : decision.title;
  const facts: SiteFacts = { title, description: project.settings.description, pages: pages.names };
  const written = await writtenSections(ask, facts, tasks, signal);

  const changes: ProjectChange[] = [];
  for (const page of added) changes.push({ kind: 'page', page });
  for (const [index, task] of tasks.entries()) {
    const change = taskChange(task, written[index], pages);
    if (change !== null) changes.push(change);
  }
  changes.push(...directChanges(project, decision, outline), ...(await fontChanges(decision)));
  if (decision.title !== '') changes.push({ kind: 'setting', key: 'title', value: decision.title });
  if (decision.description !== '') {
    changes.push({ kind: 'setting', key: 'description', value: decision.description });
  }
  return { reply: decision.reply, changes };
}

function insertIndex(listed: readonly string[], afterBlockId: string | null): number {
  if (afterBlockId === null) return 0;
  const index = listed.indexOf(afterBlockId);
  return index === -1 ? listed.length : index + 1;
}

function anchorKey(pageId: string, afterBlockId: string | null): string {
  return `${pageId}:${afterBlockId ?? ''}`;
}

function applyChange(
  project: Project,
  change: ProjectChange,
  placed: ReadonlyMap<string, string>,
): Project {
  const reduce = projectSlice.reducer;
  if (change.kind === 'page') {
    return reduce(project, pageAdded(change.page));
  } else if (change.kind === 'add') {
    const page = project.pages.entities[change.pageId];
    if (page === undefined || change.block.kind !== 'component') return project;
    const anchor = placed.get(anchorKey(change.pageId, change.afterBlockId)) ?? change.afterBlockId;
    const index = insertIndex(page.blockIds, anchor);
    const action = blockInserted(page.id, index, change.block.componentId);
    return reduce(project, { ...action, payload: { ...action.payload, block: change.block } });
  } else if (change.kind === 'values') {
    let edited = project;
    for (const [name, value] of Object.entries(change.values)) {
      edited = reduce(edited, blockValueSet(change.blockId, name, value, 'discrete'));
    }
    return edited;
  } else if (change.kind === 'theme') {
    const { blockId, themeId } = change;
    return reduce(project, blockSectionThemeSet({ blockId, themeId }));
  } else if (change.kind === 'move') {
    const listed = findBlockList(project, change.blockId);
    if (listed === null) return project;
    const others = listed.filter((blockId) => blockId !== change.blockId);
    const isAnchorNear = change.afterBlockId === null || others.includes(change.afterBlockId);
    if (!isAnchorNear) return project;
    const toIndex = insertIndex(others, change.afterBlockId);
    return reduce(project, blockMoved({ blockId: change.blockId, toIndex }));
  } else if (change.kind === 'remove') {
    return reduce(project, blockRemoved({ blockId: change.blockId }));
  } else if (change.kind === 'tokens') {
    return reduce(project, tokensSet({ values: change.values }, 'discrete'));
  } else if (change.kind === 'font') {
    return reduce(project, fontSet(change.change));
  } else {
    return reduce(project, settingSet(change.key, change.value, 'discrete'));
  }
}

function changeSummary(before: Project, change: ProjectChange): string {
  if (change.kind === 'page') {
    return `Added the page “${change.page.name}”`;
  } else if (change.kind === 'add') {
    const name = change.block.kind === 'component' ? change.block.componentId : '';
    const blockTitle = definitionOf(before, name)?.name ?? 'a section';
    const pageName = before.pages.entities[change.pageId]?.name ?? '';
    return `Added “${blockTitle}” to ${pageName}`;
  } else if (change.kind === 'values') {
    return `Rewrote “${blockName(before, change.blockId)}”`;
  } else if (change.kind === 'theme') {
    return `Changed the colors of “${blockName(before, change.blockId)}”`;
  } else if (change.kind === 'move') {
    return `Moved “${blockName(before, change.blockId)}”`;
  } else if (change.kind === 'remove') {
    return `Removed “${blockName(before, change.blockId)}”`;
  } else if (change.kind === 'tokens') {
    return 'Changed the design';
  } else if (change.kind === 'font') {
    return 'Changed the fonts';
  } else if (change.key === 'title') {
    return 'Renamed the site';
  } else {
    return 'Changed the site description';
  }
}

export function applyProjectEdit(project: Project, changes: readonly ProjectChange[]): AppliedEdit {
  const placed = new Map<string, string>();
  const summary: string[] = [];
  let edited = project;
  for (const change of changes) {
    const changed = applyChange(edited, change, placed);
    if (changed === edited) continue;
    const line = changeSummary(edited, change);
    if (!summary.includes(line)) summary.push(line);
    if (change.kind === 'add') {
      placed.set(anchorKey(change.pageId, change.afterBlockId), change.block.id);
    }
    edited = changed;
  }
  return { project: edited, summary };
}
