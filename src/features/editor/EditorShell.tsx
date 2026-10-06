import type { CSSProperties, JSX } from 'react';
import { useStore } from '../../app/store';
import { Canvas } from '../canvas/Canvas';
import { DragGhost } from '../canvas/DragGhost';
import { LibraryPanel } from '../library/LibraryPanel';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { CompactTabs } from './CompactTabs';
import { ResizeHandle } from './ResizeHandle';
import { Toolbar } from './Toolbar';
import './editor.css';

export function EditorShell(): JSX.Element {
  const { left, right } = useStore((state) => state.editor.panels);
  const compactView = useStore((state) => state.editor.compactView);
  const panelWidths: CSSProperties = {
    '--ve-left-width': left.collapsed ? '0px' : `${left.width}px`,
    '--ve-right-width': right.collapsed ? '0px' : `${right.width}px`,
  };

  return (
    <div
      className="ve-shell"
      style={panelWidths}
      data-compact-view={compactView}
      data-left-collapsed={left.collapsed || undefined}
      data-right-collapsed={right.collapsed || undefined}
    >
      <Toolbar />
      <LibraryPanel />
      <ResizeHandle side="left" />
      <Canvas />
      <ResizeHandle side="right" />
      <PropertiesPanel />
      <CompactTabs />
      <DragGhost />
    </div>
  );
}
