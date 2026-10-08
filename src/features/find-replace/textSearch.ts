import type { ComponentBlock, Project } from '../../app/types';
import type { SeoTextKey, SiteTextKey, TextEdit } from '../../app/projectSlice';
import { definitionOf } from '../../components/registry';
import { asListItems, isButtonValue, isImageValue, isLinkValue } from '../../components/fields';
import type { Field, LinkValue } from '../../components/types';
import { normalizeRichText } from '../../render/sanitize';
import { cachedByText } from '../../render/textCache';

export type SearchOptions = { isCaseSensitive: boolean; isWholeWord: boolean };

type TextPart = 'text' | 'label' | 'url' | 'alt';

export type MatchLocation =
  | { kind: 'block'; blockId: string; pageId: string | null; path: string; part: TextPart }
  | { kind: 'page-seo'; pageId: string; key: SeoTextKey }
  | { kind: 'setting'; key: SiteTextKey };

export type MatchPreview = { before: string; match: string; after: string };

export type FindMatch = {
  id: string;
  location: MatchLocation;
  label: string;
  count: number;
  preview: MatchPreview;
};

type TextSlot = { path: string; part: TextPart; label: string; text: string };

type Replacer = { pattern: RegExp; replacement: string; selectedIds: ReadonlySet<string> };

const PREVIEW_CONTEXT = 32;
const SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
const REPLACEABLE_LINK_TYPES = new Set<LinkValue['type']>(['url', 'email', 'phone']);
const SEO_LABELS: Record<SeoTextKey, string> = {
  title: 'Page title',
  description: 'Meta description',
  socialTitle: 'Social title',
  socialDescription: 'Social description',
};
const SITE_LABELS: Record<SiteTextKey, string> = {
  title: 'Site title',
  description: 'Site description',
};
const SEO_KEYS: SeoTextKey[] = ['title', 'description', 'socialTitle', 'socialDescription'];
const SITE_KEYS: SiteTextKey[] = ['title', 'description'];

export function buildPattern(query: string, options: SearchOptions): RegExp | null {
  const trimmed = query.trim();
  if (trimmed === '') return null;
  const escaped = trimmed.replace(SPECIAL_CHARACTERS, '\\$&');
  const source = options.isWholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped;
  const flags = options.isCaseSensitive ? 'gu' : 'giu';
  return new RegExp(source, flags);
}

const RICH_TEXT_CACHE_SIZE = 2000;

const richTextContent = cachedByText(RICH_TEXT_CACHE_SIZE, (html) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent ?? '';
});

function replaceInRichText(html: string, pattern: RegExp, replacement: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.nodeValue ?? '';
    node.nodeValue = text.replace(pattern, () => replacement);
  }
  return normalizeRichText(template.innerHTML);
}

function replaceText(text: string, pattern: RegExp, replacement: string): string {
  return text.replace(pattern, () => replacement);
}

function linkUrl(link: LinkValue): string | null {
  if (!REPLACEABLE_LINK_TYPES.has(link.type) || link.url === undefined) return null;
  return link.url;
}

function collectSlots(field: Field, value: unknown, path: string, slots: TextSlot[]): void {
  if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
    slots.push({ path, part: 'text', label: field.label, text: value });
  } else if (field.type === 'richtext' && typeof value === 'string') {
    slots.push({ path, part: 'text', label: field.label, text: richTextContent(value) });
  } else if (field.type === 'button' && isButtonValue(value)) {
    slots.push({ path, part: 'label', label: field.label, text: value.label });
    const url = linkUrl(value.link);
    if (url !== null) slots.push({ path, part: 'url', label: `${field.label} link`, text: url });
  } else if (field.type === 'link' && isLinkValue(value)) {
    const url = linkUrl(value);
    if (url !== null) slots.push({ path, part: 'url', label: field.label, text: url });
  } else if (field.type === 'image' && isImageValue(value)) {
    slots.push({ path, part: 'alt', label: `${field.label} alt text`, text: value.alt });
  } else if (field.type === 'list') {
    for (const [index, item] of asListItems(value).entries()) {
      for (const itemField of field.itemFields ?? []) {
        const itemPath = `${path}.${index}.${itemField.name}`;
        collectSlots(itemField, item[itemField.name], itemPath, slots);
      }
    }
  }
}

function previewOf(text: string, pattern: RegExp): MatchPreview {
  pattern.lastIndex = 0;
  const found = pattern.exec(text);
  pattern.lastIndex = 0;
  if (found === null) return { before: '', match: '', after: '' };
  const start = found.index;
  const end = start + found[0].length;
  return {
    before: text.slice(Math.max(0, start - PREVIEW_CONTEXT), start),
    match: found[0],
    after: text.slice(end, end + PREVIEW_CONTEXT),
  };
}

function countMatches(text: string, pattern: RegExp): number {
  let count = 0;
  for (const found of text.matchAll(pattern)) {
    if (found[0] !== '') count += 1;
  }
  return count;
}

function locationId(location: MatchLocation): string {
  if (location.kind === 'block')
    return `block:${location.blockId}:${location.path}:${location.part}`;
  if (location.kind === 'page-seo') return `seo:${location.pageId}:${location.key}`;
  return `setting:${location.key}`;
}

function matchOf(
  location: MatchLocation,
  label: string,
  text: string,
  pattern: RegExp,
): FindMatch | null {
  const count = countMatches(text, pattern);
  if (count === 0) return null;
  return { id: locationId(location), location, label, count, preview: previewOf(text, pattern) };
}

function blockMatches(
  project: Project,
  block: ComponentBlock,
  pageId: string | null,
  pattern: RegExp,
  matches: FindMatch[],
): void {
  const definition = definitionOf(project, block.componentId);
  if (definition === undefined) return;
  const slots: TextSlot[] = [];
  for (const field of definition.fields)
    collectSlots(field, block.values[field.name], field.name, slots);
  for (const slot of slots) {
    const location: MatchLocation = {
      kind: 'block',
      blockId: block.id,
      pageId,
      path: slot.path,
      part: slot.part,
    };
    const match = matchOf(location, slot.label, slot.text, pattern);
    if (match !== null) matches.push(match);
  }
}

function blockListMatches(
  project: Project,
  blockIds: readonly string[],
  pageId: string | null,
  pattern: RegExp,
  matches: FindMatch[],
): void {
  for (const blockId of blockIds) {
    const block = project.blocks.entities[blockId];
    if (block?.kind === 'component') blockMatches(project, block, pageId, pattern, matches);
  }
}

export function findMatches(project: Project, query: string, options: SearchOptions): FindMatch[] {
  const pattern = buildPattern(query, options);
  if (pattern === null) return [];
  const matches: FindMatch[] = [];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page === undefined) continue;
    blockListMatches(project, page.blockIds, pageId, pattern, matches);
    for (const key of SEO_KEYS) {
      const text = page.seo[key];
      if (text === undefined) continue;
      const match = matchOf({ kind: 'page-seo', pageId, key }, SEO_LABELS[key], text, pattern);
      if (match !== null) matches.push(match);
    }
  }
  const sharedBlockIds = [...project.sharedSlots.header, ...project.sharedSlots.footer];
  blockListMatches(project, sharedBlockIds, null, pattern, matches);
  for (const key of SITE_KEYS) {
    const text = project.settings[key];
    const match = matchOf({ kind: 'setting', key }, SITE_LABELS[key], text, pattern);
    if (match !== null) matches.push(match);
  }
  return matches;
}

function slotId(blockId: string, path: string, part: TextPart): string {
  return `block:${blockId}:${path}:${part}`;
}

function replacedLink(link: LinkValue, isSelected: boolean, replacer: Replacer): LinkValue {
  const url = linkUrl(link);
  if (!isSelected || url === null) return link;
  return { ...link, url: replaceText(url, replacer.pattern, replacer.replacement) };
}

function replaceInValue(
  field: Field,
  value: unknown,
  blockId: string,
  path: string,
  replacer: Replacer,
): unknown {
  const { pattern, replacement, selectedIds } = replacer;
  const isSelected = (part: TextPart): boolean => selectedIds.has(slotId(blockId, path, part));
  if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
    return isSelected('text') ? replaceText(value, pattern, replacement) : value;
  } else if (field.type === 'richtext' && typeof value === 'string') {
    return isSelected('text') ? replaceInRichText(value, pattern, replacement) : value;
  } else if (field.type === 'button' && isButtonValue(value)) {
    const label = isSelected('label')
      ? replaceText(value.label, pattern, replacement)
      : value.label;
    const link = replacedLink(value.link, isSelected('url'), replacer);
    return label === value.label && link === value.link ? value : { ...value, label, link };
  } else if (field.type === 'link' && isLinkValue(value)) {
    return replacedLink(value, isSelected('url'), replacer);
  } else if (field.type === 'image' && isImageValue(value)) {
    return isSelected('alt')
      ? { ...value, alt: replaceText(value.alt, pattern, replacement) }
      : value;
  } else if (field.type === 'list' && Array.isArray(value)) {
    return asListItems(value).map((item, index) => {
      const replacedItem: Record<string, unknown> = { ...item };
      for (const itemField of field.itemFields ?? []) {
        const itemPath = `${path}.${index}.${itemField.name}`;
        replacedItem[itemField.name] = replaceInValue(
          itemField,
          item[itemField.name],
          blockId,
          itemPath,
          replacer,
        );
      }
      return replacedItem;
    });
  } else {
    return value;
  }
}

function blockEdits(
  project: Project,
  blockId: string,
  replacer: Replacer,
  edits: TextEdit[],
): void {
  const block = project.blocks.entities[blockId];
  if (block?.kind !== 'component') return;
  const definition = definitionOf(project, block.componentId);
  if (definition === undefined) return;
  for (const field of definition.fields) {
    const value = block.values[field.name];
    const replaced = replaceInValue(field, value, blockId, field.name, replacer);
    if (JSON.stringify(replaced) !== JSON.stringify(value)) {
      edits.push({ kind: 'block-value', blockId, name: field.name, value: replaced });
    }
  }
}

export function planReplacement(
  project: Project,
  matches: readonly FindMatch[],
  query: string,
  replacement: string,
  options: SearchOptions,
): TextEdit[] {
  const pattern = buildPattern(query, options);
  if (pattern === null) return [];
  const selectedIds = new Set(matches.map((match) => match.id));
  const replacer: Replacer = { pattern, replacement, selectedIds };
  const edits: TextEdit[] = [];
  const blockIds = new Set<string>();
  for (const { location } of matches) {
    if (location.kind === 'block') {
      blockIds.add(location.blockId);
    } else if (location.kind === 'page-seo') {
      const text = project.pages.entities[location.pageId]?.seo[location.key];
      if (text === undefined) continue;
      const value = replaceText(text, pattern, replacement);
      edits.push({ kind: 'page-seo', pageId: location.pageId, key: location.key, value });
    } else {
      const value = replaceText(project.settings[location.key], pattern, replacement);
      edits.push({ kind: 'setting', key: location.key, value });
    }
  }
  for (const blockId of blockIds) blockEdits(project, blockId, replacer, edits);
  return edits;
}

export function replacementCount(matches: readonly FindMatch[]): number {
  let total = 0;
  for (const match of matches) total += match.count;
  return total;
}
