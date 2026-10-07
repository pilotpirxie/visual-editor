import { useEffect, useLayoutEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { formatHtml } from '../../render/formatHtml';
import { setBlockHtml } from '../editor/htmlBlockActions';
import { findUnclosedTags, tokenizeHtml, type HtmlTokenKind } from './htmlTokens';

export const CODE_COMMIT_DELAY_MS = 300;

const INDENT = '  ';
const HIGHLIGHT_KINDS: HtmlTokenKind[] = ['tag', 'attribute', 'value', 'comment'];
const LEADING_SPACES = /^ */;

type CodeFieldProps = { id: string; blockId: string; html: string };

function canHighlight(): boolean {
  return typeof Highlight === 'function' && 'highlights' in CSS;
}

function textNodesOf(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) nodes.push(node);
  }
  return nodes;
}

function pointAt(nodes: readonly Text[], offset: number): { node: Text; offset: number } | null {
  let remaining = offset;
  for (const node of nodes) {
    if (remaining <= node.length) return { node, offset: remaining };
    remaining -= node.length;
  }
  return null;
}

function highlight(editor: HTMLElement): void {
  if (!canHighlight()) return;
  const nodes = textNodesOf(editor);
  const ranges: Record<HtmlTokenKind, Range[]> = { tag: [], attribute: [], value: [], comment: [] };
  for (const token of tokenizeHtml(editor.textContent ?? '')) {
    const start = pointAt(nodes, token.start);
    const end = pointAt(nodes, token.end);
    if (start === null || end === null) continue;
    const range = editor.ownerDocument.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    ranges[token.kind].push(range);
  }
  for (const kind of HIGHLIGHT_KINDS) {
    CSS.highlights.set(`ve-code-${kind}`, new Highlight(...ranges[kind]));
  }
}

function clearHighlights(): void {
  if (!canHighlight()) return;
  for (const kind of HIGHLIGHT_KINDS) CSS.highlights.delete(`ve-code-${kind}`);
}

function caretOffset(editor: HTMLElement): number | null {
  const selection = editor.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0) return null;
  const caret = selection.getRangeAt(0);
  if (!editor.contains(caret.startContainer)) return null;
  const before = editor.ownerDocument.createRange();
  before.selectNodeContents(editor);
  before.setEnd(caret.startContainer, caret.startOffset);
  return before.toString().length;
}

function placeCaret(editor: HTMLElement, offset: number): void {
  const point = pointAt(textNodesOf(editor), offset);
  const selection = editor.ownerDocument.getSelection();
  if (point === null || selection === null) return;
  selection.collapse(point.node, point.offset);
}

function replaceText(editor: HTMLElement, text: string, caret: number): void {
  editor.textContent = text;
  placeCaret(editor, caret);
}

function insertAtCaret(editor: HTMLElement, inserted: string): void {
  const doc = editor.ownerDocument;
  const isInserted =
    typeof doc.execCommand === 'function' && doc.execCommand('insertText', false, inserted);
  if (isInserted) return;
  const text = editor.textContent ?? '';
  const offset = caretOffset(editor) ?? text.length;
  replaceText(
    editor,
    text.slice(0, offset) + inserted + text.slice(offset),
    offset + inserted.length,
  );
}

function lineStart(text: string, offset: number): number {
  return text.lastIndexOf('\n', offset - 1) + 1;
}

function outdentLine(editor: HTMLElement): void {
  const text = editor.textContent ?? '';
  const offset = caretOffset(editor) ?? 0;
  const start = lineStart(text, offset);
  if (!text.startsWith(INDENT, start)) return;
  const next = text.slice(0, start) + text.slice(start + INDENT.length);
  replaceText(editor, next, Math.max(start, offset - INDENT.length));
}

function lineIndent(editor: HTMLElement): string {
  const text = editor.textContent ?? '';
  const offset = caretOffset(editor) ?? 0;
  return LEADING_SPACES.exec(text.slice(lineStart(text, offset)))?.[0] ?? '';
}

function isHistoryKey(event: KeyboardEvent<HTMLDivElement>): boolean {
  const key = event.key.toLowerCase();
  return (event.metaKey || event.ctrlKey) && (key === 'z' || key === 'y');
}

export function CodeField({ id, blockId, html }: CodeFieldProps): JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [unclosed, setUnclosed] = useState(() => findUnclosedTags(html));

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (editor === null) return;
    const isEditing = editor.ownerDocument.activeElement === editor;
    if (!isEditing && editor.textContent !== html) editor.textContent = html;
    highlight(editor);
  }, [html]);

  useEffect(() => clearHighlights, []);

  function commit(): void {
    const editor = editorRef.current;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (editor === null) return;
    const text = editor.textContent ?? '';
    const edit = dispatch(setBlockHtml(blockId, text));
    setUnclosed(findUnclosedTags(edit.html));
    setRemoved(edit.removed);
    if (edit.removed.length === 0) return;
    replaceText(editor, edit.html, edit.html.length);
    highlight(editor);
    dispatch(noticeShown('warning', `Removed unsafe code: ${edit.removed.join(', ')}.`));
  }

  function flush(): void {
    if (timerRef.current !== null) commit();
  }

  function scheduleCommit(): void {
    const editor = editorRef.current;
    if (editor !== null) highlight(editor);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(commit, CODE_COMMIT_DELAY_MS);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const editor = event.currentTarget;
    if (isHistoryKey(event)) {
      flush();
    } else if (event.key === 'Escape') {
      editor.blur();
    } else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      outdentLine(editor);
      scheduleCommit();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      insertAtCaret(editor, INDENT);
      scheduleCommit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      insertAtCaret(editor, `\n${lineIndent(editor)}`);
      scheduleCommit();
    }
  }

  function format(): void {
    const editor = editorRef.current;
    if (editor === null) return;
    flush();
    editor.textContent = formatHtml(editor.textContent ?? '');
    commit();
  }

  return (
    <div className="ve-code-field">
      <div
        ref={editorRef}
        id={id}
        className="ve-code"
        contentEditable="plaintext-only"
        role="textbox"
        aria-multiline="true"
        aria-label="HTML"
        aria-describedby={`${id}-help`}
        spellCheck={false}
        suppressContentEditableWarning
        onInput={scheduleCommit}
        onBlur={flush}
        onKeyDown={onKeyDown}
      />
      <p id={`${id}-help`} className="ui-muted ve-code-hint">
        Press Esc, then Tab, to leave the editor.
      </p>
      <div className="ve-code-actions">
        <button type="button" className="ui-button ui-button--secondary" onClick={format}>
          Format
        </button>
      </div>
      {unclosed.length > 0 && (
        <p className="ui-field-error" role="status">
          Unclosed {unclosed.map((name) => `<${name}>`).join(', ')}. The markup is saved, but the
          browser may close these tags in other places.
        </p>
      )}
      {removed.length > 0 && (
        <p className="ui-dialog-note" role="status">
          Removed for safety: {removed.join(', ')}.
        </p>
      )}
    </div>
  );
}
