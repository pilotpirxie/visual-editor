import { iconSetsLoaded } from '../../app/editorSlice';
import type { AppThunk } from '../../app/store';
import type { Block, Project } from '../../app/types';
import { forEachFieldValue } from '../../components/fieldValues';
import { definitionOf } from '../../components/registry';
import { DEFAULT_ICON_SET, parseIconRef } from '../../render/icons';
import { isIconSetLoaded, loadIconSet } from './loadIconSet';

type IconSource = Pick<Project, 'customDefinitions' | 'designSystem'>;

function addFixedSets(block: Block, project: IconSource, sets: Set<string>): void {
  if (block.kind !== 'component') return;
  const definition = definitionOf(project, block.componentId);
  if (definition === undefined) return;
  forEachFieldValue(definition.fields, block.values, (field, value) => {
    if (field.type !== 'icon' || typeof value !== 'string') return;
    const { set } = parseIconRef(value);
    if (set !== null) sets.add(set);
  });
}

export function iconSetsUsedBy(blocks: Iterable<Block>, project: IconSource): Set<string> {
  const sets = new Set([DEFAULT_ICON_SET, project.designSystem.iconSet]);
  for (const block of blocks) addFixedSets(block, project, sets);
  return sets;
}

export async function ensureIconSets(sets: Iterable<string>): Promise<void> {
  const loads: Promise<void>[] = [];
  for (const set of sets) loads.push(loadIconSet(set));
  await Promise.all(loads);
}

export async function ensureProjectIconSets(project: Project): Promise<void> {
  const blocks = Object.values(project.blocks.entities);
  await ensureIconSets(iconSetsUsedBy(blocks, project));
}

export function loadBlockIconSets(blockIds: readonly string[]): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const { project } = getState();
    const blocks: Block[] = [];
    for (const blockId of blockIds) {
      const block = project.blocks.entities[blockId];
      if (block !== undefined) blocks.push(block);
    }
    const missing: string[] = [];
    for (const set of iconSetsUsedBy(blocks, project)) {
      if (!isIconSetLoaded(set)) missing.push(set);
    }
    if (missing.length === 0) return;
    await ensureIconSets(missing);
    dispatch(iconSetsLoaded());
  };
}
