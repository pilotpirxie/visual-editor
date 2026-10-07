import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import { isRecord } from '../persistence/parseBlock';
import './handlebars';
import { BLOCK_HELPERS, isTemplateHelper } from './helperNames';

export type InterpretedTemplate = (context: unknown, options?: { data?: unknown }) => string;

type DataFrame = Record<string, unknown>;

type Scope = { data: DataFrame; depths: unknown[] };

type ProgramFn = (context: unknown, options?: { data?: unknown }) => string;

const NULL_CONTEXT = Object.seal({});
const SCOPED_PATH = /^(?:this|\.\.?)(?:[./]|$)/;

export class TemplateRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateRenderError';
  }
}

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

function isLiteral(
  node: hbs.AST.Node,
): node is hbs.AST.StringLiteral | hbs.AST.NumberLiteral | hbs.AST.BooleanLiteral {
  return (
    node.type === 'StringLiteral' || node.type === 'NumberLiteral' || node.type === 'BooleanLiteral'
  );
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function dataFrame(value: unknown): DataFrame {
  const frame: unknown = Handlebars.createFrame(value);
  if (!isRecord(frame)) throw new TemplateRenderError('Could not create a template data frame');
  return frame;
}

function lookupProperty(parent: unknown, name: string): unknown {
  if (isNullish(parent)) return parent;
  const value: unknown = Reflect.get(Object(parent), name);
  if (isNullish(value)) return value;
  if (typeof value === 'function') return undefined;
  return Object.prototype.hasOwnProperty.call(parent, name) ? value : undefined;
}

function dataAt(data: DataFrame, depth: number): unknown {
  let frame: unknown = data;
  for (let level = 0; level < depth && isRecord(frame); level += 1) frame = frame._parent;
  return frame;
}

function resolvePath(path: hbs.AST.PathExpression, scope: Scope): unknown {
  let current = path.data ? dataAt(scope.data, path.depth) : scope.depths[path.depth];
  for (const part of path.parts) {
    if (isNullish(current)) return current;
    current = lookupProperty(current, part);
  }
  return current;
}

function helperName(path: hbs.AST.PathExpression): string | null {
  const isSimple = path.parts.length === 1 && path.depth === 0 && !SCOPED_PATH.test(path.original);
  return isSimple ? (path.parts[0] ?? null) : null;
}

function hashPairs(node: { hash?: hbs.AST.Hash }): hbs.AST.HashPair[] {
  return node.hash?.pairs ?? [];
}

function isHelperCall(node: hbs.AST.MustacheStatement | hbs.AST.SubExpression): boolean {
  if (node.params.length > 0 || hashPairs(node).length > 0) return true;
  if (!isPath(node.path)) return false;
  const name = helperName(node.path);
  return name !== null && isTemplateHelper(name);
}

function noop(): string {
  return '';
}

function helperFor(name: string): (...args: unknown[]) => unknown {
  const helper = Handlebars.helpers[name];
  if (helper === undefined) throw new TemplateRenderError(`Unknown template helper "${name}"`);
  return helper;
}

function evaluateHash(
  pairs: hbs.AST.HashPair[],
  context: unknown,
  scope: Scope,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const pair of pairs) values[pair.key] = evaluate(pair.value, context, scope);
  return values;
}

function callHelper(
  node: hbs.AST.MustacheStatement | hbs.AST.SubExpression | hbs.AST.BlockStatement,
  context: unknown,
  scope: Scope,
  blocks: { fn: ProgramFn; inverse: ProgramFn },
): unknown {
  if (!isPath(node.path)) throw new TemplateRenderError(`A ${node.path.type} is not a helper`);
  const name = helperName(node.path);
  if (name === null) throw new TemplateRenderError(`"${node.path.original}" is not a helper`);
  const params: unknown[] = [];
  for (const param of node.params) params.push(evaluate(param, context, scope));
  const options: HelperOptions & { name: string; loc: hbs.AST.SourceLocation } = {
    name,
    hash: evaluateHash(hashPairs(node), context, scope),
    data: scope.data,
    loc: node.loc,
    fn: blocks.fn,
    inverse: blocks.inverse,
  };
  return helperFor(name).apply(isNullish(context) ? NULL_CONTEXT : context, [...params, options]);
}

function evaluate(node: hbs.AST.Expression, context: unknown, scope: Scope): unknown {
  if (isPath(node)) return resolvePath(node, scope);
  if (isSubExpression(node)) return callHelper(node, context, scope, { fn: noop, inverse: noop });
  if (isLiteral(node)) return node.value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'UndefinedLiteral') return undefined;
  throw new TemplateRenderError(`Templates can't use ${node.type}`);
}

function programFn(program: hbs.AST.Program | undefined, scope: Scope): ProgramFn {
  if (program === undefined) return noop;
  return (context, options = {}) => {
    const current = scope.depths[0];
    const isSameContext =
      context === current ||
      (isNullish(context) && isNullish(current)) ||
      (context === NULL_CONTEXT && current === null);
    const depths = isSameContext ? scope.depths : [context, ...scope.depths];
    const data = isRecord(options.data) ? options.data : scope.data;
    return renderProgram(program, context, { data, depths });
  };
}

function renderMustache(node: hbs.AST.MustacheStatement, context: unknown, scope: Scope): string {
  const value = isHelperCall(node)
    ? callHelper(node, context, scope, { fn: noop, inverse: noop })
    : evaluate(node.path, context, scope);
  if (node.escaped) return Handlebars.escapeExpression(value);
  return isNullish(value) ? '' : String(value);
}

function renderBlock(node: hbs.AST.BlockStatement, context: unknown, scope: Scope): string {
  const name = helperName(node.path);
  const isBlockHelper = BLOCK_HELPERS.some((helper) => helper === name);
  if (!isBlockHelper) throw new TemplateRenderError(`Unknown block helper "${node.path.original}"`);
  const blocks = { fn: programFn(node.program, scope), inverse: programFn(node.inverse, scope) };
  const result = callHelper(node, context, scope, blocks);
  return isNullish(result) ? '' : String(result);
}

function renderStatement(node: hbs.AST.Statement, context: unknown, scope: Scope): string {
  if (isContent(node)) return node.value;
  if (isMustache(node)) return renderMustache(node, context, scope);
  if (isBlock(node)) return renderBlock(node, context, scope);
  if (node.type === 'CommentStatement') return '';
  throw new TemplateRenderError(`Templates can't use ${node.type}`);
}

function renderProgram(program: hbs.AST.Program, context: unknown, scope: Scope): string {
  let html = '';
  for (const statement of program.body) html += renderStatement(statement, context, scope);
  return html;
}

export function interpretTemplate(program: hbs.AST.Program): InterpretedTemplate {
  return (context, options = {}) => {
    const data = dataFrame(options.data ?? {});
    data.root = context;
    return renderProgram(program, context, { data, depths: [context] });
  };
}
