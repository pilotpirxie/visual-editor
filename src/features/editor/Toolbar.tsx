import type { JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import {
  DEVICE_VIEWPORTS,
  designSheetToggled,
  deviceChanged,
  panelToggled,
  previewToggled,
  type DeviceMode,
  type PanelSide,
} from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { redo, undo } from '../../app/history';
import { followLink, HOME_PATH } from '../../app/router';
import { dispatch, store, useStore } from '../../app/store';
import type { Device } from '../../app/types';
import { registry } from '../../components/registry';
import type { SaveStatus } from '../../persistence/autosave';
import { buildExportFiles } from '../../render/exportSite';
import { downloadFiles } from '../export/downloadFiles';
import { PageSwitcher } from '../pages/PageSwitcher';
import { Icon } from './Icon';

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
};

const DEVICE_MODES: { id: DeviceMode; label: string; icon: string }[] = [
  { id: 'responsive', label: 'Responsive', icon: 'move-horizontal' },
  { id: 'desktop', label: 'Desktop', icon: 'monitor' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet' },
  { id: 'phone', label: 'Phone', icon: 'smartphone' },
];

const PANEL_TOGGLES: Record<PanelSide, { name: string; icon: string }> = {
  left: { name: 'library panel', icon: 'panel-left' },
  right: { name: 'properties panel', icon: 'panel-right' },
};

export function deviceReadout(device: Device): string {
  const { width, height } = DEVICE_VIEWPORTS[device];
  if (height === null) return `${width} px`;
  return `${width} × ${height}`;
}

async function exportSite(): Promise<void> {
  try {
    await downloadFiles(buildExportFiles(store.getState().project, registry, { core, behaviors }));
  } catch (error) {
    console.error('Export failed', error);
    window.alert(`Export failed: ${describeError(error)}`);
  }
}

function PanelToggle({ side }: { side: PanelSide }): JSX.Element {
  const isOpen = useStore((state) => !state.editor.panels[side].collapsed);
  const { name, icon } = PANEL_TOGGLES[side];
  const label = isOpen ? `Hide ${name}` : `Show ${name}`;
  return (
    <button
      type="button"
      className="ve-icon-button ve-wide-only"
      aria-label={label}
      title={label}
      aria-pressed={isOpen}
      onClick={() => dispatch(panelToggled(side))}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Toolbar(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const title = useStore((state) => state.project.settings.title);
  const saveStatus = useStore((state) => state.editor.saveStatus);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);
  const isDesignSheetOpen = useStore((state) => state.editor.isDesignSheetOpen);
  const isPreview = useStore((state) => state.editor.isPreview);

  return (
    <header className="ve-toolbar">
      <div className="ve-toolbar-group">
        <PanelToggle side="left" />
        <a
          className="ve-logo"
          href={HOME_PATH}
          onClick={followLink}
          title="My projects"
          aria-label="My projects"
        >
          <span className="ve-compact-only">
            <Icon name="house" />
          </span>
          <span className="ve-wide-only">Visual Editor</span>
        </a>
        <span className="ve-project-title">{title}</span>
        <span className="ve-save-status" data-status={saveStatus} role="status">
          {SAVE_STATUS_LABELS[saveStatus]}
        </span>
      </div>

      <div className="ve-toolbar-group ve-toolbar-center">
        <PageSwitcher />
        <div className="ve-toolbar-group" role="group" aria-label="Device">
          {DEVICE_MODES.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className="ve-device-button"
              aria-pressed={device === id}
              title={label}
              onClick={() => dispatch(deviceChanged(id))}
            >
              <Icon name={icon} />
              <span className="ve-device-label">{label}</span>
            </button>
          ))}
          {device !== 'responsive' && <span className="ve-readout">{deviceReadout(device)}</span>}
        </div>
      </div>

      <div className="ve-toolbar-group">
        <button
          type="button"
          className="ve-icon-button"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={() => dispatch(undo())}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="ve-icon-button"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={() => dispatch(redo())}
        >
          <Icon name="redo" />
        </button>
        <button
          type="button"
          className="ve-icon-button"
          aria-label="Design system"
          title="Design system"
          aria-pressed={isDesignSheetOpen}
          onClick={() => dispatch(designSheetToggled(!isDesignSheetOpen))}
        >
          <Icon name="palette" />
        </button>
        <button
          type="button"
          className="ve-button"
          aria-label={isPreview ? 'Exit preview' : 'Preview'}
          title={isPreview ? 'Exit preview (Esc)' : 'Preview'}
          onClick={() => dispatch(previewToggled(!isPreview))}
        >
          <Icon name={isPreview ? 'eye-off' : 'eye'} />
          <span className="ve-wide-only">{isPreview ? 'Exit preview' : 'Preview'}</span>
        </button>
        <button
          type="button"
          className="ve-button ve-button--primary"
          aria-label="Export"
          onClick={exportSite}
        >
          <Icon name="download" />
          <span className="ve-wide-only">Export</span>
        </button>
        <PanelToggle side="right" />
      </div>
    </header>
  );
}
