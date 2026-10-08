import {
  Suspense,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type JSX,
  type MouseEvent,
} from 'react';
import { LIBRARY_DRAWER_QUERY, libraryDrawerToggled } from '../../app/editorSlice';
import { ConvertToHtmlDialog, DesignSystemSheet } from '../../app/lazyDialogs';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { Canvas } from '../canvas/Canvas';
import { DragGhost } from '../canvas/DragGhost';
import { dragController } from '../canvas/dragController';
import { CANVAS_ID, focusCanvas } from '../canvas/frameDom';
import { useDiskAutosave } from '../files/diskAutosave';
import { LibraryPanel } from '../library/LibraryPanel';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { CompactTabs } from './CompactTabs';
import { EditorDialogs } from './EditorDialogs';
import { LiveAnnouncer } from './LiveAnnouncer';
import { PanelBoundary } from './PanelBoundary';
import { ResizeHandle } from './ResizeHandle';
import { PreviewButton, Toolbar } from './Toolbar';
import { useMediaQuery } from '../../../packages/ui/src';
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
const LIBRARY_ID = 've-library';

function skipToCanvas(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  focusCanvas();
}

function useDocumentTitle(pageName: string, projectTitle: string): void {
  useEffect(() => {
    document.title = `${pageName} · ${projectTitle} – ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [pageName, projectTitle]);
}

function isDragActive(): boolean {
  return dragController.getSnapshot() !== null;
}

function isFocusInLibraryOrLost(): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  return document.getElementById(LIBRARY_ID)?.contains(active) === true;
}

function useLibraryDrawerFocus(isOpen: boolean): void {
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current === isOpen) return;
    wasOpen.current = isOpen;
    if (isOpen) {
      document
        .querySelector<HTMLElement>(`#${LIBRARY_ID} [role="tab"][aria-selected="true"]`)
        ?.focus();
      return;
    }
    if (isFocusInLibraryOrLost()) focusCanvas();
  }, [isOpen]);
}

export function EditorShell(): JSX.Element {
  useDiskAutosave();
  useDocumentTitle(
    useStore((state) => selectCurrentPage(state).name),
    useStore((state) => state.project.settings.title),
  );
  const { left, right } = useStore((state) => state.editor.panels);
  const isDrawerMode = useMediaQuery(LIBRARY_DRAWER_QUERY);
  const isDrawerRequested = useStore((state) => state.editor.isLibraryDrawerOpen);
  const isDragging = useSyncExternalStore(dragController.subscribe, isDragActive);
  const compactView = useStore((state) => state.editor.compactView);
  const isDesignSheetOpen = useStore((state) => state.editor.isDesignSheetOpen);
  const isPreview = useStore((state) => state.editor.isPreview);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);
  const isLeftHidden = left.collapsed || isPreview;
  const isRightHidden = right.collapsed || isPreview;
  const isDrawerOpen = isDrawerMode && isDrawerRequested && !isPreview;
  useLibraryDrawerFocus(isDrawerOpen);
  const panelWidths: CSSProperties = {
    '--ve-left-width': isLeftHidden ? '0px' : `${left.width}px`,
    '--ve-right-width': isRightHidden ? '0px' : `${right.width}px`,
    '--ve-drawer-width': `${left.width}px`,
  };

  return (
    <div
      className="ve-shell"
      style={panelWidths}
      data-compact-view={compactView}
      data-left-collapsed={isLeftHidden || undefined}
      data-right-collapsed={isRightHidden || undefined}
      data-preview={isPreview || undefined}
      data-read-only={isReadOnly || undefined}
      data-library-drawer={isDrawerOpen || undefined}
      data-dragging={isDragging || undefined}
    >
      <a className="ve-skip-link" href={`#${CANVAS_ID}`} onClick={skipToCanvas}>
        Skip to canvas
      </a>
      <PanelBoundary name="toolbar" className="ve-toolbar">
        <Toolbar />
      </PanelBoundary>
      {isPreview && !isReadOnly && (
        <div className="ve-preview-exit">
          <PreviewButton isDisabled={false} />
        </div>
      )}
      <PanelBoundary name="library panel" className="ve-panel ve-library">
        <LibraryPanel />
      </PanelBoundary>
      <ResizeHandle side="left" />
      {isDrawerOpen && (
        <div
          className="ve-drawer-scrim"
          aria-hidden="true"
          onPointerDown={() => dispatch(libraryDrawerToggled(false))}
        />
      )}
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
