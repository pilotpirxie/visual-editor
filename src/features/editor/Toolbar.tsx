import type { JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import { DEVICE_WIDTHS, deviceChanged, panelToggled, type Device } from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { followLink, HOME_PATH } from '../../app/router';
import { dispatch, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { buildExportFiles } from '../../render/exportSite';
import type { SaveStatus } from '../../persistence/autosave';
import { downloadFiles } from '../export/downloadFiles';
import { Icon } from './Icon';

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
};

const DEVICES: { id: Device; label: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: 'monitor' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet' },
  { id: 'phone', label: 'Phone', icon: 'smartphone' },
];

async function exportSite(): Promise<void> {
  try {
    await downloadFiles(buildExportFiles(store.getState().project, registry, { core, behaviors }));
  } catch (error) {
    console.error('Export failed', error);
    window.alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function Toolbar(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const title = useStore((state) => state.project.settings.title);
  const saveStatus = useStore((state) => state.editor.saveStatus);
  const isLeftOpen = useStore((state) => !state.editor.panels.left.collapsed);
  const isRightOpen = useStore((state) => !state.editor.panels.right.collapsed);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);

  return (
    <header className="ve-toolbar">
      <div className="ve-toolbar-group">
        <button
          type="button"
          className="ve-icon-button"
          aria-label={isLeftOpen ? 'Hide library panel' : 'Show library panel'}
          title={isLeftOpen ? 'Hide library panel' : 'Show library panel'}
          aria-pressed={isLeftOpen}
          onClick={() => dispatch(panelToggled('left'))}
        >
          <Icon name="panel-left" />
        </button>
        <a className="ve-logo" href={HOME_PATH} onClick={followLink} title="My projects">
          Visual Editor
        </a>
        <span className="ve-project-title">{title}</span>
        <span className="ve-save-status" data-status={saveStatus} role="status">
          {SAVE_STATUS_LABELS[saveStatus]}
        </span>
      </div>

      <div className="ve-toolbar-group" role="group" aria-label="Device">
        {DEVICES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className="ve-device-button"
            aria-pressed={device === id}
            onClick={() => dispatch(deviceChanged(id))}
          >
            <Icon name={icon} />
            {label}
          </button>
        ))}
        <span className="ve-readout">{DEVICE_WIDTHS[device]} px</span>
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
        <button type="button" className="ve-button ve-button--primary" onClick={exportSite}>
          <Icon name="download" />
          Export
        </button>
        <button
          type="button"
          className="ve-icon-button"
          aria-label={isRightOpen ? 'Hide properties panel' : 'Show properties panel'}
          title={isRightOpen ? 'Hide properties panel' : 'Show properties panel'}
          aria-pressed={isRightOpen}
          onClick={() => dispatch(panelToggled('right'))}
        >
          <Icon name="panel-right" />
        </button>
      </div>
    </header>
  );
}
