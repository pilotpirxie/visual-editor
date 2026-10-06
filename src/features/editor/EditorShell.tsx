import type { JSX } from 'react';
import { useStore } from '../../app/store';
import { Canvas } from '../canvas/Canvas';
import { DragGhost } from '../canvas/DragGhost';
import { LibraryPanel } from '../library/LibraryPanel';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { ResizeHandle } from './ResizeHandle';
import { Toolbar } from './Toolbar';
import './editor.css';

export function EditorShell(): JSX.Element {
  const { left, right } = useStore((state) => state.editor.panels);
  const leftWidth = left.collapsed ? 0 : left.width;
  const rightWidth = right.collapsed ? 0 : right.width;
  const gridTemplateColumns = `${leftWidth}px 0 minmax(0, 1fr) 0 ${rightWidth}px`;

  return (
    <div className="ve-shell" style={{ gridTemplateColumns }}>
      <Toolbar />
      {!left.collapsed && (
        <>
          <LibraryPanel />
          <ResizeHandle side="left" />
        </>
      )}
      <Canvas />
      {!right.collapsed && (
        <>
          <ResizeHandle side="right" />
          <PropertiesPanel />
        </>
      )}
      <DragGhost />
    </div>
  );
}
