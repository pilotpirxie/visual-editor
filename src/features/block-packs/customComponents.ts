import { customComponentsLoaded } from '../../app/editorSlice';
import type { AppThunk } from '../../app/store';
import type { Project } from '../../app/types';
import type { PackError } from '../../components/packFormat';
import { registry } from '../../components/registry';
import type { CustomDefinition, RegisteredComponent } from '../../components/types';
import { loadTemplateParser } from '../../render/templateParser';

type ComponentCache = { generation: number; components: ReadonlyMap<string, RegisteredComponent> };

const compiled = new Map<string, RegisteredComponent>();
const rejected = new Map<string, PackError[]>();
const contentKeys = new WeakMap<CustomDefinition, string>();
const projectRegistries = new WeakMap<Record<string, CustomDefinition>, ComponentCache>();
let generation = 0;

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function contentKeyOf(custom: CustomDefinition): string {
  const cached = contentKeys.get(custom);
  if (cached !== undefined) return cached;
  const content = JSON.stringify([custom.definition, custom.template, custom.styles]);
  const key = `${custom.definition.id}@${custom.pack.version}#${hashText(content)}`;
  contentKeys.set(custom, key);
  return key;
}

export function compiledComponent(custom: CustomDefinition): RegisteredComponent | undefined {
  return compiled.get(contentKeyOf(custom));
}

export function customComponentProblems(custom: CustomDefinition): PackError[] | undefined {
  return rejected.get(contentKeyOf(custom));
}

export async function ensureCustomComponents(
  customs: Iterable<CustomDefinition>,
): Promise<{ hasCompiled: boolean; problems: PackError[] }> {
  const pending: CustomDefinition[] = [];
  for (const custom of customs) {
    const key = contentKeyOf(custom);
    if (!compiled.has(key) && !rejected.has(key)) pending.push(custom);
  }
  if (pending.length === 0) return { hasCompiled: false, problems: [] };
  const [parse, { checkCustomDefinition }] = await Promise.all([
    loadTemplateParser(),
    import('./validatePack'),
  ]);
  const problems: PackError[] = [];
  for (const custom of pending) {
    const key = contentKeyOf(custom);
    const check = checkCustomDefinition(custom, parse);
    if (check.custom === null || check.template === null) {
      console.warn(
        `Custom block ${custom.definition.id} is not valid and will not render`,
        check.errors,
      );
      rejected.set(key, check.errors);
      problems.push(...check.errors);
      continue;
    }
    compiled.set(key, {
      definition: check.custom.definition,
      template: check.template,
      styles: check.custom.styles,
      thumbnail: check.custom.thumbnail,
      isCustom: true,
    });
  }
  generation += 1;
  return { hasCompiled: true, problems };
}

export function projectRegistry(
  project: Pick<Project, 'customDefinitions'>,
): ReadonlyMap<string, RegisteredComponent> {
  const customs = project.customDefinitions;
  if (Object.keys(customs).length === 0) return registry;
  const cached = projectRegistries.get(customs);
  if (cached?.generation === generation) return cached.components;
  const components = new Map(registry);
  for (const [id, custom] of Object.entries(customs)) {
    const component = compiledComponent(custom);
    if (component !== undefined) components.set(id, component);
  }
  projectRegistries.set(customs, { generation, components });
  return components;
}

export async function ensureProjectComponents(
  project: Pick<Project, 'customDefinitions'>,
): Promise<PackError[]> {
  const { problems } = await ensureCustomComponents(Object.values(project.customDefinitions));
  return problems;
}

export function loadCustomComponents(customs: CustomDefinition[]): AppThunk<Promise<void>> {
  return async (dispatch) => {
    const { hasCompiled } = await ensureCustomComponents(customs);
    if (hasCompiled) dispatch(customComponentsLoaded());
  };
}
