import type { JSX } from 'react';
import { libraryTabChanged, type LibraryTab } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { BlocksTab } from './BlocksTab';
import { PagesTab } from '../pages/PagesTab';
import { LayersTab } from './LayersTab';
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
      <div className="ve-tabs" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ve-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls="ve-library-panel"
            onClick={() => dispatch(libraryTabChanged(id))}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="ve-tab-panel"
        role="tabpanel"
        id="ve-library-panel"
        aria-labelledby={`ve-tab-${activeTab}`}
      >
        {activeTab === 'blocks' && <BlocksTab />}
        {activeTab === 'layers' && <LayersTab />}
        {activeTab === 'pages' && <PagesTab />}
      </div>
    </aside>
  );
}
