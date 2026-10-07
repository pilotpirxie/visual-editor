import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type JSX,
} from 'react';
import { isSafeUrl, normalizeRichText, plainTextToHtml } from '../../render/sanitize';
import type { EditKind } from '../../app/projectSlice';
import type { ControlProps } from './FieldControl';
import { Icon } from '../../../packages/ui/src';

const DEFAULT_LINK_URL = 'https://';

type FormatButton = { command: string; argument?: string; label: string; icon: string };

const FORMAT_BUTTONS: FormatButton[] = [
  { command: 'bold', label: 'Bold', icon: 'bold' },
  { command: 'italic', label: 'Italic', icon: 'italic' },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: 'list' },
  { command: 'insertOrderedList', label: 'Numbered list', icon: 'list-ordered' },
];

const HEADING_BUTTONS: FormatButton[] = [
  { command: 'formatBlock', argument: 'h2', label: 'Heading', icon: 'heading-2' },
  { command: 'formatBlock', argument: 'h3', label: 'Subheading', icon: 'heading-3' },
  { command: 'formatBlock', argument: 'p', label: 'Paragraph', icon: 'pilcrow' },
];

function selectionRangeIn(editor: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (selection === null || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

function restoreSelection(editor: HTMLElement, range: Range | null): void {
  editor.focus();
  if (range === null) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function linkAround(range: Range | null): HTMLAnchorElement | null {
  if (range === null) return null;
  const container = range.commonAncestorContainer;
  const element = container instanceof Element ? container : container.parentElement;
  return element?.closest('a') ?? null;
}

export function RichTextField({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const isCommandRunningRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const html = typeof value === 'string' ? value : '';
  const labelId = `${id}-label`;
  const allowHeadings = field.allowHeadings === true;
  const buttons = allowHeadings ? [...HEADING_BUTTONS, ...FORMAT_BUTTONS] : FORMAT_BUTTONS;

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (editor === null || html === lastEmittedRef.current) return;
    editor.innerHTML = normalizeRichText(html, { allowHeadings });
    lastEmittedRef.current = html;
  }, [html, allowHeadings]);

  function emit(kind: EditKind): void {
    const editor = editorRef.current;
    if (editor === null) return;
    const next = normalizeRichText(editor.innerHTML, { allowHeadings });
    if (next === lastEmittedRef.current) return;
    lastEmittedRef.current = next;
    onChange(next, kind);
  }

  function runCommand(command: string, argument?: string): void {
    isCommandRunningRef.current = true;
    try {
      document.execCommand(command, false, argument);
    } finally {
      isCommandRunningRef.current = false;
    }
    emit('discrete');
  }

  function handleInput(): void {
    if (isCommandRunningRef.current) return;
    emit('continuous');
  }

  function format({ command, argument }: FormatButton): void {
    const editor = editorRef.current;
    if (editor === null) return;
    editor.focus();
    runCommand(command, argument);
  }

  function paste(event: ClipboardEvent<HTMLDivElement>): void {
    event.preventDefault();
    const pastedHtml = event.clipboardData.getData('text/html');
    const pasted =
      pastedHtml === '' ? plainTextToHtml(event.clipboardData.getData('text/plain')) : pastedHtml;
    runCommand('insertHTML', normalizeRichText(pasted, { allowHeadings }));
  }

  function openLinkRow(): void {
    const editor = editorRef.current;
    if (editor === null) return;
    const range = selectionRangeIn(editor);
    savedRangeRef.current = range;
    const existingLink = linkAround(range);
    const existingHref = existingLink === null ? null : existingLink.getAttribute('href');
    setLinkUrl(existingHref ?? DEFAULT_LINK_URL);
  }

  function applyLink(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const editor = editorRef.current;
    const url = linkUrl === null ? '' : linkUrl.trim();
    if (editor === null || url === '' || !isSafeUrl(url)) return;
    restoreSelection(editor, savedRangeRef.current);
    setLinkUrl(null);
    runCommand('createLink', url);
  }

  function removeLink(): void {
    const editor = editorRef.current;
    if (editor === null) return;
    restoreSelection(editor, savedRangeRef.current);
    setLinkUrl(null);
    runCommand('unlink');
  }

  function cancelLink(): void {
    setLinkUrl(null);
    const editor = editorRef.current;
    if (editor === null) return;
    restoreSelection(editor, savedRangeRef.current);
  }

  const isLinkSafe = linkUrl === null || isSafeUrl(linkUrl);

  return (
    <>
      <span className="ui-field-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-richtext" data-invalid={isInvalid || undefined}>
        <div
          className="ve-richtext-toolbar"
          role="toolbar"
          aria-label={`${field.label} formatting`}
        >
          {buttons.map((button) => (
            <button
              key={button.label}
              type="button"
              className="ui-icon-button"
              aria-label={button.label}
              title={button.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => format(button)}
            >
              <Icon name={button.icon} />
            </button>
          ))}
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Link"
            title="Link"
            aria-expanded={linkUrl !== null}
            onMouseDown={(event) => event.preventDefault()}
            onClick={openLinkRow}
          >
            <Icon name="link" />
          </button>
        </div>
        {linkUrl !== null && (
          <form className="ve-richtext-link" onSubmit={applyLink}>
            <input
              className="ui-input"
              type="text"
              inputMode="url"
              aria-label="Link address"
              value={linkUrl}
              autoFocus
              aria-invalid={!isLinkSafe}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                cancelLink();
              }}
            />
            <button type="submit" className="ui-button ui-button--secondary" disabled={!isLinkSafe}>
              Apply
            </button>
            <button type="button" className="ui-button ui-button--secondary" onClick={removeLink}>
              Remove
            </button>
          </form>
        )}
        <div
          id={id}
          ref={editorRef}
          className="ve-richtext-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-required={field.required}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onInput={handleInput}
          onPaste={paste}
        />
      </div>
    </>
  );
}
