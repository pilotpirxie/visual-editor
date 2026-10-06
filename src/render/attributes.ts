const ANCHOR = /^[a-z][a-z0-9-]*$/;
const EDITOR_ANCHOR_PREFIX = 've-';
const CLASS_NAME = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;
const WHITESPACE = /\s+/;
const HTML_SPECIAL_CHARACTERS = /[&<>"]/g;

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function isValidAnchor(anchor: string): boolean {
  return ANCHOR.test(anchor) && !anchor.startsWith(EDITOR_ANCHOR_PREFIX);
}

export function isValidClassName(name: string): boolean {
  return CLASS_NAME.test(name);
}

export function parseClassNames(text: string): string[] {
  const names: string[] = [];
  for (const name of text.trim().split(WHITESPACE)) {
    if (name !== '' && !names.includes(name)) names.push(name);
  }
  return names;
}

export function escapeHtml(text: string): string {
  return text.replace(
    HTML_SPECIAL_CHARACTERS,
    (character) => HTML_ENTITIES[character] ?? character,
  );
}
