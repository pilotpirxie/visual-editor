import { useRef, type JSX, type PointerEvent } from 'react';
import { blockSelected } from '../../app/editorSlice';
import { blockDisabledSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import type { Block } from '../../app/types';
import { registry } from '../../components/registry';
import { dragController } from '../canvas/dragController';
import { dropEdgeAt } from '../canvas/geometry';
import { useListDropTarget } from '../canvas/useListDropTarget';
import { dropBlock, isNoopDrop } from '../editor/blockActions';
import { Icon } from '../editor/Icon';

const DROP_EDGE_MARGIN = 12;

type LayerRow = { id: string; name: string; isDisabled: boolean };

function layerName(block: Block | undefined, blockId: string): string {
  if (block === undefined) return `Missing block: ${blockId}`;
  const component = registry.get(block.componentId);
  if (component === undefined) return `Missing: ${block.componentId}`;
  return component.definition.name;
}

function useLayerRows(): LayerRow[] {
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const blocks = useStore((state) => state.project.blocks.entities);
  const rows: LayerRow[] = [];
  for (const id of blockIds) {
    const block = blocks[id];
    rows.push({ id, name: layerName(block, id), isDisabled: block?.disabled === true });
  }
  return rows;
}

export function LayersTab(): JSX.Element {
  const rows = useLayerRows();
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const listRef = useRef<HTMLOListElement>(null);
  const dropIndex = useListDropTarget({
    listRef,
    edgeMargin: DROP_EDGE_MARGIN,
    accepts: (payload) => payload.kind === 'move',
    isNoopDrop: (payload, index) => isNoopDrop(blockIds, payload, index),
    drop: (payload, index) => dispatch(dropBlock(payload, index)),
  });

  if (rows.length === 0) {
    return <p className="ve-muted ve-layers-empty">This page has no blocks yet.</p>;
  }

  function startRowDrag(event: PointerEvent<HTMLElement>, row: LayerRow): void {
    if (event.pointerType === 'touch') return;
    dragController.start({ kind: 'move', blockId: row.id, label: row.name }, event);
  }

  function startGripDrag(event: PointerEvent<HTMLElement>, row: LayerRow): void {
    dragController.start({ kind: 'move', blockId: row.id, label: row.name }, event);
  }

  return (
    <ol className="ve-layers" ref={listRef} aria-label="Blocks on this page">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="ve-layer"
          data-selected={row.id === selectedId || undefined}
          data-disabled={row.isDisabled || undefined}
          data-drop={dropEdgeAt(dropIndex, index, rows.length) ?? undefined}
          onPointerDown={(event) => startRowDrag(event, row)}
        >
          <span
            className="ve-layer-grip"
            aria-hidden="true"
            onPointerDown={(event) => startGripDrag(event, row)}
          >
            <Icon name="grip" />
          </span>
          <button
            type="button"
            className="ve-layer-name"
            aria-current={row.id === selectedId ? 'true' : undefined}
            onClick={() => dispatch(blockSelected(row.id))}
          >
            <span>{row.name}</span>
          </button>
          <button
            type="button"
            className="ve-icon-button"
            aria-label={row.isDisabled ? `Enable ${row.name}` : `Disable ${row.name}`}
            title={row.isDisabled ? 'Enable block' : 'Disable block'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() =>
              dispatch(blockDisabledSet({ blockId: row.id, disabled: !row.isDisabled }))
            }
          >
            <Icon name={row.isDisabled ? 'eye-off' : 'eye'} />
          </button>
        </li>
      ))}
    </ol>
  );
}
