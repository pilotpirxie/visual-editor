import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../app/store';
import { click, getButton, pressKey, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { convertToHtml } from '../editor/htmlBlockActions';
import { CODE_COMMIT_DELAY_MS, CodeField } from './CodeField';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

let blockId = '';

function storedHtml(): string {
  const block = store.getState().project.blocks.entities[blockId];
  return block?.kind === 'html' ? block.html : '';
}

function editor(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[role="textbox"]');
  if (element === null) throw new Error('Expected the code editor');
  return element;
}

function type(container: HTMLElement, text: string): void {
  const field = editor(container);
  runInAct(() => {
    field.textContent = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  loadIntoAppStore();
  blockId = homePage(store.getState().project).blockIds[1] ?? '';
  store.dispatch(convertToHtml(blockId));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CodeField', () => {
  it('shows the block markup and saves edits after a short pause', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    expect(editor(container).textContent).toBe(storedHtml());
    type(container, '<p>New</p>');
    expect(storedHtml()).not.toBe('<p>New</p>');
    runInAct(() => {
      vi.advanceTimersByTime(CODE_COMMIT_DELAY_MS);
    });
    expect(storedHtml()).toBe('<p>New</p>');
  });

  it('saves right away when the editor loses focus', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    type(container, '<p>Blur</p>');
    runInAct(() => {
      editor(container).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(storedHtml()).toBe('<p>Blur</p>');
  });

  it('removes unsafe code and says what it removed', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    type(container, '<p onclick="steal()">Hi</p>');
    runInAct(() => {
      vi.advanceTimersByTime(CODE_COMMIT_DELAY_MS);
    });
    expect(storedHtml()).toBe('<p>Hi</p>');
    expect(container.textContent).toContain('Removed for safety: onclick attribute.');
  });

  it('warns about unclosed tags but keeps the markup', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    type(container, '<div><p>Open');
    runInAct(() => {
      vi.advanceTimersByTime(CODE_COMMIT_DELAY_MS);
    });
    expect(storedHtml()).toBe('<div><p>Open');
    expect(container.textContent).toContain('Unclosed <div>, <p>');
  });

  it('formats the markup with the Format button', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    type(container, '<section><div><p>A</p></div></section>');
    click(getButton(container, 'Format'));
    expect(storedHtml()).toBe('<section>\n  <div>\n    <p>A</p>\n  </div>\n</section>');
  });

  it('saves a pending edit before undo runs', () => {
    const { container } = render(<CodeField id="code" blockId={blockId} html={storedHtml()} />);
    type(container, '<p>Before undo</p>');
    pressKey(editor(container), 'z', { metaKey: true });
    expect(storedHtml()).toBe('<p>Before undo</p>');
  });
});
