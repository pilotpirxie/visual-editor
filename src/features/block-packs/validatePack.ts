import { formFieldsProblem } from '../../components/definitionRules';
import {
  customRootClass,
  parsePackFile,
  type PackError,
  type ParsedPackFile,
} from '../../components/packFormat';
import { registry } from '../../components/registry';
import type { CustomDefinition } from '../../components/types';
import { chunkClasses } from '../../render/css';
import type { InterpretedTemplate } from '../../render/templateInterpreter';
import { loadTemplateParser, type ParseTemplate } from '../../render/templateParser';
import { validateCss } from './validateCss';
import { validateTemplate } from './validateTemplate';

export type CustomBlockCheck = {
  custom: CustomDefinition | null;
  template: InterpretedTemplate | null;
  errors: PackError[];
};

export type PackReadOptions = {
  behaviorNames: readonly string[];
  takenClasses?: ReadonlyMap<string, string>;
};

const JSON_WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const JSON_STRING = /^"(?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/;
const JSON_LITERALS = ['true', 'false', 'null'];

type JsonCursor = { text: string; index: number };

function builtInClasses(): Set<string> {
  const classes = new Set<string>();
  for (const { definition, styles } of registry.values()) {
    classes.add(`b-${definition.id}`);
    for (const name of chunkClasses(styles)) classes.add(name);
  }
  return classes;
}

const BUILT_IN_CLASSES = builtInClasses();

function classProblem(
  custom: CustomDefinition,
  takenClasses: ReadonlyMap<string, string>,
): string | null {
  const rootClass = customRootClass(custom.definition.id);
  if (BUILT_IN_CLASSES.has(rootClass)) {
    return `makes the class ${rootClass}, which a built-in block already uses; rename the pack or block`;
  }
  const owner = takenClasses.get(rootClass);
  if (owner !== undefined && owner !== custom.definition.id) {
    return `makes the class ${rootClass}, which ${owner} already uses; rename the pack or block`;
  }
  return null;
}

export function checkCustomDefinition(
  custom: CustomDefinition,
  parse: ParseTemplate,
  takenClasses: ReadonlyMap<string, string> = new Map(),
): CustomBlockCheck {
  const blockId = custom.definition.id;
  const errors: PackError[] = [];
  const collision = classProblem(custom, takenClasses);
  if (collision !== null)
    errors.push({ block: blockId, field: 'id', line: null, message: collision });
  const formProblem = formFieldsProblem(custom.definition);
  if (formProblem !== null) {
    errors.push({ block: blockId, field: 'fields', line: null, message: formProblem });
  }
  const templateCheck = validateTemplate(custom, parse);
  const cssCheck = validateCss(custom.styles, {
    blockId,
    rootClass: customRootClass(blockId),
    category: custom.definition.category,
  });
  errors.push(...templateCheck.errors, ...cssCheck.errors);
  if (errors.length > 0 || templateCheck.template === null || cssCheck.styles === null) {
    return { custom: null, template: null, errors };
  }
  return {
    custom: { ...custom, styles: cssCheck.styles },
    template: templateCheck.template,
    errors,
  };
}

function lineOfOffset(text: string, offset: number): number {
  let line = 1;
  for (const char of text.slice(0, offset)) if (char === '\n') line += 1;
  return line;
}

function skipWhitespace(cursor: JsonCursor): void {
  while (JSON_WHITESPACE.has(cursor.text.charAt(cursor.index))) cursor.index += 1;
}

function expectChar(cursor: JsonCursor, char: string): boolean {
  skipWhitespace(cursor);
  if (cursor.text.charAt(cursor.index) !== char) return false;
  cursor.index += 1;
  return true;
}

function matchToken(cursor: JsonCursor, pattern: RegExp): boolean {
  const match = pattern.exec(cursor.text.slice(cursor.index));
  if (match === null) return false;
  cursor.index += match[0].length;
  return true;
}

function readMembers(cursor: JsonCursor, close: string, readMember: () => boolean): boolean {
  if (expectChar(cursor, close)) return true;
  do {
    if (!readMember()) return false;
  } while (expectChar(cursor, ','));
  return expectChar(cursor, close);
}

function readJsonValue(cursor: JsonCursor): boolean {
  skipWhitespace(cursor);
  const char = cursor.text.charAt(cursor.index);
  if (char === '{') {
    cursor.index += 1;
    return readMembers(cursor, '}', () => {
      skipWhitespace(cursor);
      return matchToken(cursor, JSON_STRING) && expectChar(cursor, ':') && readJsonValue(cursor);
    });
  }
  if (char === '[') {
    cursor.index += 1;
    return readMembers(cursor, ']', () => readJsonValue(cursor));
  }
  if (char === '"') return matchToken(cursor, JSON_STRING);
  const literal = JSON_LITERALS.find((word) => cursor.text.startsWith(word, cursor.index));
  if (literal !== undefined) {
    cursor.index += literal.length;
    return true;
  }
  return matchToken(cursor, JSON_NUMBER);
}

export function jsonErrorLine(text: string): number {
  const cursor: JsonCursor = { text, index: 0 };
  const isValue = readJsonValue(cursor);
  if (isValue) skipWhitespace(cursor);
  return lineOfOffset(text, cursor.index);
}

export async function readBlockPack(
  text: string,
  options: PackReadOptions,
): Promise<ParsedPackFile> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    const message = `This file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
    return {
      info: null,
      blocks: [],
      errors: [{ block: null, field: null, line: jsonErrorLine(text), message }],
    };
  }
  const parsed = parsePackFile(json, options.behaviorNames);
  if (parsed.info === null || parsed.blocks.length === 0) return parsed;
  const parse = await loadTemplateParser();
  const blocks: CustomDefinition[] = [];
  const errors = [...parsed.errors];
  for (const custom of parsed.blocks) {
    const check = checkCustomDefinition(custom, parse, options.takenClasses);
    errors.push(...check.errors);
    if (check.custom !== null) blocks.push(check.custom);
  }
  return { info: parsed.info, blocks, errors };
}
