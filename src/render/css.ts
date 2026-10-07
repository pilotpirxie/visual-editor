import type { Token } from '../app/types';
import base from './styles/base.css?raw';
import reset from './styles/reset.css?raw';

type CssChunk = { name: string; classes: string[]; css: string };

export type SiteCssInput = {
  tokens: Record<string, Token>;
  componentStyles: string[];
  usedClasses: ReadonlySet<string>;
  htmlSources: string[];
};

export type SiteCss = { css: string; usedTokens: Set<string>; omittedPrimitives: string[] };

const TOKEN_REFERENCE = /^var\((?<name>--[a-z0-9-]+)\)$/;
const VAR_REFERENCE = /var\(\s*(?<name>--[a-zA-Z0-9-]+)/g;
const CLASS_SELECTOR = /\.(?<name>-?[_a-zA-Z][\w-]*)/g;

const PRIMITIVE_ORDER = [
  'container',
  'section',
  'stack',
  'cluster',
  'grid',
  'btn',
  'card',
  'badge',
  'eyebrow',
  'field',
  'media',
  'device',
  'modal',
  'prose',
  'icon',
];

const UTILITY_ORDER = ['visually-hidden', 'hide'];

const primitiveFiles = import.meta.glob<string>('./styles/primitives/*.css', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const utilityFiles = import.meta.glob<string>('./styles/utilities/*.css', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const LAYER_ORDER = '@layer reset, base, primitives, components, utilities;';

export function chunkClasses(css: string): string[] {
  const classes = new Set<string>();
  for (const match of css.matchAll(CLASS_SELECTOR)) {
    const name = match.groups?.name;
    if (name !== undefined) classes.add(name);
  }
  return [...classes];
}

function orderedChunks(
  files: Record<string, string>,
  order: readonly string[],
  folder: string,
): CssChunk[] {
  const chunks: CssChunk[] = [];
  for (const name of order) {
    const css = files[`./styles/${folder}/${name}.css`];
    if (css !== undefined) chunks.push({ name, classes: chunkClasses(css), css });
  }
  if (chunks.length !== Object.keys(files).length) {
    throw new Error(`Every file in styles/${folder} must be listed in the ${folder} order`);
  }
  return chunks;
}

const PRIMITIVE_CHUNKS = orderedChunks(primitiveFiles, PRIMITIVE_ORDER, 'primitives');

const UTILITY_CHUNKS = orderedChunks(utilityFiles, UTILITY_ORDER, 'utilities');

function chunkCss(chunks: readonly CssChunk[]): string[] {
  const css: string[] = [];
  for (const chunk of chunks) css.push(chunk.css);
  return css;
}

export const CANVAS_BASE_CSS = [
  LAYER_ORDER,
  reset,
  base,
  ...chunkCss(PRIMITIVE_CHUNKS),
  ...chunkCss(UTILITY_CHUNKS),
].join('\n\n');

export function tokenReference(name: string): string {
  return `var(${name})`;
}

export function referencedTokenName(value: string): string | null {
  return TOKEN_REFERENCE.exec(value.trim())?.groups?.name ?? null;
}

export function buildTokensCss(tokens: Record<string, Token>): string {
  const declarations = Object.values(tokens).map((token) => `  ${token.name}: ${token.value};`);
  return `:root {\n${declarations.join('\n')}\n}`;
}

function referencedNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(VAR_REFERENCE)) {
    const name = match.groups?.name;
    if (name !== undefined) names.push(name);
  }
  return names;
}

export function usedTokenNames(
  sources: readonly string[],
  tokens: Record<string, Token>,
): Set<string> {
  const used = new Set<string>();
  const pending: string[] = [];
  for (const source of sources) pending.push(...referencedNames(source));
  while (pending.length > 0) {
    const name = pending.pop();
    if (name === undefined || used.has(name)) continue;
    const token = tokens[name];
    if (token === undefined) continue;
    used.add(name);
    pending.push(...referencedNames(token.value));
  }
  return used;
}

function usedChunks(chunks: readonly CssChunk[], usedClasses: ReadonlySet<string>): CssChunk[] {
  const used: CssChunk[] = [];
  for (const chunk of chunks) {
    if (chunk.classes.some((name) => usedClasses.has(name))) used.push(chunk);
  }
  return used;
}

export function buildSiteCss({
  tokens,
  componentStyles,
  usedClasses,
  htmlSources,
}: SiteCssInput): SiteCss {
  const primitives = usedChunks(PRIMITIVE_CHUNKS, usedClasses);
  const utilities = usedChunks(UTILITY_CHUNKS, usedClasses);
  const styles = [
    LAYER_ORDER,
    reset,
    base,
    ...chunkCss(primitives),
    ...componentStyles,
    ...chunkCss(utilities),
  ];
  const usedTokens = usedTokenNames([...styles, ...htmlSources], tokens);
  const shippedTokens: Record<string, Token> = {};
  for (const [name, token] of Object.entries(tokens)) {
    if (usedTokens.has(name)) shippedTokens[name] = token;
  }
  const omittedPrimitives: string[] = [];
  for (const chunk of PRIMITIVE_CHUNKS) {
    if (!primitives.includes(chunk)) omittedPrimitives.push(chunk.name);
  }
  const css = `${[buildTokensCss(shippedTokens), ...styles].join('\n\n')}\n`;
  return { css, usedTokens, omittedPrimitives };
}
