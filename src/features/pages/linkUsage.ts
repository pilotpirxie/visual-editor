import type { Project } from '../../app/types';
import { asListItems, isButtonValue, isLinkValue, itemTitle } from '../../components/fields';
import { definitionOf } from '../../components/registry';
import type { Field } from '../../components/types';

export type LinkUsage = { blockId: string; place: string; blockName: string; fieldLabel: string };

type BlockPlace = { blockId: string; place: string };

const SLOT_PLACES = { header: 'Shared header', footer: 'Shared footer' };

function linkingFieldLabels(field: Field, value: unknown, pageId: string): string[] {
  if (field.type === 'link') {
    return isLinkValue(value) && value.pageId === pageId ? [field.label] : [];
  } else if (field.type === 'button') {
    return isButtonValue(value) && value.link.pageId === pageId ? [field.label] : [];
  } else if (field.type !== 'list') {
    return [];
  }
  const labels: string[] = [];
  for (const [index, item] of asListItems(value).entries()) {
    for (const itemField of field.itemFields ?? []) {
      for (const label of linkingFieldLabels(itemField, item[itemField.name], pageId)) {
        labels.push(`${field.label}: ${itemTitle(field, item, index)} (${label})`);
      }
    }
  }
  return labels;
}

function blockPlaces(project: Project, deletedPageId: string): BlockPlace[] {
  const places: BlockPlace[] = [];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page === undefined || pageId === deletedPageId) continue;
    for (const blockId of page.blockIds) places.push({ blockId, place: page.name });
  }
  for (const blockId of project.sharedSlots.header) {
    places.push({ blockId, place: SLOT_PLACES.header });
  }
  for (const blockId of project.sharedSlots.footer) {
    places.push({ blockId, place: SLOT_PLACES.footer });
  }
  return places;
}

export function linksToPage(project: Project, pageId: string): LinkUsage[] {
  const usages: LinkUsage[] = [];
  for (const { blockId, place } of blockPlaces(project, pageId)) {
    const block = project.blocks.entities[blockId];
    if (block?.kind !== 'component') continue;
    const definition = definitionOf(project, block.componentId);
    if (definition === undefined) continue;
    for (const field of definition.fields) {
      for (const fieldLabel of linkingFieldLabels(field, block.values[field.name], pageId)) {
        usages.push({ blockId, place, blockName: definition.name, fieldLabel });
      }
    }
  }
  return usages;
}
