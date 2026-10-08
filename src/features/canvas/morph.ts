import { INLINE_EDIT_ATTRIBUTE } from './frameDom';

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isSameNode(current: Node, next: Node): boolean {
  if (current.nodeName !== next.nodeName) return false;
  if (isElement(current) && isElement(next)) return current.id === next.id;
  return true;
}

export function morphChildren(target: Element, html: string): void {
  const template = target.ownerDocument.createElement('template');
  template.innerHTML = html;
  patchChildren(target, template.content);
}

function patchChildren(current: Node, next: Node): void {
  let cursor = current.firstChild;
  for (const nextChild of [...next.childNodes]) {
    if (cursor === null) {
      current.appendChild(nextChild);
      continue;
    }
    if (!isSameNode(cursor, nextChild)) {
      const replaced = cursor;
      cursor = cursor.nextSibling;
      current.replaceChild(nextChild, replaced);
      continue;
    }
    if (isElement(cursor) && cursor.hasAttribute(INLINE_EDIT_ATTRIBUTE)) {
      cursor = cursor.nextSibling;
      continue;
    }
    if (isElement(cursor) && isElement(nextChild)) {
      patchAttributes(cursor, nextChild);
      patchChildren(cursor, nextChild);
    } else if (cursor.nodeValue !== nextChild.nodeValue) {
      cursor.nodeValue = nextChild.nodeValue;
    }
    cursor = cursor.nextSibling;
  }
  while (cursor !== null) {
    const following: ChildNode | null = cursor.nextSibling;
    current.removeChild(cursor);
    cursor = following;
  }
}

function patchAttributes(current: Element, next: Element): void {
  for (const { name, value } of [...next.attributes]) {
    if (current.getAttribute(name) !== value) current.setAttribute(name, value);
  }
  for (const { name } of [...current.attributes]) {
    const isVisitorState = name === 'open' && current.nodeName === 'DETAILS';
    if (!next.hasAttribute(name) && !isVisitorState) current.removeAttribute(name);
  }
}
