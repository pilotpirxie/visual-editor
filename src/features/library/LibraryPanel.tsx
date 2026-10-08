import type { JSX, KeyboardEvent } from 'react';
import { libraryDrawerToggled, libraryTabChanged, type LibraryTab } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { BlocksTab } from './BlocksTab';
import { PagesTab } from '../pages/PagesTab';
import { LayersTab } from './LayersTab';
import { TabPanel, Tabs } from '../../../packages/ui/src';
import './library.css';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'blocks', label: 'Blocks' },
  { id: 'layers', label: 'Layers' },
  { id: 'pages', label: 'Pages' },
];

function closeDrawerOnEscape(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const shell = event.currentTarget.closest('.ve-shell');
  if (shell?.hasAttribute('data-library-drawer') !== true) return;
  event.preventDefault();
  event.stopPropagation();
  dispatch(libraryDrawerToggled(false));
  document.getElementById('ve-library-toggle')?.focus();
}

export function LibraryPanel(): JSX.Element {
  const activeTab = useStore((state) => state.editor.libraryTab);

  return (
    <aside
      id="ve-library"
      className="ve-panel ve-library"
      aria-label="Library"
      onKeyDown={closeDrawerOnEscape}
    >
      <Tabs
        label="Library"
        idPrefix="ve-library"
        className="ve-library-tabs"
        tabs={TABS}
        activeId={activeTab}
        onChange={(id) => {
          const tab = TABS.find((item) => item.id === id);
          if (tab !== undefined) dispatch(libraryTabChanged(tab.id));
        }}
      />
      <TabPanel idPrefix="ve-library" activeId={activeTab}>
        {activeTab === 'blocks' && <BlocksTab />}
        {activeTab === 'layers' && <LayersTab />}
        {activeTab === 'pages' && <PagesTab />}
      </TabPanel>
    </aside>
  );
}
