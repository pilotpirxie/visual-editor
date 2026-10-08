import type { Category } from '../components/types';
import { SHARED_SLOTS, type Page, type Project, type SharedSlot } from './types';

export type VisibleBlockLists = { header: string[]; page: string[]; footer: string[] };

type BlockListOwner = Pick<Project, 'pages' | 'sharedSlots'>;

const NO_BLOCKS: string[] = [];

export function sharedSlotOf(project: BlockListOwner, blockId: string): SharedSlot | null {
  for (const slot of SHARED_SLOTS) {
    if (project.sharedSlots[slot].includes(blockId)) return slot;
  }
  return null;
}

export function findBlockList(project: BlockListOwner, blockId: string): string[] | null {
  const slot = sharedSlotOf(project, blockId);
  if (slot !== null) return project.sharedSlots[slot];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page !== undefined && page.blockIds.includes(blockId)) return page.blockIds;
  }
  return null;
}

export function blockListOn(
  project: BlockListOwner,
  blockId: string,
  likelyPageId: string,
): string[] | null {
  const likelyList = project.pages.entities[likelyPageId]?.blockIds;
  if (likelyList?.includes(blockId) === true && sharedSlotOf(project, blockId) === null) {
    return likelyList;
  }
  return findBlockList(project, blockId);
}

export function visibleBlockLists(
  project: Pick<Project, 'sharedSlots'>,
  page: Page,
): VisibleBlockLists {
  return {
    header: page.showSharedHeader ? project.sharedSlots.header : NO_BLOCKS,
    page: page.blockIds,
    footer: page.showSharedFooter ? project.sharedSlots.footer : NO_BLOCKS,
  };
}

export function isBlockShown(
  project: Pick<Project, 'sharedSlots'>,
  page: Page,
  blockId: string,
): boolean {
  const { header, page: pageBlockIds, footer } = visibleBlockLists(project, page);
  return pageBlockIds.includes(blockId) || header.includes(blockId) || footer.includes(blockId);
}

export function slotForCategory(category: Category): SharedSlot | null {
  if (category === 'navigations' || category === 'banners') {
    return 'header';
  } else if (category === 'footers' || category === 'cookies' || category === 'modals') {
    return 'footer';
  } else {
    return null;
  }
}
