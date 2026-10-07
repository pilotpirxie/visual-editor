import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, previewToggled } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { useClipboard } from './useClipboard';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

type FakeClipboardEvent = Event & { clipboardData: { data: Record<string, string> } };

function clipboardEvent(type: string, data: Record<string, string> = {}): FakeClipboardEvent {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const clipboardData = {
    data,
    getData: (format: string) => data[format] ?? '',
    setData: (format: string, value: string) => {
      data[format] = value;
    },
  };
  return Object.assign(event, { clipboardData });
}

function Harness({ canvasDoc }: { canvasDoc: Document | null }): null {
  useClipboard(canvasDoc);
  return null;
}

function fire(target: EventTarget, event: Event): void {
  runInAct(() => {
    target.dispatchEvent(event);
  });
}

function pageBlockIds(): string[] {
  return homePage(store.getState().project).blockIds;
}

beforeEach(() => {
  loadIntoAppStore();
  dispatch(previewToggled(false));
});

describe('useClipboard', () => {
  it('copies the selected block from the editor and pastes it back', async () => {
    render(<Harness canvasDoc={null} />);
    const heroId = pageBlockIds()[1];
    dispatch(blockSelected(heroId));
    const copy = clipboardEvent('copy');
    fire(document.body, copy);
    expect(copy.defaultPrevented).toBe(true);
    expect(copy.clipboardData.data['text/plain']).toContain('visual-editor/block');
    expect(copy.clipboardData.data['text/html']).toContain('b-hero-centered');

    const paste = clipboardEvent('paste', copy.clipboardData.data);
    fire(document.body, paste);
    expect(paste.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(pageBlockIds()).toHaveLength(5));
  });

  it('listens on the canvas document too', () => {
    const canvasDoc = document.implementation.createHTMLDocument('canvas');
    render(<Harness canvasDoc={canvasDoc} />);
    dispatch(blockSelected(pageBlockIds()[1]));
    const cut = clipboardEvent('cut');
    fire(canvasDoc.body, cut);
    expect(cut.defaultPrevented).toBe(true);
    expect(pageBlockIds()).toHaveLength(3);
  });

  it('enables copying in Safari by cancelling the before-copy event', () => {
    render(<Harness canvasDoc={null} />);
    dispatch(blockSelected(pageBlockIds()[1]));
    const beforeCopy = clipboardEvent('beforecopy');
    fire(document.body, beforeCopy);
    expect(beforeCopy.defaultPrevented).toBe(true);
  });

  it('leaves copying to the browser while the user types or has no block selected', () => {
    const { container } = render(
      <>
        <Harness canvasDoc={null} />
        <input />
      </>,
    );
    const input = container.querySelector('input');
    if (input === null) throw new Error('Expected an input');
    dispatch(blockSelected(pageBlockIds()[1]));
    const fromInput = clipboardEvent('copy');
    fire(input, fromInput);
    expect(fromInput.defaultPrevented).toBe(false);
    dispatch(blockSelected(null));
    const withoutSelection = clipboardEvent('copy');
    fire(document.body, withoutSelection);
    expect(withoutSelection.defaultPrevented).toBe(false);
  });

  it('ignores clipboard text that is not a block and everything during Preview', () => {
    render(<Harness canvasDoc={null} />);
    const text = clipboardEvent('paste', { 'text/plain': 'Just words' });
    fire(document.body, text);
    expect(text.defaultPrevented).toBe(false);
    dispatch(blockSelected(pageBlockIds()[1]));
    dispatch(previewToggled(true));
    const copy = clipboardEvent('copy');
    fire(document.body, copy);
    expect(copy.defaultPrevented).toBe(false);
  });
});
