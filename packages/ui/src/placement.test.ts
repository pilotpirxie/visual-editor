import { describe, expect, it } from 'vitest';
import { placeAtPoint, placeNear } from './placement';

const viewport = { width: 800, height: 600 };
const size = { width: 100, height: 30 };

describe('placeNear', () => {
  it('centers the box below its anchor', () => {
    expect(placeNear({ top: 100, left: 200, width: 40, height: 20 }, size, viewport)).toEqual({
      top: 126,
      left: 170,
    });
  });

  it('flips above when there is no room below', () => {
    expect(placeNear({ top: 570, left: 200, width: 40, height: 20 }, size, viewport).top).toBe(534);
  });

  it('stays inside the viewport at the edges', () => {
    expect(placeNear({ top: 100, left: 0, width: 20, height: 20 }, size, viewport).left).toBe(8);
    expect(placeNear({ top: 100, left: 790, width: 10, height: 20 }, size, viewport).left).toBe(
      692,
    );
  });
});

describe('placeAtPoint', () => {
  it('keeps a menu opened at a point inside the viewport', () => {
    expect(placeAtPoint({ top: 590, left: 780 }, size, viewport)).toEqual({ top: 562, left: 692 });
    expect(placeAtPoint({ top: 50, left: 50 }, size, viewport)).toEqual({ top: 50, left: 50 });
  });
});
