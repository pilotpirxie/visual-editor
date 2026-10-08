import type { UnknownAction } from '@reduxjs/toolkit';
import { findBlockList } from '../../app/blockLists';
import { blockSelected, pageOpened } from '../../app/editorSlice';
import { redo, undo, type RootState } from '../../app/history';
import {
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockPasted,
  blockRemoved,
} from '../../app/projectSlice';
import type { Project } from '../../app/types';
import { blockLabel } from '../../components/registry';

const IS_MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');
const UNDO_KEYS = IS_MAC ? '⌘Z' : 'Ctrl+Z';

function labelOf(project: Project, blockId: string): string | null {
  const block = project.blocks.entities[blockId];
  return block === undefined ? null : blockLabel(block, project);
}

function positionOf(project: Project, blockId: string): string | null {
  const list = findBlockList(project, blockId);
  if (list === null) return null;
  return `${list.indexOf(blockId) + 1} of ${list.length}`;
}

export function announcementFor(
  action: UnknownAction,
  before: RootState,
  after: RootState,
): string | null {
  if (blockSelected.match(action)) {
    const blockId = action.payload;
    if (blockId === null || blockId === before.editor.selectedBlockId) return null;
    const label = labelOf(after.project, blockId);
    const position = positionOf(after.project, blockId);
    if (label === null || position === null) return null;
    return `${label} selected, ${position}`;
  } else if (blockMoved.match(action)) {
    const { blockId } = action.payload;
    const label = labelOf(after.project, blockId);
    const position = positionOf(after.project, blockId);
    if (label === null || position === null || before.project === after.project) return null;
    return `Moved ${label} to position ${position}`;
  } else if (blockDuplicated.match(action)) {
    const label = labelOf(after.project, action.payload.newBlockId);
    return label === null ? null : `Duplicated ${label}`;
  } else if (blockRemoved.match(action)) {
    const label = labelOf(before.project, action.payload.blockId);
    return label === null ? null : `Deleted ${label}. Undo with ${UNDO_KEYS}.`;
  } else if (blockInserted.match(action) || blockPasted.match(action)) {
    const label = labelOf(after.project, action.payload.block.id);
    return label === null ? null : `Added ${label}`;
  } else if (pageOpened.match(action)) {
    const page = after.project.pages.entities[action.payload.pageId];
    if (page === undefined || action.payload.pageId === action.payload.fromPageId) return null;
    return `Page ${page.name} opened`;
  } else if (undo.match(action) && before.project !== after.project) {
    return 'Undone';
  } else if (redo.match(action) && before.project !== after.project) {
    return 'Redone';
  } else {
    return null;
  }
}
