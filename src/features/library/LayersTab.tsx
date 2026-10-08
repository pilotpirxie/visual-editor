import { useRef, useState, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import { blockSelected } from '../../app/editorSlice';
import { blockDisabledSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, selectShownSlot, useStore } from '../../app/store';
import type { Block } from '../../app/types';
import { blockLabel, type DefinitionSource } from '../../components/registry';
import { dragController } from '../canvas/dragController';
import { dropEdgeAt } from '../canvas/geometry';
import { useListDropTarget } from '../canvas/useListDropTarget';
import { dropBlock, isNoopDrop } from '../editor/blockActions';
import { BlockContextMenu } from '../editor/BlockContextMenu';
import { useBlockMenuItems } from '../editor/blockMenu';
import { useSection } from '../editor/useSection';
import {
  afterPointerRelease,
  focusNeighbour,
  Icon,
  IconButton,
  MenuButton,
  Section,
} from '../../../packages/ui/src';

const DROP_EDGE_MARGIN = 12;
const MENU_OFFSET_X = 16;
const ROW_NAME_SELECTOR = '.ve-layer-name';

type LayerRow = { id: string; name: string; isDisabled: boolean };

type LayerGroupProps = { label: string; blockIds: string[] };

type LayerMenu = { blockId: string; point: { x: number; y: number } };

function layerName(block: Block | undefined, blockId: string, project: DefinitionSource): string {
  if (block === undefined) return `Missing block: ${blockId}`;
  return blockLabel(block, project);
}

function useLayerRows(blockIds: string[]): LayerRow[] {
  const blocks = useStore((state) => state.project.blocks.entities);
  const packBlocks = useStore((state) => state.project.packBlocks);
  const rows: LayerRow[] = [];
  for (const id of blockIds) {
    const block = blocks[id];
    const name = layerName(block, id, { packBlocks });
    rows.push({ id, name, isDisabled: block?.disabled === true });
  }
  return rows;
}

function LayerMenuButton({ row, tabIndex }: { row: LayerRow; tabIndex: number }): JSX.Element {
  const items = useBlockMenuItems(row.id);
  return (
    <MenuButton
      label={`More actions for ${row.name}`}
      icon="ellipsis"
      items={items}
      isLabelShown={false}
      tabIndex={tabIndex}
    />
  );
}

function isPlainKey(event: KeyboardEvent): boolean {
  return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function isMenuKey(event: KeyboardEvent): boolean {
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');
}

function activeRowIdOf(
  rows: LayerRow[],
  focusedId: string | null,
  selectedId: string | null,
): string | null {
  if (rows.some((row) => row.id === focusedId)) return focusedId;
  if (rows.some((row) => row.id === selectedId)) return selectedId;
  return rows[0]?.id ?? null;
}

function LayerGroup({ label, blockIds }: LayerGroupProps): JSX.Element {
  const rows = useLayerRows(blockIds);
  const selectedId = useStore((state) => state.editor.selectedBlockId);
  const [menu, setMenu] = useState<LayerMenu | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const activeRowId = activeRowIdOf(rows, focusedRowId, selectedId);
  const listRef = useRef<HTMLOListElement>(null);
  const dropIndex = useListDropTarget({
    listRef,
    edgeMargin: DROP_EDGE_MARGIN,
    accepts: (payload) => payload.kind === 'move' && blockIds.includes(payload.blockId),
    isNoopDrop: (payload, index) => isNoopDrop(blockIds, payload, index),
    drop: (payload, index) => dispatch(dropBlock(payload, index)),
  });

  function startRowDrag(event: PointerEvent<HTMLElement>, row: LayerRow): void {
    if (event.pointerType === 'touch') return;
    dragController.start({ kind: 'move', blockId: row.id, label: row.name }, event);
  }

  function startGripDrag(event: PointerEvent<HTMLElement>, row: LayerRow): void {
    dragController.start({ kind: 'move', blockId: row.id, label: row.name }, event);
  }

  function moveBetweenRows(event: KeyboardEvent<HTMLOListElement>): void {
    if (!isPlainKey(event) || !(event.target instanceof HTMLElement)) return;
    if (!event.target.matches(ROW_NAME_SELECTOR)) return;
    focusNeighbour(event, ROW_NAME_SELECTOR, 'vertical');
  }

  function openMenuFromKeyboard(event: KeyboardEvent<HTMLLIElement>, row: LayerRow): void {
    if (!isMenuKey(event)) return;
    event.preventDefault();
    dispatch(blockSelected(row.id));
    const box = event.currentTarget.getBoundingClientRect();
    setMenu({ blockId: row.id, point: { x: box.left + MENU_OFFSET_X, y: box.bottom } });
  }

  return (
    <>
      <ol className="ve-layers" ref={listRef} aria-label={label} onKeyDown={moveBetweenRows}>
        {rows.map((row, index) => (
          <li
            onKeyDown={(event) => openMenuFromKeyboard(event, row)}
            key={row.id}
            className="ve-layer"
            data-selected={row.id === selectedId || undefined}
            data-disabled={row.isDisabled || undefined}
            data-drop={dropEdgeAt(dropIndex, index, rows.length) ?? undefined}
            onPointerDown={(event) => startRowDrag(event, row)}
            onContextMenu={(event) => {
              event.preventDefault();
              dispatch(blockSelected(row.id));
              const point = { x: event.clientX, y: event.clientY };
              afterPointerRelease(event, () => setMenu({ blockId: row.id, point }));
            }}
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
              tabIndex={row.id === activeRowId ? 0 : -1}
              onFocus={() => setFocusedRowId(row.id)}
              onClick={() => dispatch(blockSelected(row.id))}
            >
              <span>{row.name}</span>
            </button>
            <span className="ve-layer-actions" onPointerDown={(event) => event.stopPropagation()}>
              <IconButton
                label={row.isDisabled ? `Enable ${row.name}` : `Disable ${row.name}`}
                icon={row.isDisabled ? 'eye-off' : 'eye'}
                tabIndex={row.id === activeRowId ? 0 : -1}
                onClick={() =>
                  dispatch(blockDisabledSet({ blockId: row.id, disabled: !row.isDisabled }))
                }
              />
              <LayerMenuButton row={row} tabIndex={row.id === activeRowId ? 0 : -1} />
            </span>
          </li>
        ))}
      </ol>
      {menu !== null && (
        <BlockContextMenu blockId={menu.blockId} point={menu.point} onClose={() => setMenu(null)} />
      )}
    </>
  );
}

function LayerSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: JSX.Element;
}): JSX.Element {
  const section = useSection(`layers:${id}`);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

function SharedGroup({
  id,
  label,
  blockIds,
}: LayerGroupProps & { id: string }): JSX.Element | null {
  if (blockIds.length === 0) return null;
  return (
    <LayerSection id={id} title={label}>
      <LayerGroup label={label} blockIds={blockIds} />
    </LayerSection>
  );
}

export function LayersTab(): JSX.Element {
  const headerIds = useStore((state) => selectShownSlot(state, 'header'));
  const pageBlockIds = useStore((state) => selectCurrentPage(state).blockIds);
  const footerIds = useStore((state) => selectShownSlot(state, 'footer'));
  const hasSharedBlocks = headerIds.length > 0 || footerIds.length > 0;
  const pageGroup =
    pageBlockIds.length === 0 ? (
      <p className="ui-muted ve-layers-empty">This page has no blocks yet.</p>
    ) : (
      <LayerGroup label="Blocks on this page" blockIds={pageBlockIds} />
    );

  if (!hasSharedBlocks) return pageGroup;

  return (
    <div className="ve-layer-groups">
      <SharedGroup id="header" label="Shared header" blockIds={headerIds} />
      <LayerSection id="page" title="This page">
        {pageGroup}
      </LayerSection>
      <SharedGroup id="footer" label="Shared footer" blockIds={footerIds} />
    </div>
  );
}
