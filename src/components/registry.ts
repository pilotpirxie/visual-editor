import type { TemplateDelegate } from 'handlebars';
import type { ComponentBlock } from '../app/types';
import type { ComponentDefinition, RegisteredComponent } from './types';

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

function requireFile<T>(files: Record<string, T>, folder: string, file: string): T {
  const value = files[`${folder}/${file}`];
  if (value === undefined) throw new Error(`Component folder ${folder} is missing ${file}`);
  return value;
}

function buildRegistry(): ReadonlyMap<string, RegisteredComponent> {
  const registry = new Map<string, RegisteredComponent>();
  for (const [path, definition] of Object.entries(definitions)) {
    const folder = path.slice(0, -'/definition.ts'.length);
    if (folder.slice(folder.lastIndexOf('/') + 1) !== definition.id) {
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
    values: Object.fromEntries(
      definition.fields.map((field) => [field.name, structuredClone(field.default)]),
    ),
    overrides: {},
    disabled: false,
  };
}
