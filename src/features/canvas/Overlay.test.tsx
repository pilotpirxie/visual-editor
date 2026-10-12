import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../app/store';
import { click, getButton, queryButton, render, type Rendered } from '../../test/dom';
import { blockIdAt, homePage, loadIntoAppStore, shareNavAndFooter } from '../../test/fixtures';
import { PAGE_ROOT_ID } from './frameDom';
import { Overlay } from './Overlay';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
  latestSnapshotText: vi.fn(async () => null),
  putSnapshot: vi.fn(async () => {}),
}));

const BLOCK_HEIGHT = 100;
const PAGE_WIDTH = 800;

type OverlayOptions = Partial<Parameters<typeof Overlay>[0]>;

function pageDocument(): Document {
  const doc = document.implementation.createHTMLDocument('page');
  Object.defineProperty(doc, 'defaultView', { value: window });
  const root = doc.createElement('main');
  root.id = PAGE_ROOT_ID;
  const { project } = store.getState();
  const { header, footer } = project.sharedSlots;
  const blockIds = [...header, ...homePage(project).blockIds, ...footer];
  root.getBoundingClientRect = () => new DOMRect(0, 0, PAGE_WIDTH, BLOCK_HEIGHT * blockIds.length);
  for (const [index, blockId] of blockIds.entries()) {
    const block = doc.createElement('section');
    block.setAttribute('data-block-id', blockId);
    block.getBoundingClientRect = () =>
      new DOMRect(0, index * BLOCK_HEIGHT, PAGE_WIDTH, BLOCK_HEIGHT);
    root.append(block);
  }
  doc.body.append(root);
  return doc;
}

function renderOverlay(options: OverlayOptions = {}): Rendered {
  return render(
    <Overlay
      doc={pageDocument()}
      scale={1}
      height={600}
      hoveredId={null}
      selectedId={null}
      movingId={null}
      dropY={null}
      isEmpty={false}
      hiddenIds={[]}
      modalIds={[]}
      pageDevice="desktop"
      {...options}
    />,
  );
}

function styleOf(container: HTMLElement, selector: string): CSSStyleDeclaration {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`Nothing matches ${selector}`);
  return element.style;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('Overlay around the hovered block', () => {
  it('outlines the hovered block with its name', () => {
    const { container } = renderOverlay({ hoveredId: blockIdAt(1) });
    const outline = container.querySelector('.ve-outline--hover');
    expect(outline?.textContent).toBe('Hero, centered text');
    expect(styleOf(container, '.ve-outline--hover').top).toBe('100px');
    expect(styleOf(container, '.ve-outline--hover').height).toBe('100px');
  });

  it('says when the hovered block is shared on all pages', () => {
    const { navId } = shareNavAndFooter();
    const { container } = renderOverlay({ hoveredId: navId });
    expect(container.querySelector('.ve-outline--hover .ve-outline-badge')?.textContent).toBe(
      'Shared on all pages',
    );
  });

  it('shows no hover outline for the selected block, a missing block or no block', () => {
    const selected = renderOverlay({ hoveredId: blockIdAt(1), selectedId: blockIdAt(1) });
    expect(selected.container.querySelector('.ve-outline--hover')).toBeNull();
    const missing = renderOverlay({ hoveredId: 'missing' });
    expect(missing.container.querySelector('.ve-outline--hover')).toBeNull();
    expect(renderOverlay().container.querySelector('.ve-outline')).toBeNull();
  });
});

describe('Overlay around the selected block', () => {
  it('outlines the selected block and gives it a toolbar', () => {
    const { container } = renderOverlay({ selectedId: blockIdAt(1) });
    expect(styleOf(container, '.ve-outline--selected').top).toBe('100px');
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar?.getAttribute('aria-label')).toBe('Hero, centered text actions');
    expect(getButton(container, 'Move up').disabled).toBe(false);
    expect(getButton(container, 'Move down').disabled).toBe(false);
    expect(container.querySelector('.ve-outline-label--selected')).toBeNull();
  });

  it('cannot move the first block up or the last block down', () => {
    const first = renderOverlay({ selectedId: blockIdAt(0) });
    expect(getButton(first.container, 'Move up').disabled).toBe(true);
    expect(getButton(first.container, 'Move down').disabled).toBe(false);
    const lastIndex = homePage(store.getState().project).blockIds.length - 1;
    const last = renderOverlay({ selectedId: blockIdAt(lastIndex) });
    expect(getButton(last.container, 'Move up').disabled).toBe(false);
    expect(getButton(last.container, 'Move down').disabled).toBe(true);
  });

  it('moves, duplicates and deletes the selected block from the toolbar', () => {
    const heroId = blockIdAt(1);
    const { container } = renderOverlay({ selectedId: heroId });
    click(getButton(container, 'Move down'));
    expect(blockIdAt(2)).toBe(heroId);
    const countBefore = homePage(store.getState().project).blockIds.length;
    click(getButton(container, 'Duplicate'));
    expect(homePage(store.getState().project).blockIds).toHaveLength(countBefore + 1);
    click(getButton(container, 'Delete'));
    expect(store.getState().project.blocks.entities[heroId]).toBeUndefined();
  });

  it('marks a selected block that is shared on all pages', () => {
    const { navId } = shareNavAndFooter();
    const { container } = renderOverlay({ selectedId: navId });
    expect(container.querySelector('.ve-outline-label--selected')?.textContent).toBe(
      'Shared on all pages',
    );
  });

  it('shows nothing for a selected block that is not on the page', () => {
    const { container } = renderOverlay({ selectedId: 'missing' });
    expect(container.querySelector('.ve-outline--selected')).toBeNull();
    expect(container.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('scales the outline with the canvas', () => {
    const { container } = renderOverlay({ selectedId: blockIdAt(1), scale: 0.5 });
    const style = styleOf(container, '.ve-outline--selected');
    expect(style.top).toBe('50px');
    expect(style.width).toBe('400px');
    expect(style.height).toBe('50px');
  });
});

describe('Overlay notes and helpers', () => {
  it('shades blocks hidden on this device and labels modals', () => {
    const { container } = renderOverlay({
      hiddenIds: [blockIdAt(0)],
      modalIds: [blockIdAt(2)],
      pageDevice: 'phone',
    });
    expect(container.querySelector('.ve-outline--hidden')?.textContent).toBe('Hidden on phone');
    const notes = [...container.querySelectorAll('.ve-outline-note')].map(
      (note) => note.textContent,
    );
    expect(notes).toEqual(['Hidden on phone', 'Modal']);
  });

  it('offers a first block on an empty page and no other add button', () => {
    const { container } = renderOverlay({ isEmpty: true });
    expect(container.querySelector('.ve-empty-area')).not.toBeNull();
    expect(queryButton(container, 'Add a block')).not.toBeNull();
    expect(queryButton(container, 'Add block')).toBeNull();
    click(getButton(container, 'Add a block'));
    expect(store.getState().editor.libraryTab).toBe('blocks');
  });

  it('puts the add button under the selected block, or under the page with no selection', () => {
    const underPage = renderOverlay();
    expect(styleOf(underPage.container, '.ve-add-here').top).toBe('400px');
    const underBlock = renderOverlay({ selectedId: blockIdAt(1) });
    expect(styleOf(underBlock.container, '.ve-add-here').top).toBe('200px');
    expect(styleOf(underBlock.container, '.ve-add-here').left).toBe('400px');
  });

  it('hides the add button while dragging and under the shared footer', () => {
    expect(renderOverlay({ dropY: 120 }).container.querySelector('.ve-add-here')).toBeNull();
    const moving = renderOverlay({ movingId: blockIdAt(1) });
    expect(moving.container.querySelector('.ve-add-here')).toBeNull();
    expect(moving.container.querySelector('.ve-outline--moving')).not.toBeNull();
    const { footerId } = shareNavAndFooter();
    const footer = renderOverlay({ selectedId: footerId });
    expect(footer.container.querySelector('.ve-outline--selected')).not.toBeNull();
    expect(footer.container.querySelector('.ve-add-here')).toBeNull();
  });

  it('draws the drop line where the block will land, kept inside the canvas', () => {
    expect(styleOf(renderOverlay({ dropY: 120 }).container, '.ve-drop-line').top).toBe('120px');
    expect(styleOf(renderOverlay({ dropY: -40 }).container, '.ve-drop-line').top).toBe('2px');
    expect(styleOf(renderOverlay({ dropY: 900 }).container, '.ve-drop-line').top).toBe('598px');
    expect(renderOverlay().container.querySelector('.ve-drop-line')).toBeNull();
  });
});
