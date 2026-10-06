import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type RefObject,
} from 'react';
import { blockSelected, DEVICE_VIEWPORTS, fieldFocusRequested } from '../../app/editorSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { dropBlock, isNoopDrop } from '../editor/blockActions';
import { useShortcuts } from '../editor/useShortcuts';
import { CanvasFrame, type CanvasFrameHandle } from './CanvasFrame';
import { dragController, type DragPayload } from './dragController';
import {
  autoScrollDelta,
  dropIndexFromSpans,
  fitDevice,
  indicatorY,
  isFullyInView,
  isOutOfView,
  isPointInBox,
  type Size,
} from './geometry';
import {
  blockIdFromEvent,
  blockRoot,
  blockSpans,
  fieldPathFromEvent,
  isElementTarget,
} from './frameDom';
import { Overlay } from './Overlay';
import './canvas.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSize({ width, height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function useCanvasPointer(doc: Document | null): string | null {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (doc === null) return;
    function onPointerMove(event: PointerEvent): void {
      if (event.pointerType === 'touch') return;
      setHoveredId(blockIdFromEvent(event));
    }
    function onPointerLeave(): void {
      setHoveredId(null);
    }
    function onClick(event: MouseEvent): void {
      if (isElementTarget(event.target) && event.target.closest('a[href]')) event.preventDefault();
      const blockId = blockIdFromEvent(event);
      const path = fieldPathFromEvent(event);
      if (blockId !== null && path !== null) {
        dispatch(fieldFocusRequested({ blockId, path }));
        return;
      }
      dispatch(blockSelected(blockId));
    }
    doc.addEventListener('pointermove', onPointerMove);
    doc.documentElement.addEventListener('pointerleave', onPointerLeave);
    doc.addEventListener('click', onClick, true);
    return () => {
      doc.removeEventListener('pointermove', onPointerMove);
      doc.documentElement.removeEventListener('pointerleave', onPointerLeave);
      doc.removeEventListener('click', onClick, true);
    };
  }, [doc]);

  return hoveredId;
}

function isShown(element: HTMLElement): boolean {
  return getComputedStyle(element).visibility !== 'hidden';
}

function useCanvasDropTarget(
  frame: CanvasFrameHandle | null,
  viewportRef: RefObject<HTMLElement | null>,
  scale: number,
): number | null {
  const [dropY, setDropY] = useState<number | null>(null);
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const isNoop = useEffectEvent((payload: DragPayload, index: number) =>
    isNoopDrop(blockIds, payload, index),
  );

  useEffect(() => {
    if (frame === null) return;
    const { iframe, doc } = frame;
    return dragController.registerTarget({
      accepts: (payload) => payload.kind === 'new' || payload.kind === 'move',
      resolve(point) {
        const viewport = viewportRef.current;
        if (viewport === null || !isShown(viewport)) return null;
        if (!isPointInBox(point, viewport.getBoundingClientRect(), 0)) return null;
        const frameTop = iframe.getBoundingClientRect().top;
        return dropIndexFromSpans(blockSpans(doc), (point.y - frameTop) / scale);
      },
      showIndicator(index, payload) {
        if (index === null || isNoop(payload, index)) {
          setDropY(null);
          return;
        }
        setDropY(indicatorY(blockSpans(doc), index) * scale);
      },
      drop: (payload, index) => dispatch(dropBlock(payload, index)),
      tick(point) {
        const delta = autoScrollDelta(point.y, iframe.getBoundingClientRect(), scale);
        if (delta !== 0) doc.defaultView?.scrollBy(0, delta);
      },
    });
  }, [frame, viewportRef, scale]);

  return dropY;
}

function useScrollSelectedIntoView(
  frame: CanvasFrameHandle | null,
  selectedId: string | null,
): void {
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const previousBlockIdsRef = useRef(blockIds);

  useEffect(() => {
    const hasPageChanged = previousBlockIdsRef.current !== blockIds;
    previousBlockIdsRef.current = blockIds;
    if (frame === null || selectedId === null) return;
    const view = frame.doc.defaultView;
    if (view === null) return;
    const root = blockRoot(frame.doc, selectedId);
    if (root === null) return;
    const box = root.getBoundingClientRect();
    const shouldScroll = hasPageChanged
      ? !isFullyInView(box, view.innerHeight)
      : isOutOfView(box, view.innerHeight);
    if (!shouldScroll) return;
    const prefersReducedMotion = view.matchMedia(REDUCED_MOTION_QUERY).matches;
    view.scrollBy({ top: box.top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [frame, selectedId, blockIds]);
}

function movingBlockId(): string | null {
  const snapshot = dragController.getSnapshot();
  if (snapshot === null || snapshot.payload.kind !== 'move') return null;
  return snapshot.payload.blockId;
}

export function Canvas(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const isEmpty = useStore((state) => selectCurrentPage(state).blockIds.length === 0);
  const isDragging = useSyncExternalStore(dragController.subscribe, dragController.isActive);
  const movingId = useSyncExternalStore(dragController.subscribe, movingBlockId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const available = useElementSize(viewportRef);
  const [frame, setFrame] = useState<CanvasFrameHandle | null>(null);
  const hoveredId = useCanvasPointer(frame?.doc ?? null);
  const fit = fitDevice(DEVICE_VIEWPORTS[device], available);
  const dropY = useCanvasDropTarget(frame, viewportRef, fit.scale);
  useScrollSelectedIntoView(frame, selectedId);
  useShortcuts(frame?.doc ?? null);

  return (
    <div className="ve-canvas" ref={viewportRef}>
      <div
        className="ve-canvas-device"
        data-device={device}
        style={{ width: fit.box.width, height: fit.box.height }}
      >
        <CanvasFrame
          width={fit.frame.width}
          height={fit.frame.height}
          scale={fit.scale}
          onReady={setFrame}
        />
        {frame !== null && (
          <Overlay
            doc={frame.doc}
            scale={fit.scale}
            height={fit.box.height}
            hoveredId={isDragging ? null : hoveredId}
            selectedId={selectedId}
            movingId={movingId}
            dropY={dropY}
            isEmpty={isEmpty}
          />
        )}
      </div>
      {fit.scale < 1 && <p className="ve-canvas-zoom">Zoom {Math.round(fit.scale * 100)}%</p>}
      {isDragging && <div className="ve-canvas-catcher" />}
    </div>
  );
}
