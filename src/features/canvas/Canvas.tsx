import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type RefObject,
} from 'react';
import { visibleBlockLists } from '../../app/blockLists';
import { blockSelected, fieldFocusRequested } from '../../app/editorSlice';
import {
  dispatch,
  selectCanvasRenderContext,
  selectCurrentPage,
  store,
  useStore,
  type RootState,
} from '../../app/store';
import type { Device } from '../../app/types';
import { dropBlock, isNoopDrop } from '../editor/blockActions';
import { openPage } from '../pages/pageActions';
import { BlockContextMenu } from '../editor/BlockContextMenu';
import { closeOpenPopovers, type MenuPoint } from '../editor/Menu';
import { useClipboard } from '../editor/useClipboard';
import { useShortcuts } from '../editor/useShortcuts';
import { CanvasFrame, type CanvasFrameHandle } from './CanvasFrame';
import { dragController, type DragPayload } from './dragController';
import {
  autoScrollDelta,
  canvasViewport,
  deviceForWidth,
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
  pageRootTop,
} from './frameDom';
import { canvasLinkTarget } from './links';
import { Overlay } from './Overlay';
import { ResponsiveHandles } from './ResponsiveHandles';
import './canvas.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
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

function scrollBehavior(view: Window): ScrollBehavior {
  return view.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
}

function scrollToAnchor(doc: Document, anchor: string): void {
  const target = doc.getElementById(anchor);
  const view = doc.defaultView;
  if (target === null || view === null) return;
  target.scrollIntoView({ behavior: scrollBehavior(view), block: 'start' });
}

function followCanvasLink(doc: Document, href: string | null): void {
  const { pageSlugs } = selectCanvasRenderContext(store.getState());
  const target = canvasLinkTarget(href, pageSlugs);
  if (target.kind === 'section') {
    scrollToAnchor(doc, target.anchor);
  } else if (target.kind === 'page') {
    const isCurrentPage = selectCurrentPage(store.getState()).id === target.pageId;
    if (!isCurrentPage) {
      dispatch(openPage(target.pageId, target.anchor));
    } else if (target.anchor !== null) {
      scrollToAnchor(doc, target.anchor);
    }
  } else if (target.kind === 'external') {
    window.open(target.href, '_blank', 'noopener');
  }
}

function linkFromEvent(event: Event): Element | null {
  if (!isElementTarget(event.target)) return null;
  return event.target.closest('a[href]');
}

function useCanvasPointer(doc: Document | null, isPreview: boolean): string | null {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (doc === null) return;
    function onPointerMove(event: PointerEvent): void {
      if (event.pointerType === 'touch' || isPreview) return;
      setHoveredId(blockIdFromEvent(event));
    }
    function onPointerLeave(): void {
      setHoveredId(null);
    }
    function onClick(event: MouseEvent): void {
      const link = linkFromEvent(event);
      if (link !== null) {
        event.preventDefault();
        const isFollowing = isPreview || event.metaKey || event.ctrlKey;
        if (isFollowing && doc !== null) {
          followCanvasLink(doc, link.getAttribute('href'));
          return;
        }
      }
      if (isPreview) return;
      const blockId = blockIdFromEvent(event);
      const path = fieldPathFromEvent(event);
      if (blockId !== null && path !== null) {
        dispatch(fieldFocusRequested({ blockId, path }));
        return;
      }
      dispatch(blockSelected(blockId));
    }
    function onSubmit(event: SubmitEvent): void {
      event.preventDefault();
    }
    doc.addEventListener('pointermove', onPointerMove);
    doc.documentElement.addEventListener('pointerleave', onPointerLeave);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('submit', onSubmit, true);
    return () => {
      doc.removeEventListener('pointermove', onPointerMove);
      doc.documentElement.removeEventListener('pointerleave', onPointerLeave);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('submit', onSubmit, true);
    };
  }, [doc, isPreview]);

  return isPreview ? null : hoveredId;
}

type CanvasMenu = { blockId: string; point: MenuPoint };

function useCanvasContextMenu(
  frame: CanvasFrameHandle | null,
  isPreview: boolean,
  scale: number,
): [CanvasMenu | null, () => void] {
  const [menu, setMenu] = useState<CanvasMenu | null>(null);

  useEffect(() => {
    if (frame === null || isPreview) return;
    const { iframe, doc } = frame;
    function onContextMenu(event: MouseEvent): void {
      const blockId = blockIdFromEvent(event);
      if (blockId === null) return;
      event.preventDefault();
      dispatch(blockSelected(blockId));
      const box = iframe.getBoundingClientRect();
      const point = { x: box.left + event.clientX * scale, y: box.top + event.clientY * scale };
      setMenu({ blockId, point });
    }
    function onPointerDown(): void {
      setMenu(null);
      closeOpenPopovers(document);
    }
    doc.addEventListener('contextmenu', onContextMenu);
    doc.addEventListener('pointerdown', onPointerDown);
    return () => {
      doc.removeEventListener('contextmenu', onContextMenu);
      doc.removeEventListener('pointerdown', onPointerDown);
    };
  }, [frame, isPreview, scale]);

  return [menu, () => setMenu(null)];
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
  const isAccepted = useEffectEvent(
    (payload: DragPayload) =>
      payload.kind === 'new' || (payload.kind === 'move' && blockIds.includes(payload.blockId)),
  );

  useEffect(() => {
    if (frame === null) return;
    const { iframe, doc } = frame;
    return dragController.registerTarget({
      accepts: (payload) => isAccepted(payload),
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
        setDropY(indicatorY(blockSpans(doc), index, pageRootTop(doc)) * scale);
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
  const pageId = useStore((state) => selectCurrentPage(state).id);
  const previousBlockIdsRef = useRef(blockIds);
  const previousPageIdRef = useRef(pageId);

  useEffect(() => {
    const hasPageChanged = previousBlockIdsRef.current !== blockIds;
    const hasPageSwitched = previousPageIdRef.current !== pageId;
    previousBlockIdsRef.current = blockIds;
    previousPageIdRef.current = pageId;
    if (frame === null || selectedId === null || hasPageSwitched) return;
    const view = frame.doc.defaultView;
    if (view === null) return;
    const root = blockRoot(frame.doc, selectedId);
    if (root === null) return;
    const box = root.getBoundingClientRect();
    const shouldScroll = hasPageChanged
      ? !isFullyInView(box, view.innerHeight)
      : isOutOfView(box, view.innerHeight);
    if (!shouldScroll) return;
    view.scrollBy({ top: box.top, behavior: scrollBehavior(view) });
  }, [frame, selectedId, blockIds, pageId]);
}

function hiddenBlockIdsText(state: RootState, device: Device): string {
  const { header, page, footer } = visibleBlockLists(state.project, selectCurrentPage(state));
  const hiddenIds: string[] = [];
  for (const blockId of [...header, ...page, ...footer]) {
    const block = state.project.blocks.entities[blockId];
    if (block !== undefined && !block.disabled && block.hideOn.includes(device)) {
      hiddenIds.push(blockId);
    }
  }
  return hiddenIds.join(' ');
}

function useHiddenBlockIds(device: Device): string[] {
  const idsText = useStore((state) => hiddenBlockIdsText(state, device));
  return useMemo(() => (idsText === '' ? [] : idsText.split(' ')), [idsText]);
}

function movingBlockId(): string | null {
  const snapshot = dragController.getSnapshot();
  if (snapshot === null || snapshot.payload.kind !== 'move') return null;
  return snapshot.payload.blockId;
}

export function Canvas(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const responsiveWidth = useStore((state) => state.editor.responsiveWidth);
  const isPreview = useStore((state) => state.editor.isPreview);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const isEmpty = useStore((state) => selectCurrentPage(state).blockIds.length === 0);
  const isDragging = useSyncExternalStore(dragController.subscribe, dragController.isActive);
  const movingId = useSyncExternalStore(dragController.subscribe, movingBlockId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const available = useElementSize(viewportRef);
  const [frame, setFrame] = useState<CanvasFrameHandle | null>(null);
  const hoveredId = useCanvasPointer(frame?.doc ?? null, isPreview);
  const viewport = canvasViewport(device, responsiveWidth, available);
  const fit = fitDevice(viewport, available);
  const pageDevice = deviceForWidth(fit.frame.width);
  const hiddenIds = useHiddenBlockIds(pageDevice);
  const dropY = useCanvasDropTarget(frame, viewportRef, fit.scale);
  useScrollSelectedIntoView(frame, selectedId);
  const [contextMenu, closeContextMenu] = useCanvasContextMenu(frame, isPreview, fit.scale);
  useShortcuts(frame?.doc ?? null);
  useClipboard(frame?.doc ?? null);

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
        {frame !== null && !isPreview && (
          <Overlay
            doc={frame.doc}
            scale={fit.scale}
            height={fit.box.height}
            hoveredId={isDragging ? null : hoveredId}
            selectedId={selectedId}
            movingId={movingId}
            dropY={dropY}
            isEmpty={isEmpty}
            hiddenIds={hiddenIds}
            pageDevice={pageDevice}
          />
        )}
      </div>
      {device === 'responsive' && !isPreview && (
        <ResponsiveHandles
          width={viewport.width}
          maxWidth={Math.max(Math.floor(available.width), viewport.width)}
          boxWidth={fit.box.width}
        />
      )}
      {device === 'responsive' && (
        <p className="ve-canvas-width" aria-live="polite">
          {viewport.width} px
        </p>
      )}
      {fit.scale < 1 && <p className="ve-canvas-zoom">Zoom {Math.round(fit.scale * 100)}%</p>}
      {isDragging && <div className="ve-canvas-catcher" />}
      {contextMenu !== null && (
        <BlockContextMenu
          blockId={contextMenu.blockId}
          point={contextMenu.point}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
