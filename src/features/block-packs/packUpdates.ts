import type { Block, Project } from '../../app/types';
import {
  isButtonValue,
  isColorValue,
  isImageValue,
  isLinkValue,
  asListItems,
} from '../../components/fields';
import { compareVersions } from '../../components/packFormat';
import type { BlockPack, CustomDefinition, Field } from '../../components/types';
import { isRecord } from '../../persistence/parseBlock';
import { withFieldDefaults } from '../../persistence/migrations';

export type FieldChange = { blockName: string; field: string; pageNames: string[] };

export type PackUpgrade = {
  definitions: Record<string, CustomDefinition>;
  blocks: Block[];
  removedFields: FieldChange[];
  resetFields: FieldChange[];
};

type ValueUpgrade = { values: Record<string, unknown>; removed: string[]; reset: string[] };

export type UpgradeRule = 'newer' | 'newer-or-changed';

function fitsType(field: Field, value: unknown): boolean {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'date':
    case 'icon':
      return typeof value === 'string';
    case 'select':
    case 'segmented':
      return field.options?.some((option) => option.value === value) ?? false;
    case 'number':
    case 'range':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'color':
      return isColorValue(value);
    case 'image':
      return isImageValue(value);
    case 'link':
      return isLinkValue(value);
    case 'button':
      return isButtonValue(value);
    case 'list':
      return Array.isArray(value) && value.every(isRecord);
    default: {
      const unknownType: never = field.type;
      throw new Error(`Unknown field type "${String(unknownType)}"`);
    }
  }
}

function keptItems(field: Field, value: unknown): Record<string, unknown>[] {
  const itemFields = field.itemFields ?? [];
  const items: Record<string, unknown>[] = [];
  for (const item of asListItems(value)) {
    const kept: Record<string, unknown> = {};
    for (const itemField of itemFields) {
      const itemValue = item[itemField.name];
      if (itemValue !== undefined && fitsType(itemField, itemValue))
        kept[itemField.name] = itemValue;
    }
    items.push(withFieldDefaults(itemFields, kept));
  }
  return items;
}

function renamedValues(
  values: Record<string, unknown>,
  renames: Record<string, string>,
): Record<string, unknown> {
  const renamed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const target = renames[key];
    const isMoved = target !== undefined && !(target in values);
    renamed[isMoved ? target : key] = value;
  }
  return renamed;
}

export function upgradeValues(
  values: Record<string, unknown>,
  custom: CustomDefinition,
): ValueUpgrade {
  const renamed = renamedValues(values, custom.fieldRenames);
  const fieldNames = new Set(custom.definition.fields.map(({ name }) => name));
  const removed = Object.keys(renamed).filter((name) => !fieldNames.has(name));
  const reset: string[] = [];
  const upgraded: Record<string, unknown> = {};
  for (const field of custom.definition.fields) {
    const value = renamed[field.name];
    if (value === undefined) continue;
    if (!fitsType(field, value)) {
      reset.push(field.name);
      continue;
    }
    upgraded[field.name] = field.type === 'list' ? keptItems(field, value) : value;
  }
  return { values: withFieldDefaults(custom.definition.fields, upgraded), removed, reset };
}

function shouldUpgrade(
  embedded: CustomDefinition,
  offered: CustomDefinition,
  rule: UpgradeRule,
): boolean {
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
  const definitions: Record<string, CustomDefinition> = {};
  for (const offered of pack.blocks) {
    const embedded = project.customDefinitions[offered.definition.id];
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
    const upgrade = upgradeValues(block.values, custom);
    const pageNames = pageNamesOf(project, blockId);
    for (const field of upgrade.removed)
      addChange(removedFields, custom.definition.name, field, pageNames);
    for (const field of upgrade.reset)
      addChange(resetFields, custom.definition.name, field, pageNames);
    blocks.push({ ...block, componentVersion: custom.definition.version, values: upgrade.values });
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
  const customDefinitions: Record<string, CustomDefinition> = {};
  for (const [id, custom] of Object.entries(project.customDefinitions)) {
    if (used.has(id)) customDefinitions[id] = custom;
  }
  return { ...project, customDefinitions };
}
