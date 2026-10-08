import type { Block, Project } from '../../app/types';
import { fitValues } from '../../components/fieldValues';
import { compareVersions } from '../../components/packFormat';
import type { BlockPack, PackBlock } from '../../components/types';

export type FieldChange = { blockName: string; field: string; pageNames: string[] };

export type PackUpgrade = {
  definitions: Record<string, PackBlock>;
  blocks: Block[];
  removedFields: FieldChange[];
  resetFields: FieldChange[];
};

export type UpgradeRule = 'newer' | 'newer-or-changed';

function shouldUpgrade(embedded: PackBlock, offered: PackBlock, rule: UpgradeRule): boolean {
  const order = compareVersions(offered.pack.version, embedded.pack.version);
  if (order > 0) return true;
  if (order < 0 || rule === 'newer') return false;
  return JSON.stringify(offered) !== JSON.stringify(embedded);
}

function pageNamesOf(project: Project, blockId: string): string[] {
  const names: string[] = [];
  const isShared =
    project.sharedSlots.header.includes(blockId) || project.sharedSlots.footer.includes(blockId);
  if (isShared) names.push('every page');
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page?.blockIds.includes(blockId) === true) names.push(page.name);
  }
  return names;
}

function addChange(
  changes: FieldChange[],
  blockName: string,
  field: string,
  pageNames: string[],
): void {
  const existing = changes.find(
    (change) => change.blockName === blockName && change.field === field,
  );
  if (existing === undefined) {
    changes.push({ blockName, field, pageNames: [...pageNames] });
    return;
  }
  for (const name of pageNames) {
    if (!existing.pageNames.includes(name)) existing.pageNames.push(name);
  }
}

export function upgradeProjectToPack(
  project: Project,
  pack: BlockPack,
  rule: UpgradeRule,
): PackUpgrade | null {
  const definitions: Record<string, PackBlock> = {};
  for (const offered of pack.blocks) {
    const embedded = project.packBlocks[offered.definition.id];
    if (embedded !== undefined && shouldUpgrade(embedded, offered, rule)) {
      definitions[offered.definition.id] = offered;
    }
  }
  if (Object.keys(definitions).length === 0) return null;
  const blocks: Block[] = [];
  const removedFields: FieldChange[] = [];
  const resetFields: FieldChange[] = [];
  for (const blockId of project.blocks.ids) {
    const block = project.blocks.entities[blockId];
    if (block?.kind !== 'component') continue;
    const custom = definitions[block.componentId];
    if (custom === undefined) continue;
    const upgrade = fitValues(custom.definition.fields, block.values);
    const pageNames = pageNamesOf(project, blockId);
    for (const field of upgrade.removed)
      addChange(removedFields, custom.definition.name, field, pageNames);
    for (const field of upgrade.reset)
      addChange(resetFields, custom.definition.name, field, pageNames);
    blocks.push({ ...block, values: upgrade.values });
  }
  return { definitions, blocks, removedFields, resetFields };
}

function describeChanges(verb: string, changes: FieldChange[]): string[] {
  const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  const sentences: string[] = [];
  for (const { blockName, field, pageNames } of changes) {
    sentences.push(`${verb} “${field}” in ${blockName} on ${list.format(pageNames)}.`);
  }
  return sentences;
}

export function upgradeNotice(pack: BlockPack, upgrade: PackUpgrade): string {
  return [
    `Updated ${pack.name} to ${pack.version}.`,
    ...describeChanges('Removed', upgrade.removedFields),
    ...describeChanges('Reset', upgrade.resetFields),
  ].join(' ');
}

export function usedComponentIds(project: Project): Set<string> {
  const used = new Set<string>();
  for (const blockId of project.blocks.ids) {
    const block = project.blocks.entities[blockId];
    if (block === undefined) continue;
    const componentId = block.kind === 'component' ? block.componentId : block.sourceComponentId;
    if (componentId !== undefined) used.add(componentId);
  }
  return used;
}

export function withoutUnusedDefinitions(project: Project): Project {
  const used = usedComponentIds(project);
  const packBlocks: Record<string, PackBlock> = {};
  for (const [id, custom] of Object.entries(project.packBlocks)) {
    if (used.has(id)) packBlocks[id] = custom;
  }
  return { ...project, packBlocks };
}
