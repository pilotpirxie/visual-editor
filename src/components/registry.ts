import type { Block, ComponentBlock, Project } from '../app/types';
import { interpretTemplate } from '../render/templateInterpreter';
import { loadTemplateParser } from '../render/templateParser';
import { defaultValues } from './fields';
import manifest from './library/pack.json';
import type { PackError } from './packFormat';
import type {
  BlockJson,
  Category,
  ComponentDefinition,
  PackBlock,
  PackInfo,
  RegisteredComponent,
} from './types';

const blockFiles = import.meta.glob<BlockJson>('./library/*/block.json', {
  eager: true,
  import: 'default',
});
const templates = import.meta.glob<hbs.AST.Program>('./library/*/template.hbs', {
  eager: true,
  import: 'default',
});
const styles = import.meta.glob<string>('./library/*/styles.css', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const thumbnails = import.meta.glob<string>('./library/*/thumbnail.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const LIBRARY_FOLDER = './library/';
const BLOCK_FILE = '/block.json';

export const BUILT_IN_PACK: PackInfo = manifest;

type ComponentCache = { generation: number; components: ReadonlyMap<string, RegisteredComponent> };

const compiled = new Map<string, RegisteredComponent>();
const rejected = new Map<string, PackError[]>();
const contentKeys = new WeakMap<PackBlock, string>();
const projectComponents = new WeakMap<Record<string, PackBlock>, ComponentCache>();
let generation = 0;

function requireFile<T>(files: Record<string, T>, folder: string, file: string): T {
  const value = files[`${folder}/${file}`];
  if (value === undefined) throw new Error(`Block folder ${folder} is missing ${file}`);
  return value;
}

function loadBuiltInComponents(): ReadonlyMap<string, RegisteredComponent> {
  const components = new Map<string, RegisteredComponent>();
  for (const [path, block] of Object.entries(blockFiles)) {
    const folder = path.slice(0, path.length - BLOCK_FILE.length);
    const id = folder.slice(LIBRARY_FOLDER.length);
    components.set(id, {
      pack: BUILT_IN_PACK,
      definition: { id, ...block },
      template: interpretTemplate(requireFile(templates, folder, 'template.hbs')),
      styles: requireFile(styles, folder, 'styles.css'),
      thumbnail: requireFile(thumbnails, folder, 'thumbnail.webp'),
    });
  }
  return components;
}

export const builtInComponents = loadBuiltInComponents();

export function isBuiltIn(pack: PackInfo): boolean {
  return pack.id === BUILT_IN_PACK.id;
}

export function componentIdOf(packId: string, blockId: string): string {
  return packId === BUILT_IN_PACK.id ? blockId : `${packId}/${blockId}`;
}

export function rootClassOf(componentId: string): string {
  return `b-${componentId.replace('/', '-')}`;
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function contentKeyOf(packBlock: PackBlock): string {
  const cached = contentKeys.get(packBlock);
  if (cached !== undefined) return cached;
  const content = JSON.stringify([packBlock.definition, packBlock.template, packBlock.styles]);
  const key = `${packBlock.definition.id}@${packBlock.pack.version}#${hashText(content)}`;
  contentKeys.set(packBlock, key);
  return key;
}

export function compiledPackBlock(packBlock: PackBlock): RegisteredComponent | undefined {
  return compiled.get(contentKeyOf(packBlock));
}

export function packBlockProblems(packBlock: PackBlock): PackError[] | undefined {
  return rejected.get(contentKeyOf(packBlock));
}

export async function ensurePackBlocks(
  packBlocks: Iterable<PackBlock>,
): Promise<{ hasCompiled: boolean; problems: PackError[] }> {
  const pending: PackBlock[] = [];
  for (const packBlock of packBlocks) {
    const key = contentKeyOf(packBlock);
    if (!compiled.has(key) && !rejected.has(key)) pending.push(packBlock);
  }
  if (pending.length === 0) return { hasCompiled: false, problems: [] };
  const [parse, { checkPackBlock }] = await Promise.all([
    loadTemplateParser(),
    import('./validatePack'),
  ]);
  const problems: PackError[] = [];
  for (const packBlock of pending) {
    const key = contentKeyOf(packBlock);
    const check = checkPackBlock(packBlock, parse);
    if (check.component === null) {
      console.warn(
        `Pack block ${packBlock.definition.id} is not valid and will not render`,
        check.errors,
      );
      rejected.set(key, check.errors);
      problems.push(...check.errors);
      continue;
    }
    compiled.set(key, check.component);
  }
  generation += 1;
  return { hasCompiled: true, problems };
}

export function componentsFor(
  project: Pick<Project, 'packBlocks'>,
): ReadonlyMap<string, RegisteredComponent> {
  const { packBlocks } = project;
  if (Object.keys(packBlocks).length === 0) return builtInComponents;
  const cached = projectComponents.get(packBlocks);
  if (cached?.generation === generation) return cached.components;
  const components = new Map(builtInComponents);
  for (const [id, packBlock] of Object.entries(packBlocks)) {
    const component = compiledPackBlock(packBlock);
    if (component !== undefined) components.set(id, component);
  }
  projectComponents.set(packBlocks, { generation, components });
  return components;
}

export function createBlock(definition: ComponentDefinition): ComponentBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'component',
    componentId: definition.id,
    values: defaultValues(definition.fields),
    overrides: {},
    disabled: false,
    extraClasses: [],
    hideOn: [],
  };
}

export function blockComponentId(block: Block): string | null {
  if (block.kind === 'component') return block.componentId;
  return block.sourceComponentId ?? null;
}

export type DefinitionSource = Pick<Project, 'packBlocks'>;

export function definitionOf(
  project: DefinitionSource,
  componentId: string,
): ComponentDefinition | undefined {
  const builtIn = builtInComponents.get(componentId);
  if (builtIn !== undefined) return builtIn.definition;
  return project.packBlocks[componentId]?.definition;
}

export function blockCategory(block: Block, project: DefinitionSource): Category | null {
  const componentId = blockComponentId(block);
  if (componentId === null) return null;
  return definitionOf(project, componentId)?.category ?? null;
}

export function blockLabel(block: Block, project: DefinitionSource): string {
  if (block.kind === 'html') return 'HTML block';
  const definition = definitionOf(project, block.componentId);
  if (definition === undefined) return `Missing component: ${block.componentId}`;
  return definition.name;
}
