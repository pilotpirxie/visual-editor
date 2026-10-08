import { useEffect } from 'react';
import { blockSelected, dialogOpened, previewToggled } from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { dispatch, type AppThunk } from '../../app/store';
import { dragController } from '../canvas/dragController';
import { fileCommands } from '../files/fileCommands';
import { isElementTarget } from '../canvas/frameDom';
import {
  duplicateBlock,
  moveBlockBy,
  removeBlock,
  selectSiblingBlock,
  type MoveOffset,
} from './blockActions';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const EDITING_PANELS = '.ve-properties, .ve-design-sheet';
const BLOCK_SHORTCUT_AREAS = '.ve-canvas, .ve-layers';

export type Shortcut =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'clear-selection' }
  | { kind: 'remove' }
  | { kind: 'duplicate' }
  | { kind: 'move'; offset: MoveOffset }
  | { kind: 'select-sibling'; offset: MoveOffset }
  | { kind: 'toggle-preview' }
  | { kind: 'open' }
  | { kind: 'save'; isSaveAs: boolean }
  | { kind: 'command-palette' }
  | { kind: 'help' };

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

function isPlainKey(event: ShortcutKeyEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

function blockShortcut(event: ShortcutKeyEvent, isFromCanvas: boolean): Shortcut | null {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  const isArrow = event.key === 'ArrowUp' || event.key === 'ArrowDown';
  if (isFromCanvas && isArrow && isPlainKey(event)) {
    return { kind: 'select-sibling', offset: event.key === 'ArrowUp' ? -1 : 1 };
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
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

function isBlockShortcutTarget(target: EventTarget | null, isFromCanvas: boolean): boolean {
  if (isFromCanvas || !isElementTarget(target)) return true;
  if (target === target.ownerDocument.body) return true;
  if (target.closest('[role="menu"]') !== null) return false;
  return target.closest(BLOCK_SHORTCUT_AREAS) !== null;
}

export function isEditingTarget(target: EventTarget | null): boolean {
  const isTyping = isElementTarget(target) && target.matches(TEXT_ENTRY);
  return isTyping || isInside(target, 'dialog') || isInside(target, EDITING_PANELS);
}

function isPreviewKey(event: ShortcutKeyEvent): boolean {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  return hasCommandKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'p';
}

function isPaletteKey(event: ShortcutKeyEvent): boolean {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  return hasCommandKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

function fileShortcut(event: ShortcutKeyEvent): Shortcut | null {
  const hasCommandKey = event.metaKey || event.ctrlKey;
  if (!hasCommandKey || event.altKey || event.isComposing) return null;
  const key = event.key.toLowerCase();
  if (key === 's') return { kind: 'save', isSaveAs: event.shiftKey };
  if (key === 'o' && !event.shiftKey) return { kind: 'open' };
  return null;
}

export function shortcutFor(event: ShortcutKeyEvent, isFromCanvas = false): Shortcut | null {
  const history = historyShortcut(event);
  if (history !== null) return history;
  const file = fileShortcut(event);
  if (file?.kind === 'save') return file;
  if (isPaletteKey(event) && !event.isComposing && !isInside(event.target, 'dialog')) {
    return { kind: 'command-palette' };
  }

  const isTyping = isElementTarget(event.target) && event.target.matches(TEXT_ENTRY);
  if (event.defaultPrevented || isTyping || isInside(event.target, 'dialog')) return null;
  if (event.key === 'Escape') return { kind: 'clear-selection' };
  if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    return { kind: 'help' };
  }
  if (isPreviewKey(event)) return { kind: 'toggle-preview' };
  if (file !== null) return file;
  if (isInside(event.target, EDITING_PANELS)) return null;
  if (!isBlockShortcutTarget(event.target, isFromCanvas)) return null;
  return blockShortcut(event, isFromCanvas);
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
    const { isPreview } = getState().editor;
    if (shortcut.kind === 'open') {
      fileCommands.openFromDisk();
      return true;
    } else if (shortcut.kind === 'save') {
      fileCommands.save(shortcut.isSaveAs);
      return true;
    } else if (shortcut.kind === 'toggle-preview') {
      dispatchAction(previewToggled(!isPreview));
      return true;
    } else if (shortcut.kind === 'command-palette') {
      dispatchAction(dialogOpened({ kind: 'palette' }));
      return true;
    } else if (shortcut.kind === 'help') {
      dispatchAction(dialogOpened({ kind: 'help' }));
      return true;
    }
    if (isPreview) {
      if (shortcut.kind !== 'clear-selection') return false;
      dispatchAction(previewToggled(false));
      return true;
    }
    if (shortcut.kind === 'select-sibling') {
      dispatchAction(selectSiblingBlock(shortcut.offset));
      return true;
    } else if (shortcut.kind === 'undo') {
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

function handleKeyDown(event: KeyboardEvent, isFromCanvas: boolean): void {
  if (dragController.isActive()) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    dragController.cancel();
    return;
  }
  const shortcut = shortcutFor(event, isFromCanvas);
  if (shortcut === null) return;
  const isConsumed = dispatch(applyShortcut(shortcut));
  if (isConsumed) event.preventDefault();
}

function handleEditorKeyDown(event: KeyboardEvent): void {
  const isOnCanvas = isElementTarget(event.target) && event.target.matches('.ve-canvas');
  handleKeyDown(event, isOnCanvas);
}

function handleCanvasKeyDown(event: KeyboardEvent): void {
  handleKeyDown(event, true);
}

export function useShortcuts(canvasDoc: Document | null): void {
  useEffect(() => {
    window.addEventListener('keydown', handleEditorKeyDown);
    canvasDoc?.addEventListener('keydown', handleCanvasKeyDown);
    return () => {
      window.removeEventListener('keydown', handleEditorKeyDown);
      canvasDoc?.removeEventListener('keydown', handleCanvasKeyDown);
    };
  }, [canvasDoc]);
}
