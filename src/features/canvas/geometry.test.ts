import { describe, expect, it } from 'vitest';
import {
  AUTO_SCROLL_EDGE_PX,
  AUTO_SCROLL_MAX_SPEED_PX,
  BLOCK_TOOLBAR_GAP_PX,
  BLOCK_TOOLBAR_HEIGHT_PX,
  autoScrollDelta,
  blockToolbarTop,
  canvasViewport,
  clamp,
  deviceForWidth,
  dropEdgeAt,
  dropIndexFromSpans,
  finalMoveIndex,
  fitDevice,
  indicatorY,
  isFullyInView,
  isOutOfView,
  isPointInBox,
  listDropIndex,
} from './geometry';

const spans = [
  { top: 0, bottom: 100 },
  { top: 100, bottom: 300 },
  { top: 300, bottom: 340 },
];

const listBox = { top: 100, right: 300, bottom: 400, left: 0 };

describe('clamp', () => {
  it('keeps values inside the range and pins values outside it', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('dropIndexFromSpans', () => {
  it.each([
    [-50, 0],
    [49, 0],
    [51, 1],
    [199, 1],
    [201, 2],
    [321, 3],
    [1000, 3],
  ])('drops at index %d when the pointer is at y=%d', (y, index) => {
    expect(dropIndexFromSpans(spans, y)).toBe(index);
  });

  it('drops at the start of an empty page', () => {
    expect(dropIndexFromSpans([], 120)).toBe(0);
  });
});

describe('indicatorY', () => {
  it('sits on the outer edges of the first and last blocks', () => {
    expect(indicatorY(spans, 0)).toBe(0);
    expect(indicatorY(spans, 3)).toBe(340);
  });

  it('sits halfway between neighbours that have a gap', () => {
    const withGap = [
      { top: 0, bottom: 90 },
      { top: 110, bottom: 200 },
    ];
    expect(indicatorY(withGap, 1)).toBe(100);
  });

  it('sits at the top of an empty page', () => {
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

describe('fitDevice', () => {
  const desktop = { width: 1440, height: null };
  const phone = { width: 375, height: 812 };
  const tablet = { width: 768, height: 1024 };

  it('shows nothing until the canvas area has been measured', () => {
    const fit = fitDevice(phone, { width: 0, height: 0 });
    expect(fit.box).toEqual({ width: 0, height: 0 });
    expect(fit.frame).toEqual({ width: 375, height: 812 });
    expect(fit.scale).toBe(1);
  });

  it('shrinks desktop to the available width and fills the available height', () => {
    const fit = fitDevice(desktop, { width: 720, height: 600 });
    expect(fit.scale).toBe(0.5);
    expect(fit.box).toEqual({ width: 720, height: 600 });
    expect(fit.frame).toEqual({ width: 1440, height: 1200 });
  });

  it('never zooms desktop in on a wide screen', () => {
    const fit = fitDevice(desktop, { width: 2000, height: 900 });
    expect(fit.scale).toBe(1);
    expect(fit.box).toEqual({ width: 1440, height: 900 });
  });

  it('shows a phone at its real size when it fits', () => {
    const fit = fitDevice(phone, { width: 1000, height: 900 });
    expect(fit.scale).toBe(1);
    expect(fit.box).toEqual({ width: 375, height: 812 });
  });

  it('shrinks a tablet to fit a short canvas so its whole screen stays visible', () => {
    const fit = fitDevice(tablet, { width: 1000, height: 512 });
    expect(fit.scale).toBe(0.5);
    expect(fit.box).toEqual({ width: 384, height: 512 });
    expect(fit.frame).toEqual({ width: 768, height: 1024 });
  });

  it('shrinks a phone to fit a narrow canvas', () => {
    const fit = fitDevice(phone, { width: 300, height: 2000 });
    expect(fit.scale).toBe(0.8);
    expect(fit.box.width).toBe(300);
  });
});

describe('autoScrollDelta', () => {
  const frame = { top: 100, bottom: 700 };

  it('does not scroll while the pointer is away from the edges', () => {
    expect(autoScrollDelta(400, frame, 1)).toBe(0);
  });

  it('scrolls up faster the closer the pointer gets to the top edge', () => {
    const near = autoScrollDelta(frame.top + AUTO_SCROLL_EDGE_PX / 2, frame, 1);
    const atEdge = autoScrollDelta(frame.top, frame, 1);
    expect(near).toBeLessThan(0);
    expect(atEdge).toBe(-AUTO_SCROLL_MAX_SPEED_PX);
    expect(Math.abs(near)).toBeLessThan(Math.abs(atEdge));
  });

  it('scrolls down near the bottom edge and caps the speed beyond it', () => {
    expect(autoScrollDelta(frame.bottom - 10, frame, 1)).toBeGreaterThan(0);
    expect(autoScrollDelta(frame.bottom + 200, frame, 1)).toBe(AUTO_SCROLL_MAX_SPEED_PX);
  });

  it('converts screen pixels to page pixels when the canvas is zoomed out', () => {
    expect(autoScrollDelta(frame.bottom, frame, 0.5)).toBe(AUTO_SCROLL_MAX_SPEED_PX * 2);
  });
});

describe('blockToolbarTop', () => {
  const toolbarSpace = BLOCK_TOOLBAR_HEIGHT_PX + BLOCK_TOOLBAR_GAP_PX;

  it('sits above the block when there is room', () => {
    expect(blockToolbarTop({ top: 200, bottom: 400 }, 800)).toBe(200 - toolbarSpace);
  });

  it('sits below the block when the block starts at the top of the canvas', () => {
    expect(blockToolbarTop({ top: 10, bottom: 100 }, 800)).toBe(100 + BLOCK_TOOLBAR_GAP_PX);
  });

  it('sits inside the block when it fills the visible canvas', () => {
    expect(blockToolbarTop({ top: -50, bottom: 900 }, 800)).toBe(BLOCK_TOOLBAR_GAP_PX);
  });

  it('stays attached to the bottom of a block that is scrolled mostly out of view', () => {
    expect(blockToolbarTop({ top: -200, bottom: 20 }, 800)).toBe(20 - toolbarSpace);
  });
});

describe('isOutOfView', () => {
  it('is true only when the block is fully above or below the viewport', () => {
    expect(isOutOfView({ top: -300, bottom: -1 }, 800)).toBe(true);
    expect(isOutOfView({ top: 801, bottom: 900 }, 800)).toBe(true);
    expect(isOutOfView({ top: -10, bottom: 10 }, 800)).toBe(false);
    expect(isOutOfView({ top: 790, bottom: 900 }, 800)).toBe(false);
  });
});

describe('isFullyInView', () => {
  it('is true only when the whole block is inside the viewport', () => {
    expect(isFullyInView({ top: 0, bottom: 800 }, 800)).toBe(true);
    expect(isFullyInView({ top: 700, bottom: 900 }, 800)).toBe(false);
    expect(isFullyInView({ top: -1, bottom: 100 }, 800)).toBe(false);
  });
});

describe('isPointInBox', () => {
  it('includes the edges and the vertical margin', () => {
    expect(isPointInBox({ x: 0, y: 100 }, listBox, 0)).toBe(true);
    expect(isPointInBox({ x: 150, y: 95 }, listBox, 8)).toBe(true);
    expect(isPointInBox({ x: 150, y: 95 }, listBox, 0)).toBe(false);
  });

  it('is false outside the box horizontally', () => {
    expect(isPointInBox({ x: 301, y: 200 }, listBox, 50)).toBe(false);
  });

  it('is false for a box with no size, such as a hidden list', () => {
    expect(isPointInBox({ x: 0, y: 0 }, { top: 0, right: 0, bottom: 0, left: 0 }, 10)).toBe(false);
  });
});

describe('listDropIndex', () => {
  const rows = [
    { top: 100, bottom: 140 },
    { top: 140, bottom: 180 },
  ];

  it('returns the gap under the pointer while it is over the list', () => {
    expect(listDropIndex(listBox, rows, { x: 10, y: 110 }, 8)).toBe(0);
    expect(listDropIndex(listBox, rows, { x: 10, y: 170 }, 8)).toBe(2);
  });

  it('returns null when the pointer is outside the list', () => {
    expect(listDropIndex(listBox, rows, { x: 400, y: 120 }, 8)).toBeNull();
  });
});

describe('dropEdgeAt', () => {
  it('marks the row before the gap, and the last row for a drop at the end', () => {
    expect(dropEdgeAt(1, 1, 3)).toBe('before');
    expect(dropEdgeAt(3, 2, 3)).toBe('after');
  });

  it('marks nothing for other rows or when there is no drop', () => {
    expect(dropEdgeAt(1, 0, 3)).toBeNull();
    expect(dropEdgeAt(3, 1, 3)).toBeNull();
    expect(dropEdgeAt(null, 0, 3)).toBeNull();
  });
});

describe('deviceForWidth', () => {
  it.each([
    [320, 'phone'],
    [767, 'phone'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1440, 'desktop'],
  ])('treats a %i px wide page as %s', (width, device) => {
    expect(deviceForWidth(width)).toBe(device);
  });
});

describe('canvasViewport', () => {
  const available = { width: 900.6, height: 700 };

  it('uses the fixed size of a device preset', () => {
    expect(canvasViewport('tablet', 500, available)).toEqual({ width: 768, height: 1024 });
  });

  it('fills the available width in responsive mode until the user resizes it', () => {
    expect(canvasViewport('responsive', null, available)).toEqual({ width: 900, height: null });
  });

  it('keeps a resized responsive width between 320 px and the available width', () => {
    expect(canvasViewport('responsive', 500, available).width).toBe(500);
    expect(canvasViewport('responsive', 100, available).width).toBe(320);
    expect(canvasViewport('responsive', 2000, available).width).toBe(900);
  });

  it('never goes below 320 px, even when the canvas is narrower', () => {
    expect(canvasViewport('responsive', null, { width: 0, height: 0 }).width).toBe(320);
  });
});
