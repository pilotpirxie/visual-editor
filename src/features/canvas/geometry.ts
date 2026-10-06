import type { DeviceViewport } from '../../app/editorSlice';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type VerticalSpan = { top: number; bottom: number };
export type Box = { top: number; right: number; bottom: number; left: number };
export type DeviceFit = { scale: number; frame: Size; box: Size };
export type DropEdge = 'before' | 'after';

export const AUTO_SCROLL_EDGE_PX = 56;
export const AUTO_SCROLL_MAX_SPEED_PX = 18;
export const BLOCK_TOOLBAR_HEIGHT_PX = 32;
export const BLOCK_TOOLBAR_GAP_PX = 4;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function dropIndexFromSpans(spans: VerticalSpan[], y: number): number {
  const index = spans.findIndex(({ top, bottom }) => y < (top + bottom) / 2);
  if (index === -1) return spans.length;
  return index;
}

export function indicatorY(spans: VerticalSpan[], index: number): number {
  if (spans.length === 0) return 0;
  if (index <= 0) return spans[0].top;
  if (index >= spans.length) return spans[spans.length - 1].bottom;
  return (spans[index - 1].bottom + spans[index].top) / 2;
}

export function finalMoveIndex(from: number, dropIndex: number): number {
  if (dropIndex > from) return dropIndex - 1;
  return dropIndex;
}

export function fitDevice(viewport: DeviceViewport, available: Size): DeviceFit {
  const hasRoom = available.width > 0 && available.height > 0;
  if (!hasRoom) {
    return {
      scale: 1,
      frame: { width: viewport.width, height: viewport.height ?? 0 },
      box: { width: 0, height: 0 },
    };
  }

  const widthScale = Math.min(1, available.width / viewport.width);
  if (viewport.height === null) {
    return {
      scale: widthScale,
      frame: { width: viewport.width, height: available.height / widthScale },
      box: { width: viewport.width * widthScale, height: available.height },
    };
  }

  const scale = Math.min(widthScale, available.height / viewport.height);
  return {
    scale,
    frame: { width: viewport.width, height: viewport.height },
    box: { width: viewport.width * scale, height: viewport.height * scale },
  };
}

function edgeSpeed(distanceFromEdge: number): number {
  const closeness = Math.min(1, (AUTO_SCROLL_EDGE_PX - distanceFromEdge) / AUTO_SCROLL_EDGE_PX);
  return closeness * AUTO_SCROLL_MAX_SPEED_PX;
}

export function autoScrollDelta(pointerY: number, frame: VerticalSpan, scale: number): number {
  const fromTop = pointerY - frame.top;
  const fromBottom = frame.bottom - pointerY;
  if (fromTop < AUTO_SCROLL_EDGE_PX) {
    return -edgeSpeed(fromTop) / scale;
  } else if (fromBottom < AUTO_SCROLL_EDGE_PX) {
    return edgeSpeed(fromBottom) / scale;
  } else {
    return 0;
  }
}

export function blockToolbarTop(block: VerticalSpan, overlayHeight: number): number {
  const above = block.top - BLOCK_TOOLBAR_HEIGHT_PX - BLOCK_TOOLBAR_GAP_PX;
  const below = block.bottom + BLOCK_TOOLBAR_GAP_PX;
  const fitsBelow = block.top >= 0 && below + BLOCK_TOOLBAR_HEIGHT_PX <= overlayHeight;
  if (above >= 0) {
    return above;
  } else if (fitsBelow) {
    return below;
  } else {
    const insideBottom = block.bottom - BLOCK_TOOLBAR_HEIGHT_PX - BLOCK_TOOLBAR_GAP_PX;
    return Math.min(BLOCK_TOOLBAR_GAP_PX, insideBottom);
  }
}

export function isOutOfView(span: VerticalSpan, viewportHeight: number): boolean {
  return span.bottom < 0 || span.top > viewportHeight;
}

export function isFullyInView(span: VerticalSpan, viewportHeight: number): boolean {
  return span.top >= 0 && span.bottom <= viewportHeight;
}

export function isPointInBox(point: Point, box: Box, verticalMargin: number): boolean {
  const hasSize = box.right > box.left && box.bottom > box.top;
  if (!hasSize) return false;
  return (
    point.x >= box.left &&
    point.x <= box.right &&
    point.y >= box.top - verticalMargin &&
    point.y <= box.bottom + verticalMargin
  );
}

export function listDropIndex(
  list: Box,
  rows: VerticalSpan[],
  point: Point,
  edgeMargin: number,
): number | null {
  if (!isPointInBox(point, list, edgeMargin)) return null;
  return dropIndexFromSpans(rows, point.y);
}

export function dropEdgeAt(
  dropIndex: number | null,
  row: number,
  rowCount: number,
): DropEdge | null {
  if (dropIndex === row) {
    return 'before';
  } else if (dropIndex === rowCount && row === rowCount - 1) {
    return 'after';
  } else {
    return null;
  }
}
