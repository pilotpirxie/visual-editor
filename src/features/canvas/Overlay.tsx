import { useLayoutEffect, useState, type CSSProperties, type JSX } from 'react';
import { compactTabSelected } from '../../app/editorSlice';
import { dispatch, selectCurrentPage, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { duplicateBlock, moveBlockBy, removeBlock } from '../editor/blockActions';
import { Icon } from '../editor/Icon';
import { dragController } from './dragController';
import { blockRoot } from './frameDom';
import { blockToolbarTop, clamp } from './geometry';

type Rect = { top: number; left: number; width: number; height: number };

type OverlayProps = {
  doc: Document;
  scale: number;
  height: number;
  hoveredId: string | null;
  selectedId: string | null;
  movingId: string | null;
  dropY: number | null;
  isEmpty: boolean;
};

const DROP_LINE_INSET_PX = 2;

function boxStyle({ top, left, width, height }: Rect): CSSProperties {
  return { top, left, width, height };
}

function isSameRect(previous: Rect | null, next: Rect): boolean {
  if (previous === null) return false;
  return (
    previous.top === next.top &&
    previous.left === next.left &&
    previous.width === next.width &&
    previous.height === next.height
  );
}

function useBlockRect(doc: Document, blockId: string | null, scale: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const view = doc.defaultView;
    if (view === null) return;
    let frame = 0;

    function update(): void {
      frame = 0;
      const root = blockId === null ? null : blockRoot(doc, blockId);
      if (root === null) {
        setRect(null);
        return;
      }
      const box = root.getBoundingClientRect();
      const next = {
        top: box.top * scale,
        left: box.left * scale,
        width: box.width * scale,
        height: box.height * scale,
      };
      setRect((previous) => (isSameRect(previous, next) ? previous : next));
    }

    function schedule(): void {
      if (frame === 0) frame = requestAnimationFrame(update);
    }

    update();
    const observer = new view.ResizeObserver(schedule);
    observer.observe(doc.body);
    view.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    const unsubscribe = store.subscribe(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      view.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
      unsubscribe();
    };
  }, [doc, blockId, scale]);

  return rect;
}

function useBlockName(blockId: string | null): string | null {
  const componentId = useStore((state) => {
    if (blockId === null) return null;
    return state.project.blocks.entities[blockId]?.componentId ?? null;
  });
  if (componentId === null) return null;
  const component = registry.get(componentId);
  if (component === undefined) return `Missing: ${componentId}`;
  return component.definition.name;
}

type BlockToolbarProps = { blockId: string; rect: Rect; name: string; overlayHeight: number };

function BlockToolbar({ blockId, rect, name, overlayHeight }: BlockToolbarProps): JSX.Element {
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const index = blockIds.indexOf(blockId);
  const top = blockToolbarTop({ top: rect.top, bottom: rect.top + rect.height }, overlayHeight);
  const style: CSSProperties = {
    '--ve-toolbar-top': `${top}px`,
    '--ve-toolbar-right': `calc(100% - ${rect.left + rect.width}px)`,
  };

  return (
    <div className="ve-block-toolbar" role="toolbar" aria-label={`${name} actions`} style={style}>
      <button
        type="button"
        className="ve-block-handle"
        aria-label="Drag to move"
        title="Drag to move"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragController.start({ kind: 'move', blockId, label: name }, event);
        }}
      >
        <Icon name="grip" />
      </button>
      <button
        type="button"
        aria-label="Move up"
        title="Move up (Alt+↑)"
        disabled={index <= 0}
        onClick={() => dispatch(moveBlockBy(blockId, -1))}
      >
        <Icon name="arrow-up" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        title="Move down (Alt+↓)"
        disabled={index === -1 || index >= blockIds.length - 1}
        onClick={() => dispatch(moveBlockBy(blockId, 1))}
      >
        <Icon name="arrow-down" />
      </button>
      <button
        type="button"
        aria-label="Duplicate"
        title="Duplicate (⌘D)"
        onClick={() => dispatch(duplicateBlock(blockId))}
      >
        <Icon name="copy" />
      </button>
      <button
        type="button"
        aria-label="Delete"
        title="Delete (Del)"
        onClick={() => dispatch(removeBlock(blockId))}
      >
        <Icon name="trash" />
      </button>
      <button
        type="button"
        className="ve-compact-only"
        aria-label={`Edit ${name}`}
        title="Edit"
        onClick={() => dispatch(compactTabSelected('properties'))}
      >
        <Icon name="pencil" />
      </button>
    </div>
  );
}

export function Overlay({
  doc,
  scale,
  height,
  hoveredId,
  selectedId,
  movingId,
  dropY,
  isEmpty,
}: OverlayProps): JSX.Element {
  const visibleHoverId = hoveredId === selectedId ? null : hoveredId;
  const hoverRect = useBlockRect(doc, visibleHoverId, scale);
  const selectedRect = useBlockRect(doc, selectedId, scale);
  const movingRect = useBlockRect(doc, movingId, scale);
  const hoverName = useBlockName(visibleHoverId);
  const selectedName = useBlockName(selectedId);

  return (
    <div className="ve-overlay">
      {isEmpty && (
        <div className="ve-empty">
          <span className="ve-wide-only">Drag a block here to start</span>
          <span className="ve-compact-only">Add a block from the Blocks tab</span>
        </div>
      )}
      {visibleHoverId !== null && hoverRect !== null && (
        <div className="ve-outline ve-outline--hover" style={boxStyle(hoverRect)}>
          <span className="ve-outline-label">{hoverName}</span>
        </div>
      )}
      {movingRect !== null && (
        <div className="ve-outline ve-outline--moving" style={boxStyle(movingRect)} />
      )}
      {selectedId !== null && selectedRect !== null && selectedName !== null && (
        <>
          <div className="ve-outline ve-outline--selected" style={boxStyle(selectedRect)} />
          <BlockToolbar
            blockId={selectedId}
            rect={selectedRect}
            name={selectedName}
            overlayHeight={height}
          />
        </>
      )}
      {dropY !== null && (
        <div
          className="ve-drop-line"
          style={{ top: clamp(dropY, DROP_LINE_INSET_PX, height - DROP_LINE_INSET_PX) }}
        />
      )}
    </div>
  );
}
