export type Box = { top: number; left: number; width: number; height: number };

export type Size = { width: number; height: number };

export type Position = { top: number; left: number };

export const VIEWPORT_MARGIN = 8;

const ANCHOR_GAP = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function placeNear(anchor: Box, size: Size, viewport: Size): Position {
  const below = anchor.top + anchor.height + ANCHOR_GAP;
  const above = anchor.top - ANCHOR_GAP - size.height;
  const fitsBelow = below + size.height <= viewport.height - VIEWPORT_MARGIN;
  const fitsAbove = above >= VIEWPORT_MARGIN;
  const top = fitsBelow || !fitsAbove ? below : above;
  const centered = anchor.left + anchor.width / 2 - size.width / 2;
  return {
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - size.height - VIEWPORT_MARGIN),
    left: clamp(centered, VIEWPORT_MARGIN, viewport.width - size.width - VIEWPORT_MARGIN),
  };
}

export function placeAtPoint(point: Position, size: Size, viewport: Size): Position {
  return {
    top: clamp(point.top, VIEWPORT_MARGIN, viewport.height - size.height - VIEWPORT_MARGIN),
    left: clamp(point.left, VIEWPORT_MARGIN, viewport.width - size.width - VIEWPORT_MARGIN),
  };
}
