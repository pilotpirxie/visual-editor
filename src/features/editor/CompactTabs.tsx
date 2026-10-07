import type { JSX } from 'react';
import { compactTabSelected, selectCompactTab, type CompactTab } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { Icon } from '../../../packages/ui/src';

const TABS: { id: CompactTab; label: string; icon: string }[] = [
  { id: 'blocks', label: 'Blocks', icon: 'layout-grid' },
  { id: 'pages', label: 'Pages', icon: 'file' },
  { id: 'layers', label: 'Layers', icon: 'layers' },
  { id: 'canvas', label: 'Canvas', icon: 'app-window' },
  { id: 'properties', label: 'Properties', icon: 'sliders-horizontal' },
];

export function CompactTabs(): JSX.Element {
  const activeTab = useStore((state) => selectCompactTab(state.editor));

  return (
    <nav className="ve-compact-tabs" aria-label="Editor views">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="ve-compact-tab"
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => dispatch(compactTabSelected(id))}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
