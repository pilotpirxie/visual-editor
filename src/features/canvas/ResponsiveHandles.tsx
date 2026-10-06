import { useRef, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import { MIN_RESPONSIVE_WIDTH, responsiveWidthChanged } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { clamp } from './geometry';

type Edge = 'left' | 'right';

type DragStart = { pointerX: number; width: number };

const KEYBOARD_STEP_PX = 10;
const HANDLE_GAP_PX = 6;
const HANDLE_WIDTH_PX = 12;
const EDGES: Edge[] = ['left', 'right'];

function edgeOffset(edge: Edge, boxWidth: number): string {
  const halfWidth = boxWidth / 2;
  if (edge === 'left') return `calc(50% - ${halfWidth + HANDLE_GAP_PX + HANDLE_WIDTH_PX}px)`;
  return `calc(50% + ${halfWidth + HANDLE_GAP_PX}px)`;
}

function ResizeEdge({
  edge,
  width,
  maxWidth,
  boxWidth,
}: {
  edge: Edge;
  width: number;
  maxWidth: number;
  boxWidth: number;
}): JSX.Element {
  const dragStartRef = useRef<DragStart | null>(null);
  const outward = edge === 'right' ? 1 : -1;

  function resizeTo(next: number): void {
    dispatch(responsiveWidthChanged(clamp(Math.round(next), MIN_RESPONSIVE_WIDTH, maxWidth)));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { pointerX: event.clientX, width };
  }

  function drag(event: PointerEvent<HTMLDivElement>): void {
    const start = dragStartRef.current;
    if (start === null) return;
    resizeTo(start.width + (event.clientX - start.pointerX) * 2 * outward);
  }

  function endDrag(): void {
    dragStartRef.current = null;
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      resizeTo(width + direction * outward * KEYBOARD_STEP_PX);
    } else if (event.key === 'Home') {
      resizeTo(MIN_RESPONSIVE_WIDTH);
    } else if (event.key === 'End') {
      resizeTo(maxWidth);
    } else {
      return;
    }
    event.preventDefault();
  }

  return (
    <div
      className="ve-responsive-handle"
      data-edge={edge}
      style={{ left: edgeOffset(edge, boxWidth) }}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={`Resize the page from its ${edge} edge`}
      aria-valuemin={MIN_RESPONSIVE_WIDTH}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={resizeWithKeyboard}
    />
  );
}

export function ResponsiveHandles({
  width,
  maxWidth,
  boxWidth,
}: {
  width: number;
  maxWidth: number;
  boxWidth: number;
}): JSX.Element {
  return (
    <>
      {EDGES.map((edge) => (
        <ResizeEdge key={edge} edge={edge} width={width} maxWidth={maxWidth} boxWidth={boxWidth} />
      ))}
    </>
  );
}
