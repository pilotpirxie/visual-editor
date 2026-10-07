import type { ComponentDefinition } from './types';

export const ROOT_TAGS = ['section', 'header', 'nav', 'footer', 'aside', 'div'];

const FORM_ACTION_FIELD = 'formAction';
const FORM_METHOD_FIELD = 'formMethod';

export function rootElementProblem(html: string, rootClass: string): string | null {
  const container = document.createElement('template');
  container.innerHTML = html;
  const roots = container.content.children;
  const [root] = roots;
  if (roots.length !== 1 || root === undefined) {
    return `must render exactly one root element, not ${roots.length}`;
  }
  if (!ROOT_TAGS.includes(root.localName)) {
    return `has a <${root.localName}> root; use one of ${ROOT_TAGS.join(', ')}`;
  }
  if (!root.classList.contains(rootClass)) return `needs the class ${rootClass} on its root`;
  return null;
}

export function formFieldsProblem(definition: ComponentDefinition): string | null {
  const names = new Set(definition.fields.map(({ name }) => name));
  const hasAction = names.has(FORM_ACTION_FIELD);
  if (hasAction === names.has(FORM_METHOD_FIELD)) return null;
  return `needs both ${FORM_ACTION_FIELD} and ${FORM_METHOD_FIELD} fields, or neither`;
}
