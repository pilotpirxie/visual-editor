import { describe, expect, it } from 'vitest';
import type { DragPayload } from './dragController';
import { isNoopListItemDrop } from './useListDropTarget';

function item(index: number): DragPayload {
  return { kind: 'list-item', ownerKey: 'pages', index, label: 'About' };
}

describe('isNoopListItemDrop', () => {
  it('lets an item move up and down', () => {
    expect(isNoopListItemDrop(item(2), 0)).toBe(false);
    expect(isNoopListItemDrop(item(0), 2)).toBe(false);
    expect(isNoopListItemDrop(item(1), 4)).toBe(false);
  });

  it('counts a drop just above or just below the item as staying in place', () => {
    expect(isNoopListItemDrop(item(1), 1)).toBe(true);
    expect(isNoopListItemDrop(item(1), 2)).toBe(true);
  });

  it('keeps the first item in place at the top of the list', () => {
    expect(isNoopListItemDrop(item(0), 0)).toBe(true);
    expect(isNoopListItemDrop(item(0), 1)).toBe(true);
  });

  it('never moves anything for a block or a new component', () => {
    expect(isNoopListItemDrop({ kind: 'move', blockId: 'hero', label: 'Hero' }, 0)).toBe(true);
    expect(isNoopListItemDrop({ kind: 'new', componentId: 'hero', label: 'Hero' }, 3)).toBe(true);
  });
});
