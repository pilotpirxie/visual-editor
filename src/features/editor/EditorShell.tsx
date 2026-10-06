import type { CSSProperties, JSX } from 'react';
import { useStore } from '../../app/store';
import { Canvas } from '../canvas/Canvas';
import { DragGhost } from '../canvas/DragGhost';
import { DesignSystemSheet } from '../design-system/DesignSystemSheet';
import { LibraryPanel } from '../library/LibraryPanel';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { CompactTabs } from './CompactTabs';
import { ResizeHandle } from './ResizeHandle';
import { Toolbar } from './Toolbar';
import './editor.css';

export function EditorShell(): JSX.Element {
  const { left, right } = useStore((state) => state.editor.panels);
  const compactView = useStore((state) => state.editor.compactView);
  const isDesignSheetOpen = useStore((state) => state.editor.isDesignSheetOpen);
  const isPreview = useStore((state) => state.editor.isPreview);
  const isLeftHidden = left.collapsed || isPreview;
  const isRightHidden = right.collapsed || isPreview;
  const panelWidths: CSSProperties = {
    '--ve-left-width': isLeftHidden ? '0px' : `${left.width}px`,
    '--ve-right-width': isRightHidden ? '0px' : `${right.width}px`,
  };

  return (
    <div
      className="ve-shell"
      style={panelWidths}
      data-compact-view={compactView}
      data-left-collapsed={isLeftHidden || undefined}
      data-right-collapsed={isRightHidden || undefined}
      data-preview={isPreview || undefined}
    >
      <Toolbar />
      <LibraryPanel />
      <ResizeHandle side="left" />
      <Canvas />
      <ResizeHandle side="right" />
      <PropertiesPanel />
      {isDesignSheetOpen && <DesignSystemSheet />}
      <CompactTabs />
      <DragGhost />
    </div>
  );
}
