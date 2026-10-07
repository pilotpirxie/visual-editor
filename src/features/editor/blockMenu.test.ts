import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, clipboardTextStored } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { blockMenuItems, clipboardItems, type BlockMenuContext } from './blockMenu';
import type { MenuAction, MenuItem } from './Menu';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function action(items: MenuItem[], id: string): MenuAction {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined || 'isSeparator' in item) throw new Error(`No menu action "${id}"`);
  return item;
}

function context(overrides: Partial<BlockMenuContext> = {}): BlockMenuContext {
  return {
    blockId: 'b',
    index: 1,
    count: 3,
    isDisabled: false,
    hasClipboard: true,
    canConvert: true,
    ...overrides,
  };
}

function pageBlockIds(): string[] {
  return homePage(store.getState().project).blockIds;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('blockMenuItems', () => {
  it('lists every block action in the PRD order', () => {
    const labels: string[] = [];
    for (const item of blockMenuItems(context())) {
      if (!('isSeparator' in item)) labels.push(item.label);
    }
    expect(labels).toEqual([
      'Duplicate',
      'Cut',
      'Copy',
      'Paste after',
      'Move up',
      'Move down',
      'Disable',
      'Convert to HTML…',
      'Delete',
    ]);
  });

  it('disables moving past the ends of the list and pasting without a copied block', () => {
    const first = blockMenuItems(context({ index: 0, hasClipboard: false }));
    expect(action(first, 'move-up').disabled).toBe(true);
    expect(action(first, 'paste').disabled).toBe(true);
    expect(action(first, 'paste').hint).toContain('⌘V');
    const last = blockMenuItems(context({ index: 2 }));
    expect(action(last, 'move-down').disabled).toBe(true);
    expect(action(last, 'paste').disabled).toBe(false);
  });

  it('offers to enable a disabled block', () => {
    expect(action(blockMenuItems(context({ isDisabled: true })), 'disable').label).toBe('Enable');
  });

  it('runs the actions on the real block', () => {
    const [, heroId] = pageBlockIds();
    const items = blockMenuItems(context({ blockId: heroId }));
    action(items, 'duplicate').onSelect();
    expect(pageBlockIds()).toHaveLength(5);
    action(items, 'disable').onSelect();
    expect(store.getState().project.blocks.entities[heroId]?.disabled).toBe(true);
    action(items, 'delete').onSelect();
    expect(pageBlockIds()).not.toContain(heroId);
  });
});

describe('clipboardItems', () => {
  it('copies for the menu and pastes after the selection', async () => {
    const [, heroId] = pageBlockIds();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) },
    });
    action(clipboardItems(heroId, false), 'copy').onSelect();
    expect(store.getState().editor.clipboardText).toContain('visual-editor/block');
    dispatch(blockSelected(heroId));
    action(clipboardItems(heroId, true), 'paste').onSelect();
    await vi.waitFor(() => expect(pageBlockIds()).toHaveLength(5));
  });

  it('cuts the block from the menu', () => {
    const [, heroId] = pageBlockIds();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) },
    });
    action(clipboardItems(heroId, false), 'cut').onSelect();
    expect(pageBlockIds()).not.toContain(heroId);
    expect(store.getState().editor.clipboardText).not.toBeNull();
  });

  it('keeps a menu copy for this tab when the system clipboard is not available', async () => {
    const [, heroId] = pageBlockIds();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatch(clipboardTextStored('old'));
    action(clipboardItems(heroId, true), 'copy').onSelect();
    expect(store.getState().editor.clipboardText).toContain('visual-editor/block');
    await vi.waitFor(() => expect(store.getState().editor.notices.at(-1)?.tone).toBe('info'));
  });
});
