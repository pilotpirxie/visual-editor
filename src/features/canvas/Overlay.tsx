import { useLayoutEffect, useState, type CSSProperties, type JSX } from 'react';
import { selectCurrentPage, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { duplicateBlock, moveBlock, removeBlock } from '../editor/blockActions';
import { Icon } from '../editor/Icon';
import { dragController } from './dragController';
import { blockRoot } from './frameDom';

type Rect = { top: number; left: number; width: number; height: number };

type OverlayProps = {
  doc: Document;
  scale: number;
  height: number;
  hoveredId: string | null;
  selectedId: string | null;
  dropY: number | null;
  isEmpty: boolean;
};

const TOOLBAR_HEIGHT = 32;
const TOOLBAR_GAP = 4;

function boxStyle({ top, left, width, height }: Rect): CSSProperties {
  return { top, left, width, height };
}

function useBlockRect(doc: Document, blockId: string | null, scale: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const view = doc.defaultView;
    if (!view) return;
    let frame = 0;

    function update(): void {
      frame = 0;
      const root = blockId ? blockRoot(doc, blockId) : null;
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
      setRect((previous) => {
        const isUnchanged =
          previous !== null &&
          previous.top === next.top &&
          previous.left === next.left &&
          previous.width === next.width &&
          previous.height === next.height;
        return isUnchanged ? previous : next;
      });
    }

    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(update);
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
  const componentId = useStore((state) =>
    blockId ? state.project.blocks.entities[blockId]?.componentId : undefined,
  );
  if (componentId === undefined) return null;
  const component = registry.get(componentId);
  if (component === undefined) return `Missing: ${componentId}`;
  return component.definition.name;
}

type BlockToolbarProps = { blockId: string; rect: Rect; name: string; overlayHeight: number };

function BlockToolbar({ blockId, rect, name, overlayHeight }: BlockToolbarProps): JSX.Element {
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const index = blockIds.indexOf(blockId);

  const above = rect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP;
  const below = rect.top + rect.height + TOOLBAR_GAP;
  let top: number;
  if (above >= 0) {
    top = above;
  } else if (rect.top >= 0 && below + TOOLBAR_HEIGHT <= overlayHeight) {
    top = below;
  } else {
    top = Math.min(TOOLBAR_GAP, rect.top + rect.height - TOOLBAR_HEIGHT - TOOLBAR_GAP);
  }

  return (
    <div
      className="ve-block-toolbar"
      role="toolbar"
      aria-label={`${name} actions`}
      style={{ top, right: `calc(100% - ${rect.left + rect.width}px)` }}
    >
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
        onClick={() => moveBlock(blockId, -1)}
      >
        <Icon name="arrow-up" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        title="Move down (Alt+↓)"
        disabled={index === -1 || index >= blockIds.length - 1}
        onClick={() => moveBlock(blockId, 1)}
      >
        <Icon name="arrow-down" />
      </button>
      <button
        type="button"
        aria-label="Duplicate"
        title="Duplicate (⌘D)"
        onClick={() => duplicateBlock(blockId)}
      >
        <Icon name="copy" />
      </button>
      <button
        type="button"
        aria-label="Delete"
        title="Delete (Del)"
        onClick={() => removeBlock(blockId)}
      >
        <Icon name="trash" />
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
  dropY,
  isEmpty,
}: OverlayProps): JSX.Element {
  const visibleHoverId = hoveredId === selectedId ? null : hoveredId;
  const hoverRect = useBlockRect(doc, visibleHoverId, scale);
  const selectedRect = useBlockRect(doc, selectedId, scale);
  const hoverName = useBlockName(visibleHoverId);
  const selectedName = useBlockName(selectedId);

  return (
    <div className="ve-overlay">
      {isEmpty && <div className="ve-empty">Drag a block here to start</div>}
      {visibleHoverId && hoverRect && (
        <div className="ve-outline ve-outline--hover" style={boxStyle(hoverRect)}>
          <span className="ve-outline-label">{hoverName}</span>
        </div>
      )}
      {selectedId && selectedRect && selectedName !== null && (
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
      {dropY !== null && <div className="ve-drop-line" style={{ top: dropY }} />}
    </div>
  );
}
