import { describe, expect, it } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { blockSelected, pageOpened } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { blockMoved, blockRemoved, pageAdded } from '../../app/projectSlice';
import { createTestStore, homePage, type TestStore } from '../../test/fixtures';
import { announcementFor } from './announcements';

function announce(store: TestStore, action: UnknownAction): string | null {
  const before = store.getState();
  store.dispatch(action);
  return announcementFor(action, before, store.getState());
}

describe('announcementFor', () => {
  it('names the selected block and its position', () => {
    const store = createTestStore();
    const [, heroId] = homePage(store.getState().project).blockIds;
    expect(announce(store, blockSelected(heroId ?? ''))).toBe(
      'Hero, centered text selected, 2 of 4',
    );
    expect(announce(store, blockSelected(heroId ?? ''))).toBeNull();
  });

  it('reports moves, deletions with the undo key, and undo', () => {
    const store = createTestStore();
    const [, heroId] = homePage(store.getState().project).blockIds;
    const blockId = heroId ?? '';
    expect(announce(store, blockMoved({ blockId, toIndex: 2 }))).toBe(
      'Moved Hero, centered text to position 3 of 4',
    );
    expect(announce(store, blockRemoved({ blockId }))).toMatch(
      /^Deleted Hero, centered text\. Undo with (⌘Z|Ctrl\+Z)\.$/,
    );
    expect(announce(store, undo())).toBe('Undone');
  });

  it('names the page that was opened', () => {
    const store = createTestStore();
    const homeId = homePage(store.getState().project).id;
    store.dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' }));
    expect(announce(store, pageOpened({ pageId: 'about', fromPageId: homeId }))).toBe(
      'Page About opened',
    );
    expect(announce(store, pageOpened({ pageId: 'about', fromPageId: 'about' }))).toBeNull();
  });

  it('stays quiet for actions that change nothing worth saying', () => {
    const store = createTestStore();
    expect(announce(store, blockSelected(null))).toBeNull();
    expect(announce(store, undo())).toBeNull();
  });
});
