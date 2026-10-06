import { describe, expect, it } from 'vitest';
import { dropIndexFromSpans, finalMoveIndex, indicatorY } from './dropIndex';

const spans = [
  { top: 0, bottom: 100 },
  { top: 100, bottom: 300 },
  { top: 300, bottom: 340 },
];

describe('dropIndexFromSpans', () => {
  it.each([
    [-50, 0],
    [49, 0],
    [51, 1],
    [199, 1],
    [201, 2],
    [321, 3],
    [1000, 3],
  ])('pointer at y=%d drops at index %d', (y, index) => {
    expect(dropIndexFromSpans(spans, y)).toBe(index);
  });

  it('drops at 0 on an empty page', () => {
    expect(dropIndexFromSpans([], 120)).toBe(0);
  });
});

describe('indicatorY', () => {
  it('sits on the outer edges and between neighbours', () => {
    expect(indicatorY(spans, 0)).toBe(0);
    expect(indicatorY(spans, 1)).toBe(100);
    expect(indicatorY(spans, 3)).toBe(340);
    expect(
      indicatorY(
        [
          { top: 0, bottom: 90 },
          { top: 110, bottom: 200 },
        ],
        1,
      ),
    ).toBe(100);
    expect(indicatorY([], 0)).toBe(0);
  });
});

describe('finalMoveIndex', () => {
  it('accounts for the dragged item leaving its old position', () => {
    expect(finalMoveIndex(1, 0)).toBe(0);
    expect(finalMoveIndex(1, 3)).toBe(2);
    expect(finalMoveIndex(0, 4)).toBe(3);
  });

  it('maps both gaps around the item to its current index', () => {
    expect(finalMoveIndex(2, 2)).toBe(2);
    expect(finalMoveIndex(2, 3)).toBe(2);
  });
});
