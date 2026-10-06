import { blockDuplicated, blockInserted, blockMoved, blockRemoved } from '../../app/projectSlice';
import { selectCurrentPage, type AppThunk } from '../../app/store';
import type { DragPayload } from '../canvas/dragController';
import { finalMoveIndex } from '../canvas/geometry';

export type MoveOffset = -1 | 1;

export function insertComponent(componentId: string): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    const page = selectCurrentPage(state);
    const { selectedBlockId } = state.editor;
    const selectedIndex = selectedBlockId === null ? -1 : page.blockIds.indexOf(selectedBlockId);
    const index = selectedIndex === -1 ? page.blockIds.length : selectedIndex + 1;
    dispatch(blockInserted(page.id, index, componentId));
  };
}

export function moveBlockBy(blockId: string, offset: MoveOffset): AppThunk {
  return (dispatch, getState) => {
    const page = selectCurrentPage(getState());
    const from = page.blockIds.indexOf(blockId);
    const to = from + offset;
    const isInRange = from !== -1 && to >= 0 && to < page.blockIds.length;
    if (!isInRange) return;
    dispatch(blockMoved({ pageId: page.id, blockId, toIndex: to }));
  };
}

export function duplicateBlock(blockId: string): AppThunk {
  return (dispatch, getState) => {
    dispatch(blockDuplicated(selectCurrentPage(getState()).id, blockId));
  };
}

export function removeBlock(blockId: string): AppThunk {
  return (dispatch, getState) => {
    dispatch(blockRemoved({ pageId: selectCurrentPage(getState()).id, blockId }));
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
    } else if (payload.kind === 'move' && !isNoopDrop(page.blockIds, payload, dropIndex)) {
      const from = page.blockIds.indexOf(payload.blockId);
      const toIndex = finalMoveIndex(from, dropIndex);
      dispatch(blockMoved({ pageId: page.id, blockId: payload.blockId, toIndex }));
    }
  };
}
