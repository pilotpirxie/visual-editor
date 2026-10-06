function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function morphChildren(target: Element, html: string): void {
  const template = target.ownerDocument.createElement('template');
  template.innerHTML = html;
  patchChildren(target, template.content);
}

function patchChildren(current: Node, next: Node): void {
  let cursor = current.firstChild;
  for (const nextChild of [...next.childNodes]) {
    if (!cursor) {
      current.appendChild(nextChild);
      continue;
    }
    const isSameNode =
      cursor.nodeName === nextChild.nodeName &&
      (!isElement(cursor) || !isElement(nextChild) || cursor.id === nextChild.id);
    if (!isSameNode) {
      const replaced = cursor;
      cursor = cursor.nextSibling;
      current.replaceChild(nextChild, replaced);
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
  while (cursor) {
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
