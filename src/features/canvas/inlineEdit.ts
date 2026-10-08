import { blockValueSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { definitionOf } from '../../components/registry';
import type { Field } from '../../components/types';
import { INLINE_EDIT_ATTRIBUTE, isElementTarget } from './frameDom';

const NO_BREAK_SPACE = /\u00a0/g;
const LINE_BREAKS = /\r?\n/g;
const TRAILING_LINE_BREAKS = /\n+$/;

type InlineTarget = { blockId: string; field: Field };

type Point = { x: number; y: number };

type CaretDocument = Document & {
  caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?(x: number, y: number): Range | null;
};

export function inlineTextField(project: Project, blockId: string, path: string): Field | null {
  const block = project.blocks.entities[blockId];
  if (block?.kind !== 'component' || block.disabled) return null;
  const definition = definitionOf(project, block.componentId);
  const field = definition?.fields.find((candidate) => candidate.name === path);
  if (field === undefined) return null;
  if (field.type !== 'text' && field.type !== 'textarea') return null;
  return field;
}

export function hasOnlyText(element: Element): boolean {
  for (const node of element.childNodes) {
    const isText = node.nodeType === Node.TEXT_NODE;
    const isBreak = node.nodeName === 'BR';
    if (!isText && !isBreak) return false;
  }
  return true;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function elementText(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeName === 'BR') {
      text += '\n';
    } else if (isElementNode(node)) {
      text += elementText(node);
    } else {
      text += node.nodeValue ?? '';
    }
  }
  return text.replace(NO_BREAK_SPACE, ' ');
}

export function fieldTextValue(field: Field, text: string): string {
  let value = text.replace(TRAILING_LINE_BREAKS, '');
  if (field.type === 'text') value = value.replace(LINE_BREAKS, ' ');
  if (field.maxLength === undefined) return value;
  return value.slice(0, field.maxLength);
}

export function writeElementText(element: Element, text: string): void {
  const doc = element.ownerDocument;
  const nodes: Node[] = [];
  for (const [index, line] of text.split(LINE_BREAKS).entries()) {
    if (index > 0) nodes.push(doc.createElement('br'));
    nodes.push(doc.createTextNode(line));
  }
  element.replaceChildren(...nodes);
}

function caretRangeAt(doc: CaretDocument, element: Element, point: Point): Range | null {
  const position = doc.caretPositionFromPoint?.(point.x, point.y) ?? null;
  if (position !== null && element.contains(position.offsetNode)) {
    const range = doc.createRange();
    range.setStart(position.offsetNode, position.offset);
    return range;
  }
  const pointRange = doc.caretRangeFromPoint?.(point.x, point.y) ?? null;
  if (pointRange !== null && element.contains(pointRange.startContainer)) return pointRange;
  return null;
}

function selectRange(element: Element, range: Range): void {
  range.collapse(true);
  const selection = element.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function placeCaretAtEnd(element: Element): void {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selectRange(element, range);
}

function placeCaretAt(element: Element, point: Point): void {
  const range = caretRangeAt(element.ownerDocument, element, point);
  if (range === null) {
    placeCaretAtEnd(element);
    return;
  }
  selectRange(element, range);
}

function storedText(target: InlineTarget): string {
  const block = store.getState().project.blocks.entities[target.blockId];
  if (block?.kind !== 'component') return '';
  const value = block.values[target.field.name];
  return typeof value === 'string' ? value : '';
}

export function isInsideInlineEdit(target: EventTarget | null): boolean {
  if (!isElementTarget(target)) return false;
  return target.closest(`[${INLINE_EDIT_ATTRIBUTE}]`) !== null;
}

export function startInlineEdit(element: HTMLElement, target: InlineTarget, point: Point): void {
  if (element.hasAttribute(INLINE_EDIT_ATTRIBUTE)) return;
  element.setAttribute(INLINE_EDIT_ATTRIBUTE, '');
  element.setAttribute('contenteditable', 'plaintext-only');
  element.setAttribute('spellcheck', 'true');

  function commitInput(): void {
    const text = elementText(element);
    const value = fieldTextValue(target.field, text);
    const { maxLength } = target.field;
    const isTooLong = maxLength !== undefined && text.length > maxLength;
    if (isTooLong) {
      writeElementText(element, value);
      placeCaretAtEnd(element);
    }
    dispatch(blockValueSet(target.blockId, target.field.name, value, 'continuous'));
  }

  function syncFromStore(): void {
    if (!element.isConnected) {
      finish();
      return;
    }
    const value = storedText(target);
    if (fieldTextValue(target.field, elementText(element)) === value) return;
    writeElementText(element, value);
    placeCaretAtEnd(element);
  }

  function onKeyDown(event: KeyboardEvent): void {
    const isSingleLineEnter = event.key === 'Enter' && target.field.type === 'text';
    if (event.key !== 'Escape' && !isSingleLineEnter) return;
    event.preventDefault();
    event.stopPropagation();
    element.blur();
  }

  const unsubscribe = store.subscribe(syncFromStore);

  function finish(): void {
    unsubscribe();
    element.removeEventListener('input', commitInput);
    element.removeEventListener('keydown', onKeyDown);
    element.removeEventListener('blur', finish);
    element.removeAttribute('contenteditable');
    element.removeAttribute('spellcheck');
    element.removeAttribute(INLINE_EDIT_ATTRIBUTE);
    writeElementText(element, storedText(target));
  }

  element.addEventListener('input', commitInput);
  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('blur', finish);
  element.focus({ preventScroll: true });
  placeCaretAt(element, point);
}
