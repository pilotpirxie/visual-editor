import { rootElementProblem } from '../../components/definitionRules';
import { customRootClass, type PackError } from '../../components/packFormat';
import type { CustomDefinition, Field } from '../../components/types';
import { BLOCK_HELPERS, isTemplateHelper } from '../../render/helperNames';
import { isSemanticIcon } from '../../render/icons';
import { isSafeCssValue } from '../../render/sanitize';
import { interpretTemplate, type InterpretedTemplate } from '../../render/templateInterpreter';
import type { ParseTemplate } from '../../render/templateParser';

type HtmlState =
  | 'text'
  | 'tag-open'
  | 'tag-name'
  | 'end-tag'
  | 'in-tag'
  | 'attr-name'
  | 'after-attr-name'
  | 'before-attr-value'
  | 'attr-value-double'
  | 'attr-value-single'
  | 'attr-value-unquoted'
  | 'comment'
  | 'raw-text';

type Scanner = {
  state: HtmlState;
  tagName: string;
  attrName: string;
  attrValue: string;
  attrHasMustache: boolean;
  isRootTag: boolean;
  hasSeenRoot: boolean;
  closingText: string;
  line: number;
};

type FieldScope = ReadonlyMap<string, Field> | null;

type Walk = {
  scanner: Scanner;
  scopes: FieldScope[];
  report: (line: number | null, message: string) => void;
};

type ResolvedPath =
  | { kind: 'field'; field: Field; rest: string[] }
  | { kind: 'data' }
  | { kind: 'block' }
  | { kind: 'site' }
  | { kind: 'unknown' };

export type TemplateCheck = { template: InterpretedTemplate | null; errors: PackError[] };

const FORBIDDEN_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'base',
  'meta',
  'link',
  'template',
  'noscript',
]);
const RAW_TEXT_TAGS = new Set(['textarea', 'title']);
const EDITOR_ATTRIBUTES = new Set(['data-block-id', 'data-component', 'data-html-block', 'srcdoc']);
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'srcset',
  'action',
  'formaction',
  'poster',
  'ping',
  'xlink:href',
  'cite',
  'background',
  'data',
]);
const URL_HELPERS = new Set(['href', 'safeUrl']);
const SAFE_URL_PREFIXES = ['#', 'mailto:', 'tel:'];
const STYLE_FIELD_TYPES = new Set(['number', 'range', 'select', 'segmented', 'color']);
const IMAGE_SIZE_KEYS = new Set(['width', 'height']);
const UNSAFE_STYLE = /url\s*\(|image-set\s*\(|expression\s*\(|@import|\\/i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const EDITOR_ID_PREFIX = 've-';
const WHITESPACE = /\s/;
const LETTER = /[a-z]/i;
const PARSE_ERROR_LINE = /line (?<line>\d+)/i;

function isMustache(node: hbs.AST.Node): node is hbs.AST.MustacheStatement {
  return node.type === 'MustacheStatement';
}

function isBlock(node: hbs.AST.Node): node is hbs.AST.BlockStatement {
  return node.type === 'BlockStatement';
}

function isContent(node: hbs.AST.Node): node is hbs.AST.ContentStatement {
  return node.type === 'ContentStatement';
}

function isPath(node: hbs.AST.Node): node is hbs.AST.PathExpression {
  return node.type === 'PathExpression';
}

function isSubExpression(node: hbs.AST.Node): node is hbs.AST.SubExpression {
  return node.type === 'SubExpression';
}

function isStringLiteral(node: hbs.AST.Node): node is hbs.AST.StringLiteral {
  return node.type === 'StringLiteral';
}

function lineOf(node: hbs.AST.Node): number | null {
  return node.loc?.start.line ?? null;
}

function hashPairs(node: { hash?: hbs.AST.Hash }): hbs.AST.HashPair[] {
  return node.hash?.pairs ?? [];
}

function simpleName(path: hbs.AST.PathExpression): string | null {
  const isSimple = path.parts.length === 1 && path.depth === 0 && !path.data;
  return isSimple ? (path.parts[0] ?? null) : null;
}

function helperOf(node: hbs.AST.MustacheStatement | hbs.AST.SubExpression): string | null {
  if (!isPath(node.path)) return null;
  const name = simpleName(node.path);
  const hasArguments = node.params.length > 0 || hashPairs(node).length > 0;
  if (hasArguments || (name !== null && isTemplateHelper(name))) return name ?? node.path.original;
  return null;
}

function fieldScope(fields: readonly Field[] | undefined): FieldScope {
  if (fields === undefined) return null;
  return new Map(fields.map((field) => [field.name, field]));
}

function resolvePath(path: hbs.AST.PathExpression, scopes: FieldScope[]): ResolvedPath {
  if (path.data) return { kind: 'data' };
  const [first, ...rest] = path.parts;
  if (first === 'block') return { kind: 'block' };
  if (first === 'site') return { kind: 'site' };
  const scope = scopes[scopes.length - 1 - path.depth];
  const field =
    first === undefined || scope === undefined || scope === null ? undefined : scope.get(first);
  if (field === undefined) return { kind: 'unknown' };
  return { kind: 'field', field, rest };
}

function originalText(node: hbs.AST.ContentStatement): string {
  const original: unknown = Reflect.get(node, 'original');
  return typeof original === 'string' ? original : node.value;
}

function contentStartLine(node: hbs.AST.ContentStatement): number {
  const startLine = lineOf(node) ?? 1;
  const original = originalText(node);
  const offset = Math.max(original.indexOf(node.value), 0);
  let line = startLine;
  for (const char of original.slice(0, offset)) if (char === '\n') line += 1;
  return line;
}

function isRelativeUrl(value: string): boolean {
  const url = value.trim();
  if (url.startsWith('//')) return false;
  if (!URL_SCHEME.test(url)) return true;
  return SAFE_URL_PREFIXES.some((prefix) => url.toLowerCase().startsWith(prefix));
}

function createScanner(): Scanner {
  return {
    state: 'text',
    tagName: '',
    attrName: '',
    attrValue: '',
    attrHasMustache: false,
    isRootTag: false,
    hasSeenRoot: false,
    closingText: '',
    line: 1,
  };
}

function finishTagName(walk: Walk): void {
  const { scanner } = walk;
  if (FORBIDDEN_TAGS.has(scanner.tagName)) {
    walk.report(scanner.line, `can't use <${scanner.tagName}>`);
  }
  scanner.isRootTag = !scanner.hasSeenRoot;
  scanner.hasSeenRoot = true;
}

function closeTag(walk: Walk): void {
  const { scanner } = walk;
  scanner.closingText = '';
  scanner.state = RAW_TEXT_TAGS.has(scanner.tagName) ? 'raw-text' : 'text';
}

function startAttribute(walk: Walk, firstChar: string): void {
  const { scanner } = walk;
  scanner.state = 'attr-name';
  scanner.attrName = firstChar.toLowerCase();
  scanner.attrValue = '';
  scanner.attrHasMustache = false;
}

function finishAttrName(walk: Walk): void {
  const { scanner, report } = walk;
  const name = scanner.attrName;
  if (name.startsWith('on')) {
    report(
      scanner.line,
      `can't use the ${name} attribute: blocks get behavior from the site runtime`,
    );
  } else if (EDITOR_ATTRIBUTES.has(name)) {
    report(scanner.line, `can't set ${name}: the editor manages it`);
  } else if (scanner.isRootTag && (name === 'id' || name === 'style')) {
    report(scanner.line, `can't set ${name} on the root element: the editor sets it`);
  }
}

function finishAttribute(walk: Walk): void {
  const { scanner, report } = walk;
  const { attrName: name, attrValue: value } = scanner;
  if (scanner.attrHasMustache || value === '') return;
  if (URL_ATTRIBUTES.has(name) && !isRelativeUrl(value)) {
    report(scanner.line, `${name}="${value}" points to another site; use a link field instead`);
  } else if (name === 'style' && UNSAFE_STYLE.test(value)) {
    report(scanner.line, 'a style attribute can’t load images or use escapes');
  } else if (name === 'id' && value.startsWith(EDITOR_ID_PREFIX)) {
    report(scanner.line, `ids starting with ${EDITOR_ID_PREFIX} belong to the editor`);
  }
}

function settleAttribute(walk: Walk): void {
  const { scanner } = walk;
  if (scanner.state === 'attr-name') finishAttrName(walk);
  if (scanner.state !== 'attr-name' && scanner.state !== 'after-attr-name') return;
  finishAttribute(walk);
  scanner.state = 'in-tag';
}

function scanTextChar(walk: Walk, char: string): void {
  const { scanner } = walk;
  switch (scanner.state) {
    case 'text':
      if (char === '<') scanner.state = 'tag-open';
      return;
    case 'tag-open':
      if (LETTER.test(char)) {
        scanner.state = 'tag-name';
        scanner.tagName = char.toLowerCase();
      } else if (char === '/') {
        scanner.state = 'end-tag';
      } else if (char === '!') {
        scanner.state = 'comment';
        scanner.closingText = '';
      } else {
        scanner.state = 'text';
      }
      return;
    case 'tag-name':
      if (WHITESPACE.test(char) || char === '/') {
        finishTagName(walk);
        scanner.state = 'in-tag';
      } else if (char === '>') {
        finishTagName(walk);
        closeTag(walk);
      } else {
        scanner.tagName += char.toLowerCase();
      }
      return;
    case 'end-tag':
      if (char === '>') scanner.state = 'text';
      return;
    case 'in-tag':
      if (char === '>') {
        closeTag(walk);
      } else if (!WHITESPACE.test(char) && char !== '/') {
        startAttribute(walk, char);
      }
      return;
    case 'attr-name':
      if (char === '=') {
        finishAttrName(walk);
        scanner.state = 'before-attr-value';
      } else if (WHITESPACE.test(char) || char === '/') {
        finishAttrName(walk);
        scanner.state = 'after-attr-name';
      } else if (char === '>') {
        finishAttrName(walk);
        finishAttribute(walk);
        closeTag(walk);
      } else {
        scanner.attrName += char.toLowerCase();
      }
      return;
    case 'after-attr-name':
      if (char === '=') {
        scanner.state = 'before-attr-value';
      } else if (char === '>') {
        finishAttribute(walk);
        closeTag(walk);
      } else if (!WHITESPACE.test(char) && char !== '/') {
        finishAttribute(walk);
        startAttribute(walk, char);
      }
      return;
    case 'before-attr-value':
      if (char === '"') {
        scanner.state = 'attr-value-double';
      } else if (char === "'") {
        scanner.state = 'attr-value-single';
      } else if (char === '>') {
        finishAttribute(walk);
        closeTag(walk);
      } else if (!WHITESPACE.test(char)) {
        scanner.state = 'attr-value-unquoted';
        scanner.attrValue = char;
      }
      return;
    case 'attr-value-double':
    case 'attr-value-single': {
      const quote = scanner.state === 'attr-value-double' ? '"' : "'";
      if (char === quote) {
        finishAttribute(walk);
        scanner.state = 'in-tag';
      } else {
        scanner.attrValue += char;
      }
      return;
    }
    case 'attr-value-unquoted':
      if (WHITESPACE.test(char)) {
        finishAttribute(walk);
        scanner.state = 'in-tag';
      } else if (char === '>') {
        finishAttribute(walk);
        closeTag(walk);
      } else {
        scanner.attrValue += char;
      }
      return;
    case 'comment':
      scanner.closingText += char;
      if (char === '>') scanner.state = 'text';
      return;
    case 'raw-text':
      scanner.closingText += char.toLowerCase();
      if (scanner.closingText.endsWith(`</${scanner.tagName}`)) scanner.state = 'end-tag';
      return;
    default: {
      const unknownState: never = scanner.state;
      throw new Error(`Unknown HTML scanner state ${String(unknownState)}`);
    }
  }
}

function scanContent(walk: Walk, node: hbs.AST.ContentStatement): void {
  walk.scanner.line = contentStartLine(node);
  for (const char of node.value) {
    if (char === '\n') walk.scanner.line += 1;
    scanTextChar(walk, char);
  }
}

function checkUrlMustache(walk: Walk, line: number | null, helper: string | null): void {
  const prefix = walk.scanner.attrValue.trim().toLowerCase();
  const isFragmentOrContact = SAFE_URL_PREFIXES.some((safe) => prefix.startsWith(safe));
  if (isFragmentOrContact || (helper !== null && URL_HELPERS.has(helper))) return;
  walk.report(line, `${walk.scanner.attrName} must use {{href …}} or {{safeUrl …}}`);
}

function isStyleSafe(resolved: ResolvedPath): boolean {
  if (resolved.kind === 'data' || resolved.kind === 'block') return true;
  if (resolved.kind !== 'field') return false;
  const { field, rest } = resolved;
  if (rest.length === 0 && STYLE_FIELD_TYPES.has(field.type)) {
    return (field.options ?? []).every((option) => isSafeCssValue(option.value));
  }
  const [key] = rest;
  if (field.type === 'image')
    return rest.length === 1 && key !== undefined && IMAGE_SIZE_KEYS.has(key);
  return field.type === 'list' && rest.length === 1 && key === 'length';
}

function checkStyleMustache(
  walk: Walk,
  node: hbs.AST.MustacheStatement,
  helper: string | null,
): void {
  const resolved =
    helper === null && isPath(node.path) ? resolvePath(node.path, walk.scopes) : null;
  if (resolved !== null && isStyleSafe(resolved)) return;
  walk.report(
    lineOf(node),
    'a style attribute may only use number, range, select, segmented and color fields, image sizes, @index and block.id',
  );
}

function checkTripleBraces(
  walk: Walk,
  node: hbs.AST.MustacheStatement,
  helper: string | null,
): void {
  const resolved =
    helper === null && isPath(node.path) ? resolvePath(node.path, walk.scopes) : null;
  const isRichText =
    resolved?.kind === 'field' && resolved.field.type === 'richtext' && resolved.rest.length === 0;
  if (!isRichText) walk.report(lineOf(node), 'triple braces {{{ }}} are only for rich text fields');
}

function checkMustachePosition(
  walk: Walk,
  node: hbs.AST.MustacheStatement,
  helper: string | null,
): void {
  const { scanner } = walk;
  const line = lineOf(node);
  settleAttribute(walk);
  switch (scanner.state) {
    case 'text':
      return;
    case 'in-tag':
      if (helper !== 'linkAttrs')
        walk.report(line, 'only {{linkAttrs …}} can add attributes inside a tag');
      return;
    case 'attr-value-double':
    case 'attr-value-single':
      scanner.attrHasMustache = true;
      if (!node.escaped) walk.report(line, 'triple braces can’t be used inside an attribute');
      if (URL_ATTRIBUTES.has(scanner.attrName)) checkUrlMustache(walk, line, helper);
      if (scanner.attrName === 'style') checkStyleMustache(walk, node, helper);
      return;
    default:
      walk.report(line, 'a {{…}} can only go in text or inside a quoted attribute value');
  }
}

function checkExpression(walk: Walk, node: hbs.AST.Expression): void {
  if (isSubExpression(node)) checkHelperCall(walk, node);
}

function checkHelperCall(
  walk: Walk,
  node: hbs.AST.MustacheStatement | hbs.AST.SubExpression,
): string | null {
  const helper = helperOf(node);
  if (helper !== null && !isTemplateHelper(helper)) {
    walk.report(lineOf(node), `"${helper}" is not a template helper`);
  }
  if (!isPath(node.path)) walk.report(lineOf(node), 'a mustache must name a field or a helper');
  for (const param of node.params) checkExpression(walk, param);
  for (const pair of hashPairs(node)) checkExpression(walk, pair.value);
  const [firstParam] = node.params;
  if (
    helper === 'svgIcon' &&
    firstParam !== undefined &&
    isStringLiteral(firstParam) &&
    !isSemanticIcon(firstParam.value)
  ) {
    walk.report(
      lineOf(node),
      `"${firstParam.value}" is not a built-in icon name; use an icon field instead`,
    );
  }
  return helper;
}

function checkSafeUrlDefault(
  walk: Walk,
  node: hbs.AST.MustacheStatement,
  helper: string | null,
): void {
  const [firstParam] = node.params;
  if (helper !== 'safeUrl' || firstParam === undefined || !isPath(firstParam)) return;
  const resolved = resolvePath(firstParam, walk.scopes);
  if (resolved.kind !== 'field' || typeof resolved.field.default !== 'string') return;
  if (resolved.field.default !== '' && !isRelativeUrl(resolved.field.default)) {
    walk.report(
      lineOf(node),
      `the default of ${resolved.field.name} must be empty or a relative address`,
    );
  }
}

function checkMustache(walk: Walk, node: hbs.AST.MustacheStatement): void {
  const helper = checkHelperCall(walk, node);
  if (!node.escaped) checkTripleBraces(walk, node, helper);
  checkSafeUrlDefault(walk, node, helper);
  checkMustachePosition(walk, node, helper);
}

function sameSpot(left: Scanner, right: Scanner): boolean {
  if (left.state !== right.state) return false;
  if (left.state === 'text' || left.state === 'comment' || left.state === 'end-tag') return true;
  if (left.state === 'attr-value-double' || left.state === 'attr-value-single') {
    return left.tagName === right.tagName && left.attrName === right.attrName;
  }
  return left.tagName === right.tagName;
}

function itemScope(walk: Walk, node: hbs.AST.BlockStatement): FieldScope {
  const [list] = node.params;
  if (list === undefined || !isPath(list)) return null;
  const resolved = resolvePath(list, walk.scopes);
  if (resolved.kind !== 'field' || resolved.field.type !== 'list' || resolved.rest.length > 0)
    return null;
  return fieldScope(resolved.field.itemFields);
}

function walkBranch(
  walk: Walk,
  program: hbs.AST.Program | undefined,
  start: Scanner,
  scopes: FieldScope[],
): Scanner {
  const branch: Walk = { ...walk, scanner: { ...start }, scopes };
  if (program !== undefined) walkProgram(branch, program);
  settleAttribute(branch);
  return branch.scanner;
}

function checkBlock(walk: Walk, node: hbs.AST.BlockStatement): void {
  const line = lineOf(node);
  const name = simpleName(node.path);
  if (name === null || !BLOCK_HELPERS.some((helper) => helper === name)) {
    walk.report(line, `{{#${node.path.original}}} is not allowed; use if, unless or each`);
    return;
  }
  const blockParams: string[] | undefined = node.program.blockParams;
  if (blockParams !== undefined && blockParams.length > 0) {
    walk.report(line, 'block parameters (as |item|) are not supported');
  }
  for (const param of node.params) checkExpression(walk, param);
  for (const pair of hashPairs(node)) checkExpression(walk, pair.value);
  settleAttribute(walk);
  const allowedStates: HtmlState[] = ['text', 'in-tag', 'attr-value-double', 'attr-value-single'];
  if (!allowedStates.includes(walk.scanner.state)) {
    walk.report(
      line,
      `{{#${name}}} can only wrap text, whole attributes or part of a quoted value`,
    );
  }
  const start = { ...walk.scanner };
  const innerScopes = name === 'each' ? [...walk.scopes, itemScope(walk, node)] : walk.scopes;
  const afterProgram = walkBranch(walk, node.program, start, innerScopes);
  const afterInverse = walkBranch(walk, node.inverse, start, walk.scopes);
  const isBalanced =
    sameSpot(afterProgram, afterInverse) && (name !== 'each' || sameSpot(afterProgram, start));
  if (!isBalanced)
    walk.report(line, `{{#${name}}} must end in the same place in the HTML where it started`);
  walk.scanner = {
    ...afterProgram,
    hasSeenRoot: afterProgram.hasSeenRoot || afterInverse.hasSeenRoot,
  };
}

function walkProgram(walk: Walk, program: hbs.AST.Program): void {
  for (const statement of program.body) {
    if (isContent(statement)) {
      scanContent(walk, statement);
    } else if (isMustache(statement)) {
      checkMustache(walk, statement);
    } else if (isBlock(statement)) {
      checkBlock(walk, statement);
    } else if (statement.type !== 'CommentStatement') {
      walk.report(lineOf(statement), `templates can’t use ${statement.type}`);
    }
  }
}

function parseErrorLine(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const line = PARSE_ERROR_LINE.exec(message)?.groups?.line;
  return line === undefined ? null : Number(line);
}

function firstLine(message: string): string {
  return message.split('\n')[0] ?? message;
}

function renderDefaults(template: InterpretedTemplate, custom: CustomDefinition): string {
  const values: Record<string, unknown> = {};
  for (const field of custom.definition.fields) values[field.name] = structuredClone(field.default);
  const context = { ...values, block: { id: 'preview', anchor: '' }, site: { title: 'Site' } };
  return template(context, { data: { pageSlugs: {}, currentPageId: null, language: 'en' } }).trim();
}

export function validateTemplate(custom: CustomDefinition, parse: ParseTemplate): TemplateCheck {
  const blockId = custom.definition.id;
  const errors: PackError[] = [];
  function report(line: number | null, message: string): void {
    errors.push({ block: blockId, field: 'template', line, message });
  }
  let program: hbs.AST.Program;
  try {
    program = parse(custom.template);
  } catch (error) {
    report(
      parseErrorLine(error),
      firstLine(error instanceof Error ? error.message : String(error)),
    );
    return { template: null, errors };
  }
  const walk: Walk = {
    scanner: createScanner(),
    scopes: [fieldScope(custom.definition.fields)],
    report,
  };
  walkProgram(walk, program);
  if (errors.length > 0) return { template: null, errors };
  const template = interpretTemplate(program);
  let html: string;
  try {
    html = renderDefaults(template, custom);
  } catch (error) {
    report(
      null,
      `could not render its defaults: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { template: null, errors };
  }
  const rootProblem = rootElementProblem(html, customRootClass(blockId));
  if (rootProblem !== null) report(1, rootProblem);
  return { template: errors.length > 0 ? null : template, errors };
}
