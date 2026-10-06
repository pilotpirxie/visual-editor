import { blockDuplicated, blockInserted, blockMoved, blockRemoved } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, store } from '../../app/store';
import type { DragPayload } from '../canvas/dragController';
import { finalMoveIndex } from '../canvas/dropIndex';

function currentPage() {
  return selectCurrentPage(store.getState());
}

export function insertComponent(componentId: string): void {
  const page = currentPage();
  const selectedId = store.getState().editor.selectedBlockId;
  const selectedIndex = selectedId ? page.blockIds.indexOf(selectedId) : -1;
  const index = selectedIndex === -1 ? page.blockIds.length : selectedIndex + 1;
  dispatch(blockInserted(page.id, index, componentId));
}

export function moveBlock(blockId: string, delta: number): void {
  const page = currentPage();
  const from = page.blockIds.indexOf(blockId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= page.blockIds.length) return;
  dispatch(blockMoved({ pageId: page.id, blockId, toIndex: to }));
}

export function duplicateBlock(blockId: string): void {
  dispatch(blockDuplicated(currentPage().id, blockId));
}

export function removeBlock(blockId: string): void {
  dispatch(blockRemoved({ pageId: currentPage().id, blockId }));
}

export function isNoopDrop(payload: DragPayload, dropIndex: number): boolean {
  if (payload.kind === 'new') return false;
  const from = currentPage().blockIds.indexOf(payload.blockId);
  return from === -1 || finalMoveIndex(from, dropIndex) === from;
}

export function dropOnCurrentPage(payload: DragPayload, dropIndex: number): void {
  const page = currentPage();
  if (payload.kind === 'new') {
    dispatch(blockInserted(page.id, dropIndex, payload.componentId));
    return;
  }
  if (isNoopDrop(payload, dropIndex)) return;
  const from = page.blockIds.indexOf(payload.blockId);
  dispatch(
    blockMoved({
      pageId: page.id,
      blockId: payload.blockId,
      toIndex: finalMoveIndex(from, dropIndex),
    }),
  );
}
