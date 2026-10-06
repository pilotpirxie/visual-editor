import { useState, type JSX, type MouseEvent } from 'react';
import { compactTabSelected, panelToggled } from '../../app/editorSlice';
import { dispatch, selectCurrentPage, store, useStore } from '../../app/store';
import type { Page } from '../../app/types';
import { Icon } from '../editor/Icon';
import { openPage } from './pageActions';
import { PageDialog } from './PageDialog';
import { pageFileName } from './PagesTab';
import './pages.css';

const SEARCH_FROM_PAGE_COUNT = 11;
const MENU_ID = 've-page-switcher-menu';

function closeMenu(event: MouseEvent<HTMLElement>): void {
  const menu = event.currentTarget.closest<HTMLElement>('[popover]');
  if (menu !== null && 'hidePopover' in menu && menu.matches(':popover-open')) menu.hidePopover();
}

function matchesQuery(page: Page, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (term === '') return true;
  return page.name.toLowerCase().includes(term) || page.slug.includes(term);
}

function managePages(): void {
  if (store.getState().editor.panels.left.collapsed) dispatch(panelToggled('left'));
  dispatch(compactTabSelected('pages'));
}

export function PageSwitcher(): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const currentPage = useStore(selectCurrentPage);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const hasSearch = pages.ids.length >= SEARCH_FROM_PAGE_COUNT;
  const shownPages: Page[] = [];
  for (const id of pages.ids) {
    const page = pages.entities[id];
    if (page !== undefined && (!hasSearch || matchesQuery(page, query))) shownPages.push(page);
  }

  return (
    <>
      <button
        type="button"
        className="ve-button ve-page-switcher"
        popoverTarget={MENU_ID}
        aria-label={`Page: ${currentPage.name}. Switch page`}
        title="Switch page"
      >
        <span className="ve-page-switcher-name">{currentPage.name}</span>
        <Icon name="chevron-down" />
      </button>
      <div id={MENU_ID} className="ve-menu ve-page-switcher-menu" popover="auto">
        {hasSearch && (
          <label className="ve-search">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Search pages"
              aria-label="Search pages"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        )}
        <ul className="ve-page-switcher-list" aria-label="Pages">
          {shownPages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                aria-current={page.id === currentPage.id ? 'page' : undefined}
                onClick={(event) => {
                  closeMenu(event);
                  dispatch(openPage(page.id));
                }}
              >
                <span>{page.name}</span>
                <span className="ve-page-file">{pageFileName(page, pages.homePageId)}</span>
              </button>
            </li>
          ))}
        </ul>
        {shownPages.length === 0 && <p className="ve-muted">No pages match “{query.trim()}”.</p>}
        <div className="ve-menu-separator" role="separator" />
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            setIsAdding(true);
          }}
        >
          <Icon name="plus" />
          Add page
        </button>
        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            managePages();
          }}
        >
          Manage pages
        </button>
      </div>
      {isAdding && <PageDialog pageId={null} onClose={() => setIsAdding(false)} />}
    </>
  );
}
