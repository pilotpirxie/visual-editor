const INDENT = '  ';

const BLOCK_ELEMENTS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'picture',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

const ATTRIBUTE_ESCAPES: Record<string, string> = { '&': '&amp;', '"': '&quot;' };
const ATTRIBUTE_SPECIAL = /[&"]/g;

function escapeAttribute(value: string): string {
  return value.replace(ATTRIBUTE_SPECIAL, (character) => ATTRIBUTE_ESCAPES[character] ?? character);
}

function openTag(element: Element): string {
  let attributes = '';
  for (const attribute of element.attributes) {
    attributes +=
      attribute.value === ''
        ? ` ${attribute.name}`
        : ` ${attribute.name}="${escapeAttribute(attribute.value)}"`;
  }
  return `<${element.localName}${attributes}>`;
}

function isBlockElement(node: Node): node is Element {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    node instanceof Element &&
    BLOCK_ELEMENTS.has(node.localName)
  );
}

function isBlankText(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === '';
}

function hasOnlyBlockChildren(element: Element): boolean {
  let hasBlockChild = false;
  for (const child of element.childNodes) {
    if (isBlankText(child)) continue;
    if (!isBlockElement(child)) return false;
    hasBlockChild = true;
  }
  return hasBlockChild;
}

function serializeNode(node: Node): string {
  if (node instanceof Element) return node.outerHTML;
  const holder = document.createElement('template');
  holder.content.append(node.cloneNode(true));
  return holder.innerHTML;
}

function formatChildren(parent: ParentNode, depth: number, lines: string[]): void {
  for (const child of parent.childNodes) {
    if (isBlankText(child)) continue;
    formatNode(child, depth, lines);
  }
}

function formatNode(node: Node, depth: number, lines: string[]): void {
  const indent = INDENT.repeat(depth);
  if (!(node instanceof Element) || !isBlockElement(node) || !hasOnlyBlockChildren(node)) {
    lines.push(`${indent}${serializeNode(node).trim()}`);
    return;
  }
  lines.push(`${indent}${openTag(node)}`);
  formatChildren(node, depth + 1, lines);
  if (!VOID_ELEMENTS.has(node.localName)) lines.push(`${indent}</${node.localName}>`);
}

function removeAttributes(root: DocumentFragment, names: readonly string[]): void {
  for (const name of names) {
    for (const element of root.querySelectorAll(`[${name}]`)) element.removeAttribute(name);
  }
}

export function formatHtml(
  html: string,
  depth = 0,
  removedAttributes: readonly string[] = [],
): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  removeAttributes(template.content, removedAttributes);
  const lines: string[] = [];
  formatChildren(template.content, depth, lines);
  return lines.join('\n');
}
