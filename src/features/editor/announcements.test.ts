import { describe, expect, it } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { blockSelected, pageOpened } from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import {
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockPasted,
  blockRemoved,
  pageAdded,
} from '../../app/projectSlice';
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

  it('reports a duplicated, an inserted and a pasted block by name', () => {
    const store = createTestStore();
    const home = homePage(store.getState().project);
    const heroId = home.blockIds[1] ?? '';
    expect(announce(store, blockDuplicated(heroId))).toBe('Duplicated Hero, centered text');
    expect(announce(store, blockInserted(home.id, 0, 'cta-centered'))).toMatch(/^Added .+/);
    const copied = store.getState().project.blocks.entities[heroId];
    const pasted = blockPasted({
      target: { kind: 'page', pageId: home.id },
      index: 0,
      block: { ...copied, id: 'pasted' },
    });
    expect(announce(store, pasted)).toBe('Added Hero, centered text');
  });

  it('reports redo only when it brings a change back', () => {
    const store = createTestStore();
    const heroId = homePage(store.getState().project).blockIds[1] ?? '';
    expect(announce(store, redo())).toBeNull();
    store.dispatch(blockRemoved({ blockId: heroId }));
    store.dispatch(undo());
    expect(announce(store, redo())).toBe('Redone');
  });

  it('stays quiet about blocks and pages that do not exist', () => {
    const store = createTestStore();
    const homeId = homePage(store.getState().project).id;
    expect(announce(store, blockSelected('missing'))).toBeNull();
    expect(announce(store, blockMoved({ blockId: 'missing', toIndex: 0 }))).toBeNull();
    expect(announce(store, blockRemoved({ blockId: 'missing' }))).toBeNull();
    expect(announce(store, blockDuplicated('missing'))).toBeNull();
    expect(announce(store, pageOpened({ pageId: 'missing', fromPageId: homeId }))).toBeNull();
  });

  it('stays quiet about a move that leaves the block where it was', () => {
    const store = createTestStore();
    const heroId = homePage(store.getState().project).blockIds[1] ?? '';
    expect(announce(store, blockMoved({ blockId: heroId, toIndex: 1 }))).toBeNull();
  });

  it('stays quiet about every other action', () => {
    const store = createTestStore();
    expect(announce(store, pageAdded({ id: 'about', name: 'About', slug: 'about' }))).toBeNull();
    expect(announce(store, { type: 'unknown/action' })).toBeNull();
  });
});
