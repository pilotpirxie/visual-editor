import { useEffect } from 'react';
import { dispatch, store } from '../../app/store';
import { isElementTarget } from '../canvas/frameDom';
import { copyBlockTo, cutBlockTo, parseEnvelope, pasteEnvelope } from './clipboard';
import { isEditingTarget } from './useShortcuts';

type ClipboardData = Pick<DataTransfer, 'getData' | 'setData'>;

const CLIPBOARD_EVENTS = ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'];

function isClipboardData(value: unknown): value is ClipboardData {
  return typeof value === 'object' && value !== null && 'getData' in value && 'setData' in value;
}

function clipboardDataOf(event: Event): ClipboardData | null {
  if (!('clipboardData' in event)) return null;
  const data = event.clipboardData;
  return isClipboardData(data) ? data : null;
}

function hasTextSelection(event: Event): boolean {
  const doc = isElementTarget(event.target) ? event.target.ownerDocument : document;
  const selection = doc.getSelection();
  return selection !== null && !selection.isCollapsed;
}

function isEditorPaused(event: Event): boolean {
  return store.getState().editor.isPreview || isEditingTarget(event.target);
}

function copiedBlockId(event: Event): string | null {
  if (isEditorPaused(event) || hasTextSelection(event)) return null;
  return store.getState().editor.selectedBlockId;
}

function handlePaste(event: Event): void {
  const data = clipboardDataOf(event);
  if (data === null || isEditorPaused(event)) return;
  const envelope = parseEnvelope(data.getData('text/plain'));
  if (envelope === null) return;
  event.preventDefault();
  dispatch(pasteEnvelope(envelope)).catch((error: unknown) => {
    console.error('Pasting a block failed', error);
  });
}

function handleClipboardEvent(event: Event): void {
  if (event.type === 'paste') {
    handlePaste(event);
    return;
  }
  const blockId = copiedBlockId(event);
  if (blockId === null) return;
  if (event.type.startsWith('before')) {
    event.preventDefault();
    return;
  }
  const data = clipboardDataOf(event);
  if (data === null) return;
  const action = event.type === 'cut' ? cutBlockTo(blockId, data) : copyBlockTo(blockId, data);
  if (dispatch(action)) event.preventDefault();
}

export function useClipboard(canvasDoc: Document | null): void {
  useEffect(() => {
    const docs = canvasDoc === null ? [document] : [document, canvasDoc];
    for (const doc of docs) {
      for (const type of CLIPBOARD_EVENTS) doc.addEventListener(type, handleClipboardEvent);
    }
    return () => {
      for (const doc of docs) {
        for (const type of CLIPBOARD_EVENTS) doc.removeEventListener(type, handleClipboardEvent);
      }
    };
  }, [canvasDoc]);
}
