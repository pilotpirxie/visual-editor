import type { JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import { DEVICE_WIDTHS, deviceChanged, panelToggled, type Device } from '../../app/editorSlice';
import { dispatch, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { buildExportFiles } from '../../render/exportSite';
import { downloadFiles } from '../export/downloadFiles';
import { Icon } from './Icon';

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
  const isLeftOpen = useStore((state) => !state.editor.panels.left.collapsed);
  const isRightOpen = useStore((state) => !state.editor.panels.right.collapsed);

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
        <span className="ve-logo">Visual Editor</span>
        <span className="ve-project-title">{title}</span>
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
