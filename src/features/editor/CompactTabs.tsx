import type { JSX } from 'react';
import { compactTabSelected, selectCompactTab, type CompactTab } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { Button, Icon } from '../../../packages/ui/src';

const TABS: { id: CompactTab; label: string; icon: string }[] = [
  { id: 'canvas', label: 'Canvas', icon: 'app-window' },
  { id: 'blocks', label: 'Blocks', icon: 'layout-grid' },
  { id: 'layers', label: 'Layers', icon: 'layers' },
  { id: 'pages', label: 'Pages', icon: 'file' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function CompactTabs(): JSX.Element {
  const activeTab = useStore((state) => selectCompactTab(state.editor));
  const isReadOnly = useStore((state) => state.editor.isReadOnly);

  return (
    <nav className="ve-compact-tabs" aria-label="Editor views">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="ve-compact-tab"
          aria-current={activeTab === id ? 'page' : undefined}
          disabled={isReadOnly && id === 'settings'}
          onClick={() => dispatch(compactTabSelected(id))}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function BackToCanvasButton(): JSX.Element {
  return (
    <Button
      className="ve-compact-only ve-panel-done"
      variant="ghost"
      onClick={() => dispatch(compactTabSelected('canvas'))}
    >
      Done
    </Button>
  );
}
