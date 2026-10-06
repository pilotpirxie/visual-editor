import { useEffect } from 'react';
import { blockSelected } from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { dispatch, type AppThunk } from '../../app/store';
import { dragController } from '../canvas/dragController';
import { isElementTarget } from '../canvas/frameDom';
import { duplicateBlock, moveBlockBy, removeBlock, type MoveOffset } from './blockActions';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const PROPERTIES_PANEL = '.ve-properties';

export type Shortcut =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'clear-selection' }
  | { kind: 'remove' }
  | { kind: 'duplicate' }
  | { kind: 'move'; offset: MoveOffset };

export type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  | 'key'
  | 'metaKey'
  | 'ctrlKey'
  | 'altKey'
  | 'shiftKey'
  | 'isComposing'
  | 'defaultPrevented'
  | 'target'
>;

function isInside(target: EventTarget | null, selector: string): boolean {
  return isElementTarget(target) && target.closest(selector) !== null;
}

function historyShortcut(event: ShortcutKeyEvent): Shortcut | null {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  const isHistoryKey = key === 'z' || key === 'y';
  if (!hasCommandKey || !isHistoryKey || event.altKey || event.isComposing) return null;
  if (key === 'y' || event.shiftKey) return { kind: 'redo' };
  return { kind: 'undo' };
}

function blockShortcut(event: ShortcutKeyEvent): Shortcut | null {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  if (event.key === 'Delete' || event.key === 'Backspace') {
    return { kind: 'remove' };
  } else if (hasCommandKey && event.key.toLowerCase() === 'd') {
    return { kind: 'duplicate' };
  } else if (event.altKey && event.key === 'ArrowUp') {
    return { kind: 'move', offset: -1 };
  } else if (event.altKey && event.key === 'ArrowDown') {
    return { kind: 'move', offset: 1 };
  } else {
    return null;
  }
}

export function shortcutFor(event: ShortcutKeyEvent): Shortcut | null {
  const history = historyShortcut(event);
  if (history !== null) return history;

  const isTyping = isElementTarget(event.target) && event.target.matches(TEXT_ENTRY);
  if (event.defaultPrevented || isTyping || isInside(event.target, 'dialog')) return null;
  if (event.key === 'Escape') return { kind: 'clear-selection' };
  if (isInside(event.target, PROPERTIES_PANEL)) return null;
  return blockShortcut(event);
}

function applyBlockShortcut(shortcut: Shortcut, blockId: string): AppThunk {
  return (dispatchAction) => {
    if (shortcut.kind === 'remove') {
      dispatchAction(removeBlock(blockId));
    } else if (shortcut.kind === 'duplicate') {
      dispatchAction(duplicateBlock(blockId));
    } else if (shortcut.kind === 'move') {
      dispatchAction(moveBlockBy(blockId, shortcut.offset));
    }
  };
}

export function applyShortcut(shortcut: Shortcut): AppThunk<boolean> {
  return (dispatchAction, getState) => {
    if (shortcut.kind === 'undo') {
      dispatchAction(undo());
      return true;
    } else if (shortcut.kind === 'redo') {
      dispatchAction(redo());
      return true;
    } else if (shortcut.kind === 'clear-selection') {
      dispatchAction(blockSelected(null));
      return false;
    }

    const blockId = getState().editor.selectedBlockId;
    if (blockId === null) return false;
    dispatchAction(applyBlockShortcut(shortcut, blockId));
    return true;
  };
}

function handleKeyDown(event: KeyboardEvent): void {
  if (dragController.isActive()) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    dragController.cancel();
    return;
  }
  const shortcut = shortcutFor(event);
  if (shortcut === null) return;
  const isConsumed = dispatch(applyShortcut(shortcut));
  if (isConsumed) event.preventDefault();
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
