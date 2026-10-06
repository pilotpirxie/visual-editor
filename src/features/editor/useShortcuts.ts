import { useEffect } from 'react';
import { blockSelected } from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { dispatch, store } from '../../app/store';
import { dragController } from '../canvas/dragController';
import { isElementTarget } from '../canvas/frameDom';
import { duplicateBlock, moveBlock, removeBlock } from './blockActions';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const PROPERTIES_PANEL = '.ve-properties';

function isInside(target: EventTarget | null, selector: string): boolean {
  return isElementTarget(target) && target.closest(selector) !== null;
}

function handleKeyDown(event: KeyboardEvent): void {
  if (dragController.isActive()) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dragController.cancel();
    }
    return;
  }
  const isModifierPressed = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  const isHistoryKey = key === 'z' || key === 'y';
  if (isModifierPressed && isHistoryKey && !event.altKey && !event.isComposing) {
    event.preventDefault();
    const isRedo = key === 'y' || event.shiftKey;
    dispatch(isRedo ? redo() : undo());
    return;
  }

  const isTyping = isElementTarget(event.target) && event.target.matches(TEXT_ENTRY);
  if (event.defaultPrevented || isTyping || isInside(event.target, 'dialog')) return;

  if (event.key === 'Escape') {
    dispatch(blockSelected(null));
    return;
  }

  if (isInside(event.target, PROPERTIES_PANEL)) return;

  const blockId = store.getState().editor.selectedBlockId;
  if (!blockId) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    removeBlock(blockId);
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateBlock(blockId);
  } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault();
    moveBlock(blockId, event.key === 'ArrowUp' ? -1 : 1);
  }
}

export function useShortcuts(canvasDoc: Document | null): void {
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    canvasDoc?.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvasDoc?.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasDoc]);
}
