import { useLayoutEffect, useState, type CSSProperties, type JSX } from 'react';
import { compactTabSelected } from '../../app/editorSlice';
import { findBlockList, sharedSlotOf } from '../../app/blockLists';
import { dispatch, store, useStore } from '../../app/store';
import type { Device } from '../../app/types';
import { blockLabel } from '../../components/registry';
import { duplicateBlock, moveBlockBy, removeBlock } from '../editor/blockActions';
import { useBlockMenuItems } from '../editor/blockMenu';
import { dragController } from './dragController';
import { PAGE_ROOT_ID } from './frameDom';
import { blockToolbarTop, clamp } from './geometry';
import { IconButton, MenuButton } from '../../../packages/ui/src';

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
  hiddenIds: string[];
  modalIds: string[];
  pageDevice: Device;
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

function blockSelector(blockId: string): string {
  return `[data-block-id="${CSS.escape(blockId)}"]`;
}

function useBlockRect(doc: Document, blockId: string | null, scale: number): Rect | null {
  return useElementRect(doc, blockId === null ? null : blockSelector(blockId), scale);
}

function useElementRect(doc: Document, selector: string | null, scale: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const view = doc.defaultView;
    if (view === null) return;
    let frame = 0;

    function update(): void {
      frame = 0;
      const root = selector === null ? null : doc.querySelector(selector);
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
  }, [doc, selector, scale]);

  return rect;
}

function useIsShared(blockId: string | null): boolean {
  return useStore((state) => blockId !== null && sharedSlotOf(state.project, blockId) !== null);
}

function SharedBadge(): JSX.Element {
  return <span className="ve-outline-badge">Shared on all pages</span>;
}

function useBlockName(blockId: string | null): string | null {
  const block = useStore((state) =>
    blockId === null ? undefined : state.project.blocks.entities[blockId],
  );
  const customDefinitions = useStore((state) => state.project.customDefinitions);
  if (block === undefined) return null;
  return blockLabel(block, { customDefinitions });
}

function HiddenShade({
  doc,
  blockId,
  scale,
  device,
}: {
  doc: Document;
  blockId: string;
  scale: number;
  device: Device;
}): JSX.Element | null {
  const rect = useBlockRect(doc, blockId, scale);
  if (rect === null) return null;
  return (
    <div className="ve-outline ve-outline--hidden" style={boxStyle(rect)}>
      <span className="ve-outline-note">Hidden on {device}</span>
    </div>
  );
}

function ModalNote({
  doc,
  blockId,
  scale,
}: {
  doc: Document;
  blockId: string;
  scale: number;
}): JSX.Element | null {
  const rect = useBlockRect(doc, blockId, scale);
  if (rect === null) return null;
  return (
    <div className="ve-outline" style={boxStyle(rect)}>
      <span className="ve-outline-note">Modal</span>
    </div>
  );
}

type BlockToolbarProps = { blockId: string; rect: Rect; name: string; overlayHeight: number };

function BlockToolbar({ blockId, rect, name, overlayHeight }: BlockToolbarProps): JSX.Element {
  const blockIds = useStore((state) => findBlockList(state.project, blockId));
  const isShared = useIsShared(blockId);
  const moreItems = useBlockMenuItems(blockId);
  const index = blockIds === null ? -1 : blockIds.indexOf(blockId);
  const count = blockIds === null ? 0 : blockIds.length;
  const top = blockToolbarTop({ top: rect.top, bottom: rect.top + rect.height }, overlayHeight);
  const style: CSSProperties = {
    '--ve-toolbar-top': `${top}px`,
    '--ve-toolbar-right': `calc(100% - ${rect.left + rect.width}px)`,
  };

  return (
    <div className="ve-block-toolbar" role="toolbar" aria-label={`${name} actions`} style={style}>
      {!isShared && (
        <IconButton
          className="ve-block-handle"
          label="Drag to move"
          icon="grip"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragController.start({ kind: 'move', blockId, label: name }, event);
          }}
        />
      )}
      <IconButton
        label="Move up"
        icon="arrow-up"
        disabled={index <= 0}
        onClick={() => dispatch(moveBlockBy(blockId, -1))}
      />
      <IconButton
        label="Move down"
        icon="arrow-down"
        disabled={index === -1 || index >= count - 1}
        onClick={() => dispatch(moveBlockBy(blockId, 1))}
      />
      <IconButton label="Duplicate" icon="copy" onClick={() => dispatch(duplicateBlock(blockId))} />
      <IconButton label="Delete" icon="trash" onClick={() => dispatch(removeBlock(blockId))} />
      <MenuButton
        label="More actions"
        icon="ellipsis"
        className="ve-block-more"
        isLabelShown={false}
        items={moreItems}
      />
      <IconButton
        className="ve-compact-only"
        label={`Edit ${name}`}
        icon="pencil"
        onClick={() => dispatch(compactTabSelected('properties'))}
      />
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
  hiddenIds,
  modalIds,
  pageDevice,
}: OverlayProps): JSX.Element {
  const visibleHoverId = hoveredId === selectedId ? null : hoveredId;
  const hoverRect = useBlockRect(doc, visibleHoverId, scale);
  const selectedRect = useBlockRect(doc, selectedId, scale);
  const movingRect = useBlockRect(doc, movingId, scale);
  const hoverName = useBlockName(visibleHoverId);
  const selectedName = useBlockName(selectedId);
  const isHoverShared = useIsShared(visibleHoverId);
  const isSelectedShared = useIsShared(selectedId);
  const emptyRect = useElementRect(doc, isEmpty ? `#${PAGE_ROOT_ID}` : null, scale);

  return (
    <div className="ve-overlay">
      {isEmpty && emptyRect !== null && (
        <div className="ve-empty-area" style={boxStyle(emptyRect)}>
          <div className="ve-empty">
            <span className="ve-wide-only">Drag a block here to start</span>
            <span className="ve-compact-only">Add a block from the Blocks tab</span>
          </div>
        </div>
      )}
      {hiddenIds.map((blockId) => (
        <HiddenShade key={blockId} doc={doc} blockId={blockId} scale={scale} device={pageDevice} />
      ))}
      {modalIds.map((blockId) => (
        <ModalNote key={blockId} doc={doc} blockId={blockId} scale={scale} />
      ))}
      {visibleHoverId !== null && hoverRect !== null && (
        <div className="ve-outline ve-outline--hover" style={boxStyle(hoverRect)}>
          <span className="ve-outline-label">
            {hoverName}
            {isHoverShared && <SharedBadge />}
          </span>
        </div>
      )}
      {movingRect !== null && (
        <div className="ve-outline ve-outline--moving" style={boxStyle(movingRect)} />
      )}
      {selectedId !== null && selectedRect !== null && selectedName !== null && (
        <>
          <div className="ve-outline ve-outline--selected" style={boxStyle(selectedRect)}>
            {isSelectedShared && (
              <span className="ve-outline-label ve-outline-label--selected">
                <SharedBadge />
              </span>
            )}
          </div>
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
