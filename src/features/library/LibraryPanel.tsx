import { Suspense, type JSX, type KeyboardEvent } from 'react';
import {
  LIBRARY_DRAWER_QUERY,
  libraryDrawerToggled,
  libraryRailClicked,
  type LibraryTab,
} from '../../app/editorSlice';
import { ProjectSettingsPanel } from '../../app/lazyDialogs';
import { dispatch, useStore } from '../../app/store';
import { BlocksTab } from './BlocksTab';
import { PagesTab } from '../pages/PagesTab';
import { LayersTab } from './LayersTab';
import { TabPanel, Tabs, useMediaQuery } from '../../../packages/ui/src';
import './library.css';

const ID_PREFIX = 've-library';

const TABS: { id: LibraryTab; label: string; icon: string }[] = [
  { id: 'blocks', label: 'Blocks', icon: 'layout-grid' },
  { id: 'layers', label: 'Layers', icon: 'layers' },
  { id: 'pages', label: 'Pages', icon: 'file' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function closeDrawerOnEscape(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const shell = event.currentTarget.closest('.ve-shell');
  if (shell?.hasAttribute('data-library-drawer') !== true) return;
  event.preventDefault();
  event.stopPropagation();
  dispatch(libraryDrawerToggled(false));
  event.currentTarget.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
}

export function LibraryPanel(): JSX.Element {
  const activeTab = useStore((state) => state.editor.libraryTab);
  const isDrawer = useMediaQuery(LIBRARY_DRAWER_QUERY);
  const isDrawerOpen = useStore((state) => state.editor.isLibraryDrawerOpen);
  const isCollapsed = useStore((state) => state.editor.panels.left.collapsed);
  const isOpen = isDrawer ? isDrawerOpen : !isCollapsed;

  return (
    <aside
      id={ID_PREFIX}
      className="ve-panel ve-library"
      aria-label="Library"
      data-open={isOpen || undefined}
      onKeyDown={closeDrawerOnEscape}
    >
      <Tabs
        label="Library"
        idPrefix={ID_PREFIX}
        className="ve-library-tabs"
        orientation="vertical"
        tabs={TABS}
        activeId={activeTab}
        onChange={(id) => {
          const tab = TABS.find((item) => item.id === id);
          if (tab !== undefined) dispatch(libraryRailClicked({ tab: tab.id, isDrawer }));
        }}
      />
      <TabPanel idPrefix={ID_PREFIX} activeId={activeTab} className="ve-library-content">
        {activeTab === 'blocks' && <BlocksTab />}
        {activeTab === 'layers' && <LayersTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'settings' && (
          <Suspense fallback={null}>
            <ProjectSettingsPanel />
          </Suspense>
        )}
      </TabPanel>
    </aside>
  );
}
