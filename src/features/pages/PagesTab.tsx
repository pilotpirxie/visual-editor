import { useRef, useState, type JSX, type MouseEvent, type PointerEvent } from 'react';
import { blockSelected, compactTabSelected, pageSelectionForgotten } from '../../app/editorSlice';
import { homePageSet, pageMoved } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import type { Page } from '../../app/types';
import { dragController, type DragPayload } from '../canvas/dragController';
import { dropEdgeAt, finalMoveIndex } from '../canvas/geometry';
import { useListDropTarget } from '../canvas/useListDropTarget';
import { Icon } from '../editor/Icon';
import { closeOwningPopover } from '../editor/Menu';
import { DeletePageDialog } from './DeletePageDialog';
import { duplicatePage, openPage } from './pageActions';
import { PageDialog } from './PageDialog';
import './pages.css';

type DialogState =
  { kind: 'add' } | { kind: 'rename'; pageId: string } | { kind: 'delete'; pageId: string } | null;

type PageRow = { page: Page; index: number; isHome: boolean; isCurrent: boolean };

export const PAGES_DRAG_OWNER = 'project:pages';

const DROP_EDGE_MARGIN = 12;

export function pageFileName(page: Page, homePageId: string): string {
  return page.id === homePageId ? 'index.html' : `${page.slug}.html`;
}

function openPageSettings(pageId: string, isCurrent: boolean): void {
  if (isCurrent) {
    dispatch(blockSelected(null));
  } else {
    dispatch(pageSelectionForgotten(pageId));
    dispatch(openPage(pageId));
  }
  dispatch(compactTabSelected('properties'));
}

function isOwnPage(payload: DragPayload): boolean {
  return payload.kind === 'list-item' && payload.ownerKey === PAGES_DRAG_OWNER;
}

function PageMenu({
  row,
  pageCount,
  onDialog,
}: {
  row: PageRow;
  pageCount: number;
  onDialog(dialog: DialogState): void;
}): JSX.Element {
  const { page, index, isHome, isCurrent } = row;
  const menuId = `ve-page-menu-${page.id}`;
  const isLastPage = pageCount <= 1;
  let deleteHint: string | undefined;
  if (isHome) {
    deleteHint = 'Set another page as home first';
  } else if (isLastPage) {
    deleteHint = 'A site needs at least one page';
  }

  function act(event: MouseEvent<HTMLButtonElement>, action: () => void): void {
    closeOwningPopover(event.currentTarget);
    action();
  }

  return (
    <>
      <button
        type="button"
        className="ve-icon-button"
        popoverTarget={menuId}
        aria-label={`More actions for ${page.name}`}
        title="More actions"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Icon name="ellipsis" />
      </button>
      <div id={menuId} className="ve-menu" popover="auto">
        <button
          type="button"
          onClick={(event) => act(event, () => onDialog({ kind: 'rename', pageId: page.id }))}
        >
          Rename…
        </button>
        <button
          type="button"
          onClick={(event) => act(event, () => dispatch(duplicatePage(page.id)))}
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={isHome}
          onClick={(event) => act(event, () => dispatch(homePageSet({ pageId: page.id })))}
        >
          Set as home page
        </button>
        <button
          type="button"
          onClick={(event) => act(event, () => openPageSettings(page.id, isCurrent))}
        >
          Page settings
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={(event) =>
            act(event, () => dispatch(pageMoved({ pageId: page.id, toIndex: index - 1 })))
          }
        >
          Move up
        </button>
        <button
          type="button"
          disabled={index === pageCount - 1}
          onClick={(event) =>
            act(event, () => dispatch(pageMoved({ pageId: page.id, toIndex: index + 1 })))
          }
        >
          Move down
        </button>
        <button
          type="button"
          className="ve-menu-danger"
          disabled={deleteHint !== undefined}
          title={deleteHint}
          onClick={(event) => act(event, () => onDialog({ kind: 'delete', pageId: page.id }))}
        >
          Delete…
        </button>
      </div>
    </>
  );
}

function usePageRows(): PageRow[] {
  const pages = useStore((state) => state.project.pages);
  const currentPageId = useStore((state) => selectCurrentPage(state).id);
  const rows: PageRow[] = [];
  for (const [index, id] of pages.ids.entries()) {
    const page = pages.entities[id];
    if (page === undefined) continue;
    rows.push({ page, index, isHome: id === pages.homePageId, isCurrent: id === currentPageId });
  }
  return rows;
}

export function PagesTab(): JSX.Element {
  const rows = usePageRows();
  const homePageId = useStore((state) => state.project.pages.homePageId);
  const pageIds = useStore((state) => state.project.pages.ids);
  const [dialog, setDialog] = useState<DialogState>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const dropIndex = useListDropTarget({
    listRef,
    edgeMargin: DROP_EDGE_MARGIN,
    accepts: isOwnPage,
    isNoopDrop(payload, index) {
      if (payload.kind !== 'list-item') return true;
      return finalMoveIndex(payload.index, index) === payload.index;
    },
    drop(payload, index) {
      if (payload.kind !== 'list-item') return;
      const pageId = pageIds[payload.index];
      if (pageId === undefined) return;
      dispatch(pageMoved({ pageId, toIndex: finalMoveIndex(payload.index, index) }));
    },
  });

  function startDrag(event: PointerEvent<HTMLElement>, row: PageRow, isGrip: boolean): void {
    if (!isGrip && event.pointerType === 'touch') return;
    if (isGrip) event.stopPropagation();
    dragController.start(
      { kind: 'list-item', ownerKey: PAGES_DRAG_OWNER, index: row.index, label: row.page.name },
      event,
    );
  }

  return (
    <div className="ve-pages">
      <button
        type="button"
        className="ve-button ve-button--outline ve-pages-add"
        onClick={() => setDialog({ kind: 'add' })}
      >
        <Icon name="plus" />
        Add page
      </button>
      <ol className="ve-layers" ref={listRef} aria-label="Pages">
        {rows.map((row) => (
          <li
            key={row.page.id}
            className="ve-layer ve-page-row"
            data-selected={row.isCurrent || undefined}
            data-drop={dropEdgeAt(dropIndex, row.index, rows.length) ?? undefined}
            onPointerDown={(event) => startDrag(event, row, false)}
          >
            <span
              className="ve-layer-grip"
              aria-hidden="true"
              onPointerDown={(event) => startDrag(event, row, true)}
            >
              <Icon name="grip" />
            </span>
            <button
              type="button"
              className="ve-layer-name ve-page-name"
              aria-current={row.isCurrent ? 'page' : undefined}
              onClick={() => dispatch(openPage(row.page.id))}
            >
              <span>{row.page.name}</span>
              <span className="ve-page-file">{pageFileName(row.page, homePageId)}</span>
            </button>
            {row.isHome && (
              <span className="ve-page-home" title="Home page">
                <Icon name="house" />
                <span className="ve-visually-hidden">Home page</span>
              </span>
            )}
            <PageMenu row={row} pageCount={rows.length} onDialog={setDialog} />
          </li>
        ))}
      </ol>
      {dialog?.kind === 'add' && <PageDialog pageId={null} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'rename' && (
        <PageDialog pageId={dialog.pageId} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeletePageDialog pageId={dialog.pageId} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
