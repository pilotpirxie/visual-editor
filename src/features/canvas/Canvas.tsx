import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type RefObject,
} from 'react';
import { DEVICE_WIDTHS, blockSelected, fieldFocusRequested } from '../../app/editorSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { dropOnCurrentPage, isNoopDrop } from '../editor/blockActions';
import { useShortcuts } from '../editor/useShortcuts';
import { CanvasFrame, type CanvasFrameHandle } from './CanvasFrame';
import { dragController } from './dragController';
import { dropIndexFromSpans, indicatorY } from './dropIndex';
import {
  blockIdFromEvent,
  blockRoot,
  blockSpans,
  fieldPathFromEvent,
  isElementTarget,
} from './frameDom';
import { Overlay } from './Overlay';
import './canvas.css';

const GUTTER = 24;
const AUTO_SCROLL_EDGE = 56;
const AUTO_SCROLL_MAX_SPEED = 18;

function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function useCanvasPointer(doc: Document | null): string | null {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    function onPointerMove(event: PointerEvent): void {
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

export function Canvas(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const isDragging = useSyncExternalStore(dragController.subscribe, dragController.isActive);

  const viewportRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const available = useElementSize(viewportRef);
  const [frame, setFrame] = useState<CanvasFrameHandle | null>(null);
  const [dropY, setDropY] = useState<number | null>(null);
  const hoveredId = useCanvasPointer(frame?.doc ?? null);
  useShortcuts(frame?.doc ?? null);

  const deviceWidth = DEVICE_WIDTHS[device];
  const scale = available.width > 0 ? Math.min(1, (available.width - GUTTER * 2) / deviceWidth) : 1;
  const visibleHeight = Math.max(0, available.height - GUTTER * 2);

  useEffect(() => {
    const doc = frame?.doc;
    if (!doc) return;
    return dragController.registerTarget({
      accepts: (payload) => payload.kind === 'new' || payload.kind === 'move',
      resolve(point) {
        const viewport = viewportRef.current?.getBoundingClientRect();
        const page = deviceRef.current?.getBoundingClientRect();
        if (!viewport || !page) return null;
        const isOverCanvas =
          point.x >= viewport.left &&
          point.x <= viewport.right &&
          point.y >= viewport.top &&
          point.y <= viewport.bottom;
        if (!isOverCanvas) return null;
        return dropIndexFromSpans(blockSpans(doc), (point.y - page.top) / scale);
      },
      showIndicator(index, payload) {
        setDropY(
          index === null || isNoopDrop(payload, index)
            ? null
            : indicatorY(blockSpans(doc), index) * scale,
        );
      },
      drop: dropOnCurrentPage,
      tick(point) {
        const page = deviceRef.current?.getBoundingClientRect();
        if (!page) return;
        const fromTop = point.y - page.top;
        const fromBottom = page.bottom - point.y;
        let direction = 0;
        let closeness = 0;
        if (fromTop < AUTO_SCROLL_EDGE) {
          direction = -1;
          closeness = (AUTO_SCROLL_EDGE - fromTop) / AUTO_SCROLL_EDGE;
        } else if (fromBottom < AUTO_SCROLL_EDGE) {
          direction = 1;
          closeness = (AUTO_SCROLL_EDGE - fromBottom) / AUTO_SCROLL_EDGE;
        }
        if (direction === 0) return;
        const speed = direction * Math.min(closeness, 1) * AUTO_SCROLL_MAX_SPEED;
        doc.defaultView?.scrollBy(0, speed / scale);
      },
    });
  }, [frame, scale]);

  useEffect(() => {
    const doc = frame?.doc;
    const view = doc?.defaultView;
    const root = doc && selectedId ? blockRoot(doc, selectedId) : null;
    if (!view || !root) return;
    const box = root.getBoundingClientRect();
    if (box.bottom < 0 || box.top > view.innerHeight)
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [frame, selectedId, blockIds]);

  return (
    <div className="ve-canvas" ref={viewportRef}>
      <div
        className="ve-canvas-device"
        data-device={device}
        ref={deviceRef}
        style={{ width: deviceWidth * scale, height: visibleHeight }}
      >
        <CanvasFrame
          width={deviceWidth}
          height={visibleHeight / scale}
          scale={scale}
          onReady={setFrame}
        />
        {frame && (
          <Overlay
            doc={frame.doc}
            scale={scale}
            height={visibleHeight}
            hoveredId={isDragging ? null : hoveredId}
            selectedId={selectedId}
            dropY={dropY}
            isEmpty={blockIds.length === 0}
          />
        )}
      </div>
      {scale < 1 && <p className="ve-canvas-zoom">Zoom {Math.round(scale * 100)}%</p>}
      {isDragging && <div className="ve-canvas-catcher" />}
    </div>
  );
}
