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

function selectionAnnouncement(
  blockId: string | null,
  before: RootState,
  after: RootState,
): string | null {
  if (blockId === null || blockId === before.editor.selectedBlockId) return null;
  const label = labelOf(after.project, blockId);
  const position = positionOf(after.project, blockId);
  if (label === null || position === null) return null;
  return `${label} selected, ${position}`;
}

function moveAnnouncement(blockId: string, before: RootState, after: RootState): string | null {
  const label = labelOf(after.project, blockId);
  const position = positionOf(after.project, blockId);
  if (label === null || position === null || before.project === after.project) return null;
  return `Moved ${label} to position ${position}`;
}

function pageAnnouncement(pageId: string, fromPageId: string, after: RootState): string | null {
  const page = after.project.pages.entities[pageId];
  if (page === undefined || pageId === fromPageId) return null;
  return `Page ${page.name} opened`;
}

function blockAnnouncement(
  action: UnknownAction,
  before: RootState,
  after: RootState,
): string | null {
  if (blockSelected.match(action)) {
    return selectionAnnouncement(action.payload, before, after);
  } else if (blockMoved.match(action)) {
    return moveAnnouncement(action.payload.blockId, before, after);
  } else if (blockDuplicated.match(action)) {
    const label = labelOf(after.project, action.payload.newBlockId);
    return label === null ? null : `Duplicated ${label}`;
  } else if (blockRemoved.match(action)) {
    const label = labelOf(before.project, action.payload.blockId);
    return label === null ? null : `Deleted ${label}. Undo with ${UNDO_KEYS}.`;
  } else if (blockInserted.match(action) || blockPasted.match(action)) {
    const label = labelOf(after.project, action.payload.block.id);
    return label === null ? null : `Added ${label}`;
  } else {
    return null;
  }
}

export function announcementFor(
  action: UnknownAction,
  before: RootState,
  after: RootState,
): string | null {
  const hasProjectChanged = before.project !== after.project;
  if (pageOpened.match(action)) {
    return pageAnnouncement(action.payload.pageId, action.payload.fromPageId, after);
  } else if (undo.match(action)) {
    return hasProjectChanged ? 'Undone' : null;
  } else if (redo.match(action)) {
    return hasProjectChanged ? 'Redone' : null;
  } else {
    return blockAnnouncement(action, before, after);
  }
}
