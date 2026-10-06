import { findBlockList, sharedSlotOf } from '../../app/blockLists';
import { blockDuplicated, blockInserted, blockMoved, blockRemoved } from '../../app/projectSlice';
import { selectCurrentPage, type AppThunk, type RootState } from '../../app/store';
import type { DragPayload } from '../canvas/dragController';
import { finalMoveIndex } from '../canvas/geometry';

export type MoveOffset = -1 | 1;

function insertionIndex(state: RootState, pageBlockIds: string[]): number {
  const { selectedBlockId } = state.editor;
  if (selectedBlockId === null) return pageBlockIds.length;
  const slot = sharedSlotOf(state.project, selectedBlockId);
  if (slot === 'header') return 0;
  const selectedIndex = pageBlockIds.indexOf(selectedBlockId);
  return selectedIndex === -1 ? pageBlockIds.length : selectedIndex + 1;
}

export function insertComponent(componentId: string): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    const page = selectCurrentPage(state);
    dispatch(blockInserted(page.id, insertionIndex(state, page.blockIds), componentId));
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

export function duplicateBlock(blockId: string): AppThunk {
  return (dispatch) => {
    dispatch(blockDuplicated(blockId));
  };
}

export function removeBlock(blockId: string): AppThunk {
  return (dispatch) => {
    dispatch(blockRemoved({ blockId }));
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
      dispatch(blockInserted(page.id, dropIndex, payload.componentId));
    } else if (payload.kind === 'move') {
      const list = findBlockList(getState().project, payload.blockId);
      if (list === null || isNoopDrop(list, payload, dropIndex)) return;
      const toIndex = finalMoveIndex(list.indexOf(payload.blockId), dropIndex);
      dispatch(blockMoved({ blockId: payload.blockId, toIndex }));
    }
  };
}
