import {
  findBlockList,
  sharedSlotOf,
  slotForCategory,
  visibleBlockLists,
} from '../../app/blockLists';
import { blockSelected } from '../../app/editorSlice';
import {
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockRemoved,
  type BlockListTarget,
} from '../../app/projectSlice';
import { selectCurrentPage, type AppThunk, type RootState } from '../../app/store';
import type { Category } from '../../components/types';
import type { DragPayload } from '../canvas/dragController';
import { focusCanvas } from '../canvas/frameDom';
import { finalMoveIndex } from '../canvas/geometry';
import { loadBlockIconSets } from '../icons/ensureIconSets';
import { customEntryFor, loadPackBlocks } from '../block-packs/packLibrary';
import { noticeShown } from '../../app/editorSlice';

export type MoveOffset = -1 | 1;

function insertionIndex(state: RootState, pageBlockIds: string[]): number {
  const { selectedBlockId } = state.editor;
  if (selectedBlockId === null) return pageBlockIds.length;
  const slot = sharedSlotOf(state.project, selectedBlockId);
  if (slot === 'header') return 0;
  const selectedIndex = pageBlockIds.indexOf(selectedBlockId);
  return selectedIndex === -1 ? pageBlockIds.length : selectedIndex + 1;
}

export type BlockLocation = { target: BlockListTarget; index: number };

export function pasteLocation(state: RootState, category: Category | null): BlockLocation {
  const page = selectCurrentPage(state);
  const { selectedBlockId } = state.editor;
  const slot = selectedBlockId === null ? null : sharedSlotOf(state.project, selectedBlockId);
  const fitsSlot = slot !== null && category !== null && slotForCategory(category) === slot;
  if (selectedBlockId !== null && slot !== null && fitsSlot) {
    const list = state.project.sharedSlots[slot];
    return { target: { kind: 'slot', slot }, index: list.indexOf(selectedBlockId) + 1 };
  }
  return {
    target: { kind: 'page', pageId: page.id },
    index: insertionIndex(state, page.blockIds),
  };
}

function loadIconsOf(blockId: string): AppThunk {
  return (dispatch) => {
    dispatch(loadBlockIconSets([blockId])).catch((error: unknown) => {
      console.error(`Could not load the icons of block ${blockId}`, error);
    });
  };
}

function insertAt(pageId: string, index: number, componentId: string): AppThunk {
  return (dispatch, getState) => {
    const custom = customEntryFor(getState(), componentId);
    const inserted = dispatch(blockInserted(pageId, index, componentId, custom));
    dispatch(loadIconsOf(inserted.payload.block.id));
    if (custom === undefined) return;
    dispatch(loadPackBlocks([custom])).catch((error: unknown) => {
      console.error(`Could not prepare the custom block ${componentId}`, error);
      dispatch(
        noticeShown('error', `The custom block “${custom.definition.name}” could not be prepared.`),
      );
    });
  };
}

export function insertComponent(componentId: string): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    const page = selectCurrentPage(state);
    dispatch(insertAt(page.id, insertionIndex(state, page.blockIds), componentId));
  };
}

export function moveBlockBy(blockId: string, offset: MoveOffset): AppThunk {
  return (dispatch, getState) => {
    const list = findBlockList(getState().project, blockId);
    if (list === null) return;
    const to = list.indexOf(blockId) + offset;
    if (to < 0 || to >= list.length) return;
    dispatch(blockMoved({ blockId, toIndex: to }));
  };
}

export function selectSiblingBlock(offset: MoveOffset): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    const { header, page, footer } = visibleBlockLists(state.project, selectCurrentPage(state));
    const blockIds = [...header, ...page, ...footer];
    if (blockIds.length === 0) return;
    const { selectedBlockId } = state.editor;
    const current = selectedBlockId === null ? -1 : blockIds.indexOf(selectedBlockId);
    let next: number;
    if (current === -1) {
      next = offset === 1 ? 0 : blockIds.length - 1;
    } else {
      next = Math.min(Math.max(current + offset, 0), blockIds.length - 1);
    }
    if (next === current) return;
    dispatch(blockSelected(blockIds[next]));
  };
}

export function duplicateBlock(blockId: string): AppThunk {
  return (dispatch) => {
    dispatch(blockDuplicated(blockId));
  };
}

function neighbourLayerName(): HTMLElement | null {
  const row = document.activeElement?.closest('.ve-layer') ?? null;
  const neighbour = row?.nextElementSibling ?? row?.previousElementSibling ?? null;
  return neighbour?.querySelector<HTMLElement>('.ve-layer-name') ?? null;
}

function restoreFocusAfterRemoval(neighbour: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    if (neighbour?.isConnected === true) {
      neighbour.focus();
      return;
    }
    focusCanvas();
  });
}

export function removeBlock(blockId: string): AppThunk {
  return (dispatch) => {
    const neighbour = neighbourLayerName();
    dispatch(blockRemoved({ blockId }));
    restoreFocusAfterRemoval(neighbour);
  };
}

export function isNoopDrop(blockIds: string[], payload: DragPayload, dropIndex: number): boolean {
  if (payload.kind === 'list-item') {
    return true;
  } else if (payload.kind === 'new') {
    return false;
  } else {
    const from = blockIds.indexOf(payload.blockId);
    return from === -1 || finalMoveIndex(from, dropIndex) === from;
  }
}

export function dropBlock(payload: DragPayload, dropIndex: number): AppThunk {
  return (dispatch, getState) => {
    const page = selectCurrentPage(getState());
    if (payload.kind === 'new') {
      dispatch(insertAt(page.id, dropIndex, payload.componentId));
    } else if (payload.kind === 'move') {
      const list = findBlockList(getState().project, payload.blockId);
      if (list === null || isNoopDrop(list, payload, dropIndex)) return;
      const toIndex = finalMoveIndex(list.indexOf(payload.blockId), dropIndex);
      dispatch(blockMoved({ blockId: payload.blockId, toIndex }));
    }
  };
}
