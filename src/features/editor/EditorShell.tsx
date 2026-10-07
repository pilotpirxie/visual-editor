import { Suspense, useEffect, type CSSProperties, type JSX, type MouseEvent } from 'react';
import { ConvertToHtmlDialog, DesignSystemSheet } from '../../app/lazyDialogs';
import { useStore } from '../../app/store';
import { Canvas } from '../canvas/Canvas';
import { DragGhost } from '../canvas/DragGhost';
import { useDiskAutosave } from '../files/diskAutosave';
import { LibraryPanel } from '../library/LibraryPanel';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { CompactTabs } from './CompactTabs';
import { EditorDialogs } from './EditorDialogs';
import { LiveAnnouncer } from './LiveAnnouncer';
import { PanelBoundary } from './PanelBoundary';
import { ResizeHandle } from './ResizeHandle';
import { Toolbar } from './Toolbar';
import './editor.css';

function ConversionHost(): JSX.Element | null {
  const blockId = useStore((state) => state.editor.conversionBlockId);
  if (blockId === null) return null;
  return (
    <Suspense fallback={null}>
      <ConvertToHtmlDialog key={blockId} blockId={blockId} />
    </Suspense>
  );
}

const APP_NAME = 'Visual Editor';
const CANVAS_ID = 've-canvas';

function skipToCanvas(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  document.getElementById(CANVAS_ID)?.focus();
}

function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} – ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}

export function EditorShell(): JSX.Element {
  useDiskAutosave();
  useDocumentTitle(useStore((state) => state.project.settings.title));
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
      <a className="ve-skip-link" href={`#${CANVAS_ID}`} onClick={skipToCanvas}>
        Skip to canvas
      </a>
      <Toolbar />
      <PanelBoundary name="library panel" className="ve-panel ve-library">
        <LibraryPanel />
      </PanelBoundary>
      <ResizeHandle side="left" />
      <PanelBoundary name="canvas" className="ve-canvas">
        <Canvas />
      </PanelBoundary>
      <ResizeHandle side="right" />
      <PanelBoundary name="properties panel" className="ve-panel ve-properties">
        <PropertiesPanel />
      </PanelBoundary>
      {isDesignSheetOpen && (
        <PanelBoundary name="design system panel" className="ve-design-sheet">
          <Suspense fallback={null}>
            <DesignSystemSheet />
          </Suspense>
        </PanelBoundary>
      )}
      <CompactTabs />
      <DragGhost />
      <LiveAnnouncer />
      <PanelBoundary name="dialog">
        <ConversionHost />
        <EditorDialogs />
      </PanelBoundary>
    </div>
  );
}
