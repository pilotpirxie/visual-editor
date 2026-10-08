import { useMemo, useRef, useState, type JSX, type PointerEvent } from 'react';
import { blockSelected, pageSelectionForgotten, propertiesOpened } from '../../app/editorSlice';
import { homePageSet, pageMoved } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import type { Page, Project } from '../../app/types';
import { dragController, type DragPayload } from '../canvas/dragController';
import { dropEdgeAt, finalMoveIndex } from '../canvas/geometry';
import { useListDropTarget } from '../canvas/useListDropTarget';
import { DeletePageDialog } from './DeletePageDialog';
import { duplicatePage, openPage } from './pageActions';
import { PageDialog } from './PageDialog';
import './pages.css';
import { Button, Icon, MenuButton, type MenuItem } from '../../../packages/ui/src';

type DialogState =
  { kind: 'add' } | { kind: 'rename'; pageId: string } | { kind: 'delete'; pageId: string } | null;

type PageSummary = Pick<Page, 'id' | 'name' | 'slug'>;

type PageRow = { page: PageSummary; index: number; isHome: boolean; isCurrent: boolean };

export const PAGES_DRAG_OWNER = 'project:pages';

const DROP_EDGE_MARGIN = 12;

export function pageFileName(page: Pick<Page, 'id' | 'slug'>, homePageId: string): string {
  return page.id === homePageId ? 'index.html' : `${page.slug}.html`;
}

function openPageSettings(pageId: string, isCurrent: boolean): void {
  if (isCurrent) {
    dispatch(blockSelected(null));
  } else {
    dispatch(pageSelectionForgotten(pageId));
    dispatch(openPage(pageId));
  }
  dispatch(propertiesOpened());
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
  const isLastPage = pageCount <= 1;
  let deleteHint: string | undefined;
  if (isHome) {
    deleteHint = 'Set another page as home first';
  } else if (isLastPage) {
    deleteHint = 'A site needs at least one page';
  }

  const items: MenuItem[] = [
    {
      id: 'rename',
      label: 'Rename…',
      onSelect: () => onDialog({ kind: 'rename', pageId: page.id }),
    },
    { id: 'duplicate', label: 'Duplicate', onSelect: () => dispatch(duplicatePage(page.id)) },
    {
      id: 'home',
      label: 'Set as home page',
      disabled: isHome,
      onSelect: () => dispatch(homePageSet({ pageId: page.id })),
    },
    {
      id: 'settings',
      label: 'Page settings',
      onSelect: () => openPageSettings(page.id, isCurrent),
    },
    {
      id: 'up',
      label: 'Move up',
      disabled: index === 0,
      onSelect: () => dispatch(pageMoved({ pageId: page.id, toIndex: index - 1 })),
    },
    {
      id: 'down',
      label: 'Move down',
      disabled: index === pageCount - 1,
      onSelect: () => dispatch(pageMoved({ pageId: page.id, toIndex: index + 1 })),
    },
    {
      id: 'delete',
      label: 'Delete…',
      isDanger: true,
      disabled: deleteHint !== undefined,
      hint: deleteHint,
      onSelect: () => onDialog({ kind: 'delete', pageId: page.id }),
    },
  ];

  return (
    <span className="ve-page-actions" onPointerDown={(event) => event.stopPropagation()}>
      <MenuButton
        label={`More actions for ${page.name}`}
        icon="ellipsis"
        items={items}
        isLabelShown={false}
      />
    </span>
  );
}

function pageRowsOf(pages: Project['pages'], currentPageId: string): PageRow[] {
  const rows: PageRow[] = [];
  for (const [index, id] of pages.ids.entries()) {
    const page = pages.entities[id];
    if (page === undefined) continue;
    rows.push({
      page: { id, name: page.name, slug: page.slug },
      index,
      isHome: id === pages.homePageId,
      isCurrent: id === currentPageId,
    });
  }
  return rows;
}

function usePageRows(): PageRow[] {
  const rowsKey = useStore((state) =>
    JSON.stringify(pageRowsOf(state.project.pages, selectCurrentPage(state).id)),
  );
  return useMemo(() => {
    const rows: PageRow[] = JSON.parse(rowsKey);
    return rows;
  }, [rowsKey]);
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
      <Button icon="plus" className="ve-pages-add" onClick={() => setDialog({ kind: 'add' })}>
        Add page
      </Button>
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
