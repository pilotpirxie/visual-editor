import { useEffect, useRef, useState, type JSX } from 'react';
import { blockSelected } from '../../app/editorSlice';
import { blockDisabledSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { dragController } from '../canvas/dragController';
import { dropIndexFromSpans } from '../canvas/dropIndex';
import { dropOnCurrentPage, isNoopDrop } from '../editor/blockActions';
import { Icon } from '../editor/Icon';

const DROP_MARGIN = 12;

export function LayersTab(): JSX.Element {
  const blockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const blocks = useStore((state) => state.project.blocks.entities);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const listRef = useRef<HTMLOListElement>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(
    () =>
      dragController.registerTarget({
        accepts: (payload) => payload.kind === 'move',
        resolve(point) {
          const list = listRef.current;
          if (!list) return null;
          const box = list.getBoundingClientRect();
          const isOver =
            point.x >= box.left &&
            point.x <= box.right &&
            point.y >= box.top - DROP_MARGIN &&
            point.y <= box.bottom + DROP_MARGIN;
          if (!isOver) return null;
          const rows = [...list.children].map((row) => row.getBoundingClientRect());
          return dropIndexFromSpans(rows, point.y);
        },
        showIndicator: (index, payload) =>
          setDropIndex(index === null || isNoopDrop(payload, index) ? null : index),
        drop: dropOnCurrentPage,
      }),
    [],
  );

  if (blockIds.length === 0) {
    return <p className="ve-muted ve-layers-empty">This page has no blocks yet.</p>;
  }

  return (
    <ol className="ve-layers" ref={listRef} aria-label="Blocks on this page">
      {blockIds.map((id, index) => {
        const block = blocks[id];
        const name =
          registry.get(block.componentId)?.definition.name ?? `Missing: ${block.componentId}`;
        const isLast = index === blockIds.length - 1;
        let dropEdge: 'before' | 'after' | undefined;
        if (dropIndex === index) {
          dropEdge = 'before';
        } else if (dropIndex === blockIds.length && isLast) {
          dropEdge = 'after';
        }
        return (
          <li
            key={id}
            className="ve-layer"
            data-selected={id === selectedId || undefined}
            data-disabled={block.disabled || undefined}
            data-drop={dropEdge}
            onPointerDown={(event) =>
              dragController.start({ kind: 'move', blockId: id, label: name }, event)
            }
          >
            <button
              type="button"
              className="ve-layer-name"
              aria-current={id === selectedId ? 'true' : undefined}
              onClick={() => dispatch(blockSelected(id))}
            >
              <Icon name="grip" />
              <span>{name}</span>
            </button>
            <button
              type="button"
              className="ve-icon-button"
              aria-label={block.disabled ? `Enable ${name}` : `Disable ${name}`}
              title={block.disabled ? 'Enable block' : 'Disable block'}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => dispatch(blockDisabledSet({ blockId: id, disabled: !block.disabled }))}
            >
              <Icon name={block.disabled ? 'eye-off' : 'eye'} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
