import { describe, expect, it } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { createTestStore, homePage, type TestStore } from '../../test/fixtures';
import type { DragPayload } from '../canvas/dragController';
import {
  dropBlock,
  duplicateBlock,
  insertComponent,
  isNoopDrop,
  moveBlockBy,
  removeBlock,
} from './blockActions';

function blockIds(store: TestStore): string[] {
  return homePage(store.getState().project).blockIds;
}

function componentAt(store: TestStore, index: number): string {
  return store.getState().project.blocks.entities[blockIds(store)[index]].componentId;
}

function movePayload(blockId: string): DragPayload {
  return { kind: 'move', blockId, label: 'Block' };
}

describe('insertComponent', () => {
  it('inserts right after the selected block', () => {
    const store = createTestStore();
    store.dispatch(blockSelected(blockIds(store)[1]));
    store.dispatch(insertComponent('cta-centered'));
    expect(componentAt(store, 2)).toBe('cta-centered');
  });

  it('inserts at the end of the page when nothing is selected', () => {
    const store = createTestStore();
    store.dispatch(insertComponent('cta-centered'));
    expect(componentAt(store, 4)).toBe('cta-centered');
  });

  it('inserts at the end when the selection is not on the page', () => {
    const store = createTestStore();
    store.dispatch(blockSelected('gone'));
    store.dispatch(insertComponent('cta-centered'));
    expect(componentAt(store, 4)).toBe('cta-centered');
  });
});

describe('moveBlockBy', () => {
  it('moves a block one step up or down', () => {
    const store = createTestStore();
    const hero = blockIds(store)[1];
    store.dispatch(moveBlockBy(hero, -1));
    expect(blockIds(store)[0]).toBe(hero);
    store.dispatch(moveBlockBy(hero, 1));
    expect(blockIds(store)[1]).toBe(hero);
  });

  it('does nothing past either end of the page or for an unknown block', () => {
    const store = createTestStore();
    const [first] = blockIds(store);
    const last = blockIds(store)[3];
    store.dispatch(moveBlockBy(first, -1));
    store.dispatch(moveBlockBy(last, 1));
    store.dispatch(moveBlockBy('missing', 1));
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('duplicateBlock', () => {
  it('adds a copy after the block on the open page', () => {
    const store = createTestStore();
    const hero = blockIds(store)[1];
    store.dispatch(duplicateBlock(hero));
    expect(blockIds(store)).toHaveLength(5);
    expect(componentAt(store, 2)).toBe('hero-centered');
  });
});

describe('removeBlock', () => {
  it('removes the block from the open page', () => {
    const store = createTestStore();
    const hero = blockIds(store)[1];
    store.dispatch(removeBlock(hero));
    expect(blockIds(store)).not.toContain(hero);
  });
});

describe('isNoopDrop', () => {
  const ids = ['a', 'b', 'c'];

  it('treats dropping a block next to itself as no change', () => {
    expect(isNoopDrop(ids, movePayload('b'), 1)).toBe(true);
    expect(isNoopDrop(ids, movePayload('b'), 2)).toBe(true);
  });

  it('treats any other gap as a real move', () => {
    expect(isNoopDrop(ids, movePayload('b'), 0)).toBe(false);
    expect(isNoopDrop(ids, movePayload('b'), 3)).toBe(false);
  });

  it('always accepts new blocks and never accepts list items or unknown blocks', () => {
    expect(isNoopDrop(ids, { kind: 'new', componentId: 'x', label: 'X' }, 1)).toBe(false);
    expect(isNoopDrop(ids, { kind: 'list-item', ownerKey: 'k', index: 0, label: 'I' }, 1)).toBe(
      true,
    );
    expect(isNoopDrop(ids, movePayload('missing'), 0)).toBe(true);
  });
});

describe('dropBlock', () => {
  it('inserts a new block at the drop index', () => {
    const store = createTestStore();
    store.dispatch(dropBlock({ kind: 'new', componentId: 'cta-centered', label: 'CTA' }, 1));
    expect(componentAt(store, 1)).toBe('cta-centered');
  });

  it('moves a dragged block to the gap it was dropped in', () => {
    const store = createTestStore();
    const nav = blockIds(store)[0];
    store.dispatch(dropBlock(movePayload(nav), 3));
    expect(blockIds(store)[2]).toBe(nav);
  });

  it('changes nothing for a drop next to the block itself or for list items', () => {
    const store = createTestStore();
    const hero = blockIds(store)[1];
    store.dispatch(dropBlock(movePayload(hero), 2));
    store.dispatch(dropBlock({ kind: 'list-item', ownerKey: 'items', index: 0, label: 'I' }, 0));
    expect(store.getState().history.past).toHaveLength(0);
  });
});
