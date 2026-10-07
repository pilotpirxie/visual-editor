export type HtmlTokenKind = 'tag' | 'attribute' | 'value' | 'comment';

export type HtmlToken = { kind: HtmlTokenKind; start: number; end: number };

const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<(\/?)([a-zA-Z][\w:-]*)([^<>]*?)(\/?)>/g;
const ATTRIBUTE = /([^\s=/"'<>]+)(\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>=`]+))?/g;

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

function isInside(position: number, comments: readonly HtmlToken[]): boolean {
  for (const comment of comments) {
    if (position >= comment.start && position < comment.end) return true;
  }
  return false;
}

function attributeTokens(text: string, offset: number): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  for (const match of text.matchAll(ATTRIBUTE)) {
    const start = offset + match.index;
    const name = match[1] ?? '';
    tokens.push({ kind: 'attribute', start, end: start + name.length });
    const value = match[3];
    if (value === undefined) continue;
    const valueStart = start + match[0].length - value.length;
    tokens.push({ kind: 'value', start: valueStart, end: valueStart + value.length });
  }
  return tokens;
}

export function tokenizeHtml(text: string): HtmlToken[] {
  const comments: HtmlToken[] = [];
  for (const match of text.matchAll(COMMENT)) {
    comments.push({ kind: 'comment', start: match.index, end: match.index + match[0].length });
  }
  const tokens: HtmlToken[] = [...comments];
  for (const match of text.matchAll(TAG)) {
    if (isInside(match.index, comments)) continue;
    const [whole, slash = '', name = '', attributes = ''] = match;
    const nameEnd = match.index + 1 + slash.length + name.length;
    tokens.push({ kind: 'tag', start: match.index, end: nameEnd });
    tokens.push(...attributeTokens(attributes, nameEnd));
    const closeLength = match[4] === '/' ? 2 : 1;
    const end = match.index + whole.length;
    tokens.push({ kind: 'tag', start: end - closeLength, end });
  }
  tokens.sort((left, right) => left.start - right.start);
  return tokens;
}

export function findUnclosedTags(text: string): string[] {
  const open: string[] = [];
  const withoutComments = text.replace(COMMENT, '');
  for (const match of withoutComments.matchAll(TAG)) {
    const [, slash, rawName = '', , selfClosing] = match;
    const name = rawName.toLowerCase();
    if (VOID_ELEMENTS.has(name) || selfClosing === '/') continue;
    if (slash !== '/') {
      open.push(name);
      continue;
    }
    const index = open.lastIndexOf(name);
    if (index !== -1) open.splice(index, 1);
  }
  return open;
}
