import { useState, type JSX } from 'react';
import {
  DEVICE_VIEWPORTS,
  designSheetToggled,
  type LinkedFile,
  deviceChanged,
  panelToggled,
  previewToggled,
  type DeviceMode,
  type PanelSide,
} from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { followLink, HOME_PATH } from '../../app/router';
import { dispatch, useStore } from '../../app/store';
import type { Device } from '../../app/types';
import type { SaveStatus } from '../../persistence/autosave';
import { ExportDialog } from '../export/ExportDialog';
import { LicensesDialog } from '../licenses/LicensesDialog';
import { FileMenu } from '../files/FileMenu';
import { PageSwitcher } from '../pages/PageSwitcher';
import { NewProjectDialog } from '../home/NewProjectDialog';
import { ProjectSettingsDialog } from '../project/ProjectSettingsDialog';
import { duplicateBlock, removeBlock } from './blockActions';
import { clipboardItems } from './blockMenu';
import { Icon } from './Icon';
import { MenuButton, type MenuItem } from './Menu';

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  saving: 'Saving…',
  saved: 'Saved in browser',
  error: 'Not saved',
};

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function linkedFileStatus(linkedFile: LinkedFile, isStale: boolean): string {
  const savedAt =
    linkedFile.savedAt === null ? null : TIME_FORMAT.format(Date.parse(linkedFile.savedAt));
  let status: string;
  if (linkedFile.kind === 'download') {
    status = `Downloaded ${linkedFile.name}`;
  } else if (savedAt === null) {
    status = linkedFile.name;
  } else {
    status = `${linkedFile.name} · saved ${savedAt}`;
  }
  return isStale ? `${status} · changes not saved to file` : status;
}

function FileStatus(): JSX.Element | null {
  const linkedFile = useStore((state) => state.editor.linkedFile);
  const isStale = useStore((state) => state.editor.isLinkedFileStale);
  if (linkedFile === null) return null;
  return (
    <span className="ve-file-status ve-wide-only" data-stale={isStale || undefined}>
      {linkedFileStatus(linkedFile, isStale)}
    </span>
  );
}

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

function EditMenu(): JSX.Element {
  const selectedBlockId = useStore((state) => state.editor.selectedBlockId);
  const hasClipboard = useStore((state) => state.editor.clipboardText !== null);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);
  const items: MenuItem[] = [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: 'Mod+Z',
      disabled: !canUndo,
      onSelect: () => dispatch(undo()),
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: 'Shift+Mod+Z',
      disabled: !canRedo,
      onSelect: () => dispatch(redo()),
    },
    { id: 'clipboard-separator', isSeparator: true },
    ...clipboardItems(selectedBlockId, hasClipboard),
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: 'Mod+D',
      disabled: selectedBlockId === null,
      onSelect: () => {
        if (selectedBlockId !== null) dispatch(duplicateBlock(selectedBlockId));
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Delete',
      isDanger: true,
      disabled: selectedBlockId === null,
      onSelect: () => {
        if (selectedBlockId !== null) dispatch(removeBlock(selectedBlockId));
      },
    },
  ];
  return <MenuButton label="Edit" icon="pencil" items={items} />;
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

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
        <FileMenu
          onNewProject={() => setIsNewProjectOpen(true)}
          onProjectSettings={() => setIsSettingsOpen(true)}
          onExport={() => setIsExportOpen(true)}
          onLicenses={() => setIsLicensesOpen(true)}
        />
        <EditMenu />
        <button
          type="button"
          className="ve-project-title"
          aria-haspopup="dialog"
          title="Project settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          {title}
        </button>
        <span className="ve-save-status" data-status={saveStatus} role="status">
          {SAVE_STATUS_LABELS[saveStatus]}
        </span>
        <FileStatus />
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
          aria-haspopup="dialog"
          onClick={() => setIsExportOpen(true)}
        >
          <Icon name="download" />
          <span className="ve-wide-only">Export</span>
        </button>
        <PanelToggle side="right" />
      </div>
      {isSettingsOpen && <ProjectSettingsDialog onClose={() => setIsSettingsOpen(false)} />}
      {isExportOpen && <ExportDialog onClose={() => setIsExportOpen(false)} />}
      {isLicensesOpen && <LicensesDialog onClose={() => setIsLicensesOpen(false)} />}
      {isNewProjectOpen && <NewProjectDialog onClose={() => setIsNewProjectOpen(false)} />}
    </header>
  );
}
