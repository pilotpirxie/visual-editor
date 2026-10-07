import type { TemplateDelegate } from 'handlebars';
import type { Block, ComponentBlock, Project } from '../app/types';
import { defaultValues } from './fields';
import type { Category, ComponentDefinition, RegisteredComponent } from './types';

const definitions = import.meta.glob<ComponentDefinition>('./library/*/*/definition.ts', {
  eager: true,
  import: 'definition',
});
const templates = import.meta.glob<TemplateDelegate>('./library/*/*/template.hbs', {
  eager: true,
  import: 'default',
});
const styles = import.meta.glob<string>('./library/*/*/styles.css', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const thumbnails = import.meta.glob<string>('./library/*/*/thumbnail.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const DEFINITION_FILE = '/definition.ts';

function requireFile<T>(files: Record<string, T>, folder: string, file: string): T {
  const value = files[`${folder}/${file}`];
  if (value === undefined) throw new Error(`Component folder ${folder} is missing ${file}`);
  return value;
}

function buildRegistry(): ReadonlyMap<string, RegisteredComponent> {
  const registry = new Map<string, RegisteredComponent>();
  for (const [path, definition] of Object.entries(definitions)) {
    const folder = path.slice(0, path.length - DEFINITION_FILE.length);
    const folderName = folder.slice(folder.lastIndexOf('/') + 1);
    if (folderName !== definition.id) {
      throw new Error(`Component folder ${folder} must be named after its id "${definition.id}"`);
    }
    if (registry.has(definition.id)) {
      throw new Error(`Duplicate component id "${definition.id}" in ${folder}`);
    }
    registry.set(definition.id, {
      definition,
      template: requireFile(templates, folder, 'template.hbs'),
      styles: requireFile(styles, folder, 'styles.css'),
      thumbnail: requireFile(thumbnails, folder, 'thumbnail.svg'),
      isCustom: false,
    });
  }
  return registry;
}

export const registry = buildRegistry();

export function createBlock(definition: ComponentDefinition): ComponentBlock {
  return {
    id: crypto.randomUUID(),
    kind: 'component',
    componentId: definition.id,
    componentVersion: definition.version,
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

export type DefinitionSource = Pick<Project, 'customDefinitions'>;

export function definitionOf(
  project: DefinitionSource,
  componentId: string,
): ComponentDefinition | undefined {
  const builtIn = registry.get(componentId);
  if (builtIn !== undefined) return builtIn.definition;
  return project.customDefinitions[componentId]?.definition;
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
