import { describeError } from '../app/errors';
import { readZip } from '../features/export/zip';
import { chunkClasses } from '../render/css';
import type { ParseTemplate } from '../render/templateParser';
import { loadTemplateParser } from '../render/templateParser';
import {
  isBuiltIn,
  parsePackFiles,
  rootClassOf,
  type PackError,
  type ParsedPackFile,
} from './packFormat';
import { builtInComponents } from './registry';
import type { ComponentDefinition, PackBlock, RegisteredComponent } from './types';
import { validateCss } from './validateCss';
import { validateTemplate } from './validateTemplate';

export type PackBlockCheck = { component: RegisteredComponent | null; errors: PackError[] };

const FORM_ACTION_FIELD = 'formAction';
const FORM_METHOD_FIELD = 'formMethod';

function builtInClassOwners(): Map<string, string> {
  const owners = new Map<string, string>();
  for (const { definition, styles } of builtInComponents.values()) {
    owners.set(rootClassOf(definition.id), definition.id);
    for (const name of chunkClasses(styles)) owners.set(name, definition.id);
  }
  return owners;
}

const BUILT_IN_CLASS_OWNERS = builtInClassOwners();

function classProblem(
  packBlock: PackBlock,
  takenClasses: ReadonlyMap<string, string>,
): string | null {
  const blockId = packBlock.definition.id;
  const rootClass = rootClassOf(blockId);
  const builtInOwner = BUILT_IN_CLASS_OWNERS.get(rootClass);
  if (builtInOwner !== undefined && builtInOwner !== blockId) {
    return `makes the class ${rootClass}, which a built-in block already uses; rename the pack or block`;
  }
  const owner = takenClasses.get(rootClass);
  if (owner !== undefined && owner !== blockId) {
    return `makes the class ${rootClass}, which ${owner} already uses; rename the pack or block`;
  }
  return null;
}

function formFieldsProblem(definition: ComponentDefinition): string | null {
  const names = new Set(definition.fields.map(({ name }) => name));
  const hasAction = names.has(FORM_ACTION_FIELD);
  if (hasAction === names.has(FORM_METHOD_FIELD)) return null;
  return `needs both ${FORM_ACTION_FIELD} and ${FORM_METHOD_FIELD} fields, or neither`;
}

export function checkPackBlock(
  packBlock: PackBlock,
  parse: ParseTemplate,
  takenClasses: ReadonlyMap<string, string> = new Map(),
): PackBlockCheck {
  const blockId = packBlock.definition.id;
  const errors: PackError[] = [];
  const collision = classProblem(packBlock, takenClasses);
  if (collision !== null) {
    errors.push({ block: blockId, field: null, line: null, message: collision });
  }
  const formProblem = formFieldsProblem(packBlock.definition);
  if (formProblem !== null) {
    errors.push({ block: blockId, field: 'fields', line: null, message: formProblem });
  }
  const templateCheck = validateTemplate(packBlock, parse);
  const cssCheck = validateCss(packBlock.styles, {
    blockId,
    rootClass: rootClassOf(blockId),
    category: packBlock.definition.category,
  });
  errors.push(...templateCheck.errors, ...cssCheck.errors);
  if (errors.length > 0 || templateCheck.template === null || cssCheck.styles === null) {
    return { component: null, errors };
  }
  const component: RegisteredComponent = {
    pack: packBlock.pack,
    definition: packBlock.definition,
    template: templateCheck.template,
    styles: cssCheck.styles,
    thumbnail: packBlock.thumbnail,
  };
  return { component, errors };
}

export async function readBlockPack(
  bytes: Uint8Array<ArrayBuffer>,
  takenClasses: ReadonlyMap<string, string>,
): Promise<ParsedPackFile> {
  let files: Map<string, Uint8Array>;
  try {
    files = await readZip(bytes);
  } catch (error) {
    const message = `This file is not a block pack zip: ${describeError(error)}`;
    return { info: null, blocks: [], errors: [{ block: null, field: null, line: null, message }] };
  }
  const parsed = parsePackFiles(files);
  if (parsed.info !== null && isBuiltIn(parsed.info)) {
    const message = `can’t use the id "${parsed.info.id}": it is reserved for the built-in blocks`;
    return {
      info: null,
      blocks: [],
      errors: [{ block: null, field: 'pack.json id', line: null, message }],
    };
  }
  if (parsed.info === null || parsed.blocks.length === 0) return parsed;
  const parse = await loadTemplateParser();
  const blocks: PackBlock[] = [];
  const errors = [...parsed.errors];
  for (const packBlock of parsed.blocks) {
    const check = checkPackBlock(packBlock, parse, takenClasses);
    errors.push(...check.errors);
    if (check.component !== null) blocks.push({ ...packBlock, styles: check.component.styles });
  }
  return { info: parsed.info, blocks, errors };
}
