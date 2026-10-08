import { cachedByText } from './textCache';

type InlineTag = 'strong' | 'em' | 'a';

type HeadingTag = 'h2' | 'h3';

type BlockWriter = {
  doc: Document;
  root: Element;
  paragraph: Element | null;
  allowHeadings: boolean;
};

export type RichTextOptions = { allowHeadings?: boolean };

const UNSAFE_SCHEME = /^(?:javascript|vbscript|data):/i;
const UNSAFE_CSS_VALUE = /[;{}<>\\]|\/\*|url\s*\(|expression\s*\(/i;
const IMAGE_DATA_URL = /^data:image\/(?:svg\+xml|png|jpeg|gif|webp|avif)[;,]/i;
const LAST_SPACE_OR_CONTROL_CODE = 0x20;
const DELETE_CODE = 0x7f;
const BOLD_WEIGHT = /font-weight\s*:\s*(?:bold|[6-9]00)/i;
const NORMAL_WEIGHT = /font-weight\s*:\s*(?:normal|[1-4]00)/i;
const ITALIC_STYLE = /font-style\s*:\s*italic/i;
const PARAGRAPH_BREAK = /\r?\n\s*\r?\n/;
const LINE_BREAK = /\r?\n/;

const DROPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'TEMPLATE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'HEAD',
  'TITLE',
  'META',
  'LINK',
  'IMG',
  'PICTURE',
  'VIDEO',
  'AUDIO',
  'CANVAS',
  'FORM',
  'INPUT',
  'BUTTON',
  'SELECT',
  'TEXTAREA',
  'O:P',
]);

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'ASIDE',
  'MAIN',
  'NAV',
  'FIGURE',
  'FIGCAPTION',
  'TABLE',
  'TR',
  'LI',
  'DL',
  'DT',
  'DD',
  'HR',
]);

const LIST_TAGS = new Set(['UL', 'OL']);

const HEADING_TAGS: Record<string, HeadingTag> = {
  H1: 'h2',
  H2: 'h2',
  H3: 'h3',
  H4: 'h3',
  H5: 'h3',
  H6: 'h3',
};

function withoutSpacesAndControls(url: string): string {
  let kept = '';
  for (const character of url) {
    const code = character.codePointAt(0) ?? 0;
    if (code > LAST_SPACE_OR_CONTROL_CODE && code !== DELETE_CODE) kept += character;
  }
  return kept;
}

export function isSafeUrl(url: string): boolean {
  return !UNSAFE_SCHEME.test(withoutSpacesAndControls(url));
}

export function isSafeCssValue(value: string): boolean {
  return value.trim() !== '' && !UNSAFE_CSS_VALUE.test(value);
}

export function isSafeImageSrc(src: string): boolean {
  return IMAGE_DATA_URL.test(src.trim()) || isSafeUrl(src);
}

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function tagOf(element: Element): string {
  return element.tagName.toUpperCase();
}

function hasText(element: Element): boolean {
  return (element.textContent ?? '').trim() !== '';
}

function inlineTagOf(element: Element): InlineTag | null {
  const tag = tagOf(element);
  const style = element.getAttribute('style') ?? '';
  if (tag === 'A') {
    return 'a';
  } else if (tag === 'STRONG') {
    return 'strong';
  } else if (tag === 'B') {
    return NORMAL_WEIGHT.test(style) ? null : 'strong';
  } else if (tag === 'EM' || tag === 'I') {
    return 'em';
  } else if (BOLD_WEIGHT.test(style)) {
    return 'strong';
  } else if (ITALIC_STYLE.test(style)) {
    return 'em';
  } else {
    return null;
  }
}

function trimTrailingBreaks(element: Element): void {
  let last = element.lastChild;
  while (last !== null && isElement(last) && tagOf(last) === 'BR') {
    last.remove();
    last = element.lastChild;
  }
}

function appendInlineNode(node: Node, target: Element, doc: Document): void {
  if (isText(node)) {
    target.append(doc.createTextNode(node.data));
    return;
  }
  if (!isElement(node) || DROPPED_TAGS.has(tagOf(node))) return;
  if (tagOf(node) === 'BR') {
    target.append(doc.createElement('br'));
    return;
  }
  const inlineTag = inlineTagOf(node);
  const href = node.getAttribute('href')?.trim() ?? '';
  const isUnusableLink = inlineTag === 'a' && (href === '' || !isSafeUrl(href));
  if (inlineTag === null || isUnusableLink) {
    appendInlineChildren(node, target, doc);
    return;
  }
  const element = doc.createElement(inlineTag);
  if (inlineTag === 'a') element.setAttribute('href', href);
  appendInlineChildren(node, element, doc);
  if (hasText(element)) {
    target.append(element);
    return;
  }
  target.append(...element.childNodes);
}

function appendInlineChildren(source: Node, target: Element, doc: Document): void {
  for (const child of source.childNodes) appendInlineNode(child, target, doc);
}

function appendListItemContent(source: Element, item: Element, doc: Document): void {
  for (const child of source.childNodes) {
    if (isElement(child) && LIST_TAGS.has(tagOf(child))) {
      const nested = buildList(child, doc);
      if (nested !== null) item.append(nested);
      continue;
    }
    if (isElement(child) && BLOCK_TAGS.has(tagOf(child))) {
      if (hasText(item)) item.append(doc.createElement('br'));
      appendInlineChildren(child, item, doc);
      continue;
    }
    appendInlineNode(child, item, doc);
  }
}

function buildList(source: Element, doc: Document): Element | null {
  const list = doc.createElement(tagOf(source) === 'OL' ? 'ol' : 'ul');
  for (const child of source.childNodes) {
    if (isText(child) && child.data.trim() === '') continue;
    if (isElement(child) && LIST_TAGS.has(tagOf(child))) {
      const nested = buildList(child, doc);
      const previousItem = list.lastElementChild;
      if (nested !== null && previousItem !== null) previousItem.append(nested);
      continue;
    }
    const item = doc.createElement('li');
    if (isElement(child) && tagOf(child) === 'LI') appendListItemContent(child, item, doc);
    else appendInlineNode(child, item, doc);
    trimTrailingBreaks(item);
    if (hasText(item)) list.append(item);
  }
  if (list.children.length === 0) return null;
  return list;
}

function openParagraph(writer: BlockWriter): Element {
  writer.paragraph ??= writer.doc.createElement('p');
  return writer.paragraph;
}

function closeParagraph(writer: BlockWriter): void {
  const { paragraph } = writer;
  writer.paragraph = null;
  if (paragraph === null) return;
  trimTrailingBreaks(paragraph);
  if (hasText(paragraph)) writer.root.append(paragraph);
}

function appendHeading(source: Element, tag: HeadingTag, writer: BlockWriter): void {
  const heading = writer.doc.createElement(tag);
  appendInlineChildren(source, heading, writer.doc);
  trimTrailingBreaks(heading);
  if (hasText(heading)) writer.root.append(heading);
}

function appendBlocks(source: Node, writer: BlockWriter): void {
  for (const child of source.childNodes) {
    if (isText(child)) {
      if (writer.paragraph === null && child.data.trim() === '') continue;
      appendInlineNode(child, openParagraph(writer), writer.doc);
      continue;
    }
    if (!isElement(child)) continue;
    const tag = tagOf(child);
    if (DROPPED_TAGS.has(tag)) continue;
    if (LIST_TAGS.has(tag)) {
      closeParagraph(writer);
      const list = buildList(child, writer.doc);
      if (list !== null) writer.root.append(list);
      continue;
    }
    const headingTag = writer.allowHeadings ? HEADING_TAGS[tag] : undefined;
    if (headingTag !== undefined) {
      closeParagraph(writer);
      appendHeading(child, headingTag, writer);
      continue;
    }
    if (BLOCK_TAGS.has(tag)) {
      closeParagraph(writer);
      appendBlocks(child, writer);
      closeParagraph(writer);
      continue;
    }
    if (tag !== 'BR' && inlineTagOf(child) === null) {
      appendBlocks(child, writer);
      continue;
    }
    appendInlineNode(child, openParagraph(writer), writer.doc);
  }
}

function inertDocument(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function normalize(html: string, allowHeadings: boolean): string {
  const doc = inertDocument(html);
  const writer: BlockWriter = {
    doc,
    root: doc.createElement('div'),
    paragraph: null,
    allowHeadings,
  };
  appendBlocks(doc.body, writer);
  closeParagraph(writer);
  return writer.root.innerHTML;
}

const RICH_TEXT_CACHE_SIZE = 500;
const normalizedWithHeadings = cachedByText(RICH_TEXT_CACHE_SIZE, (html) => normalize(html, true));
const normalizedWithoutHeadings = cachedByText(RICH_TEXT_CACHE_SIZE, (html) =>
  normalize(html, false),
);

export function normalizeRichText(html: string, options: RichTextOptions = {}): string {
  if (options.allowHeadings === true) return normalizedWithHeadings(html);
  return normalizedWithoutHeadings(html);
}

export function plainTextToHtml(text: string): string {
  const doc = inertDocument('');
  const root = doc.createElement('div');
  for (const block of text.split(PARAGRAPH_BREAK)) {
    if (block.trim() === '') continue;
    const paragraph = doc.createElement('p');
    for (const [index, line] of block.split(LINE_BREAK).entries()) {
      if (index > 0) paragraph.append(doc.createElement('br'));
      paragraph.append(doc.createTextNode(line));
    }
    root.append(paragraph);
  }
  return root.innerHTML;
}
