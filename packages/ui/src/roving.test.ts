import { describe, expect, it } from 'vitest';
import { rovingIndex } from './roving';

describe('rovingIndex', () => {
  it('moves along the orientation and wraps at both ends', () => {
    expect(rovingIndex('ArrowDown', 2, 3, 'vertical')).toBe(0);
    expect(rovingIndex('ArrowUp', 0, 3, 'vertical')).toBe(2);
    expect(rovingIndex('ArrowRight', 0, 3, 'horizontal')).toBe(1);
    expect(rovingIndex('ArrowLeft', 1, 3, 'horizontal')).toBe(0);
  });

  it('jumps to the first and last item', () => {
    expect(rovingIndex('Home', 2, 3, 'vertical')).toBe(0);
    expect(rovingIndex('End', 0, 3, 'horizontal')).toBe(2);
  });

  it('starts at the matching end when nothing has focus yet', () => {
    expect(rovingIndex('ArrowDown', -1, 3, 'vertical')).toBe(0);
    expect(rovingIndex('ArrowUp', -1, 3, 'vertical')).toBe(2);
  });

  it('ignores keys of the other orientation and empty lists', () => {
    expect(rovingIndex('ArrowDown', 0, 3, 'horizontal')).toBeNull();
    expect(rovingIndex('ArrowDown', 0, 0, 'vertical')).toBeNull();
    expect(rovingIndex('a', 0, 3, 'vertical')).toBeNull();
  });
});
