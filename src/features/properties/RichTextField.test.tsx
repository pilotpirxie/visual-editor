import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field } from '../../components/types';
import { changeValue, click, getButton, pressKey, render, runInAct } from '../../test/dom';
import { RichTextField } from './RichTextField';

const richText: Field = { name: 'intro', label: 'Intro', type: 'richtext', default: '' };

type CommandCall = { command: string; argument: string | undefined };

const SETTING_COMMANDS = new Set(['defaultParagraphSeparator']);

function renderEditor(
  value: string,
  field: Field = richText,
): {
  container: HTMLDivElement;
  editor: HTMLElement;
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  const { container } = render(
    <RichTextField
      field={field}
      value={value}
      id="ve-field-intro"
      path="intro"
      describedBy={undefined}
      isInvalid={false}
      onChange={onChange}
    />,
  );
  const editor = container.querySelector<HTMLElement>('[role="textbox"]');
  if (editor === null) throw new Error('The rich text editor is not rendered');
  return { container, editor, onChange };
}

function stubExecCommand(apply: (call: CommandCall) => void): CommandCall[] {
  const calls: CommandCall[] = [];
  function execCommand(command: string, _showUi?: boolean, argument?: string): boolean {
    if (SETTING_COMMANDS.has(command)) return true;
    const call = { command, argument };
    calls.push(call);
    apply(call);
    const editor = document.querySelector('[role="textbox"]');
    editor?.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
  return calls;
}

function typeInto(editor: HTMLElement, html: string): void {
  editor.innerHTML = html;
  runInAct(() => {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function pasteInto(editor: HTMLElement, data: Record<string, string>): void {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => data[type] ?? '' },
  });
  runInAct(() => {
    editor.dispatchEvent(event);
  });
}

beforeEach(() => {
  stubExecCommand(() => {});
});

describe('RichTextField', () => {
  it('shows the stored value cleaned up', () => {
    const { editor } = renderEditor('<p>Hello <b>world</b><script>alert(1)</script></p>');
    expect(editor.innerHTML).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('reports typing as a continuous change with normalized HTML', () => {
    const { editor, onChange } = renderEditor('<p>Hello</p>');
    typeInto(editor, '<p>Hello there</p>');
    expect(onChange).toHaveBeenCalledWith('<p>Hello there</p>', 'continuous');
  });

  it('does not report input that leaves the content unchanged', () => {
    const { editor, onChange } = renderEditor('<p>Hello</p>');
    typeInto(editor, '<p>Hello</p>');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a formatting command exactly once, as a discrete change', () => {
    const { container, editor, onChange } = renderEditor('<p>Hello</p>');
    stubExecCommand(() => {
      editor.innerHTML = '<p><strong>Hello</strong></p>';
    });
    click(getButton(container, 'Bold'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p><strong>Hello</strong></p>', 'discrete');
  });

  it('offers heading buttons and keeps headings only for fields that allow them', () => {
    const calls = stubExecCommand(() => {});
    const plain = renderEditor('<h2>Title</h2>');
    expect(plain.editor.innerHTML).toBe('<p>Title</p>');
    expect(plain.container.querySelector('[aria-label="Heading"]')).toBeNull();

    const article = renderEditor('<h2>Title</h2>', { ...richText, allowHeadings: true });
    expect(article.editor.innerHTML).toBe('<h2>Title</h2>');
    click(getButton(article.container, 'Subheading'));
    expect(calls).toEqual([{ command: 'formatBlock', argument: 'h3' }]);
  });

  it('pastes plain text as paragraphs through one insert command', () => {
    const { editor } = renderEditor('');
    const calls = stubExecCommand(() => {});
    pasteInto(editor, { 'text/plain': 'First line\n\nSecond line' });
    expect(calls).toEqual([
      { command: 'insertHTML', argument: '<p>First line</p><p>Second line</p>' },
    ]);
  });

  it('cleans pasted HTML before inserting it', () => {
    const { editor } = renderEditor('');
    const calls = stubExecCommand(() => {});
    pasteInto(editor, { 'text/html': '<h1 style="color:red">Title</h1><img src="x" onerror="1">' });
    expect(calls[0].argument).toBe('<p>Title</p>');
  });

  it('refuses unsafe link addresses', () => {
    const { container } = renderEditor('<p>Hello</p>');
    click(getButton(container, 'Link'));
    changeValue(container.querySelector('input[aria-label="Link address"]'), 'javascript:alert(1)');
    expect(getButton(container, 'Apply').disabled).toBe(true);
  });

  it('returns focus to the text when the link row is closed with Escape', () => {
    const { container, editor } = renderEditor('<p>Hello</p>');
    click(getButton(container, 'Link'));
    const address = container.querySelector('input[aria-label="Link address"]');
    pressKey(address ?? document.body, 'Escape');
    expect(container.querySelector('.ve-richtext-link')).toBeNull();
    expect(document.activeElement).toBe(editor);
  });
});

describe('RichTextField links', () => {
  function addressOf(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Link address"]');
    if (input === null) throw new Error('The link row is not open');
    return input;
  }

  function selectInside(node: Node): void {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  it('opens the link row from the toolbar with a web address started', () => {
    const { container } = renderEditor('<p>Hello</p>');
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar?.getAttribute('aria-label')).toBe('Intro formatting');
    expect(getButton(container, 'Link').getAttribute('aria-expanded')).toBe('false');
    click(getButton(container, 'Link'));
    expect(getButton(container, 'Link').getAttribute('aria-expanded')).toBe('true');
    expect(addressOf(container).value).toBe('https://');
  });

  it('starts from the address of the link the cursor is in', () => {
    const { container, editor } = renderEditor('<p>See <a href="https://acme.test">Acme</a></p>');
    const link = editor.querySelector('a');
    if (link === null) throw new Error('The editor has no link');
    selectInside(link);
    click(getButton(container, 'Link'));
    expect(addressOf(container).value).toBe('https://acme.test');
  });

  it('links the selected text to the trimmed address and closes the row', () => {
    const { container, editor } = renderEditor('<p>Hello</p>');
    const calls = stubExecCommand(() => {});
    click(getButton(container, 'Link'));
    changeValue(addressOf(container), '  https://acme.test/docs ');
    click(getButton(container, 'Apply'));
    expect(calls).toEqual([{ command: 'createLink', argument: 'https://acme.test/docs' }]);
    expect(container.querySelector('.ve-richtext-link')).toBeNull();
    expect(document.activeElement).toBe(editor);
  });

  it('keeps the row open and links nothing for an empty address', () => {
    const { container } = renderEditor('<p>Hello</p>');
    const calls = stubExecCommand(() => {});
    click(getButton(container, 'Link'));
    changeValue(addressOf(container), '   ');
    click(getButton(container, 'Apply'));
    expect(calls).toEqual([]);
    expect(container.querySelector('.ve-richtext-link')).not.toBeNull();
  });

  it('marks an unsafe address and links nothing with it', () => {
    const { container } = renderEditor('<p>Hello</p>');
    const calls = stubExecCommand(() => {});
    click(getButton(container, 'Link'));
    changeValue(addressOf(container), 'javascript:alert(1)');
    expect(addressOf(container).getAttribute('aria-invalid')).toBe('true');
    const form = container.querySelector('.ve-richtext-link');
    runInAct(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(calls).toEqual([]);
  });

  it('removes a link and reports it as one discrete change', () => {
    const { container, editor, onChange } = renderEditor(
      '<p>See <a href="https://acme.test">Acme</a></p>',
    );
    const calls = stubExecCommand(() => {
      editor.innerHTML = '<p>See Acme</p>';
    });
    click(getButton(container, 'Link'));
    click(getButton(container, 'Remove'));
    expect(calls).toEqual([{ command: 'unlink', argument: undefined }]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p>See Acme</p>', 'discrete');
    expect(container.querySelector('.ve-richtext-link')).toBeNull();
  });
});
