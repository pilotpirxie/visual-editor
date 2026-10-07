import type { JSX } from 'react';
import { libraryTabChanged, type LibraryTab } from '../../app/editorSlice';
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

export function LibraryPanel(): JSX.Element {
  const activeTab = useStore((state) => state.editor.libraryTab);

  return (
    <aside className="ve-panel ve-library" aria-label="Library">
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
