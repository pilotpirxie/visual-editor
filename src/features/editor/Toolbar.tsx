import { useState, type JSX } from 'react';
import {
  designSheetToggled,
  deviceChanged,
  panelToggled,
  previewToggled,
  type DeviceMode,
  type PanelSide,
} from '../../app/editorSlice';
import { redo, undo } from '../../app/history';
import { followLink, HOME_PATH } from '../../app/router';
import { dispatch, useStore } from '../../app/store';
import { ExportDialog } from '../export/ExportDialog';
import { LicensesDialog } from '../licenses/LicensesDialog';
import { FileMenu } from '../files/FileMenu';
import { NewProjectDialog } from '../home/NewProjectDialog';
import { ProjectSettingsDialog } from '../project/ProjectSettingsDialog';
import { duplicateBlock, removeBlock } from './blockActions';
import { clipboardItems } from './blockMenu';
import { Button, Icon, IconButton, MenuButton, type MenuItem } from '../../../packages/ui/src';
import { DeviceSelect } from './DeviceSelect';

const PANEL_TOGGLES: Record<PanelSide, { name: string; icon: string }> = {
  left: { name: 'library panel', icon: 'panel-left' },
  right: { name: 'properties panel', icon: 'panel-right' },
};

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
  return (
    <IconButton
      className="ve-wide-only"
      label={isOpen ? `Hide ${name}` : `Show ${name}`}
      icon={icon}
      isPressed={isOpen}
      onClick={() => dispatch(panelToggled(side))}
    />
  );
}

const DEVICE_MODES: DeviceMode[] = ['responsive', 'desktop', 'tablet', 'phone'];

export function Toolbar(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);
  const isDesignSheetOpen = useStore((state) => state.editor.isDesignSheetOpen);
  const isPreview = useStore((state) => state.editor.isPreview);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const previewLabel = isPreview ? 'Exit preview' : 'Preview';

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
      </div>

      <div className="ve-toolbar-group ve-toolbar-center">
        <DeviceSelect
          id="ve-device"
          className="ve-device-select"
          value={device}
          modes={DEVICE_MODES}
          onChange={(mode) => dispatch(deviceChanged(mode))}
        />
      </div>

      <div className="ve-toolbar-group">
        <IconButton
          className="ve-wide-only"
          label="Undo"
          icon="undo"
          disabled={!canUndo}
          onClick={() => dispatch(undo())}
        />
        <IconButton
          className="ve-wide-only"
          label="Redo"
          icon="redo"
          disabled={!canRedo}
          onClick={() => dispatch(redo())}
        />
        <IconButton
          label="Design system"
          icon="palette"
          isPressed={isDesignSheetOpen}
          onClick={() => dispatch(designSheetToggled(!isDesignSheetOpen))}
        />
        <Button
          variant="ghost"
          icon={isPreview ? 'eye-off' : 'eye'}
          aria-label={previewLabel}
          title={previewLabel}
          onClick={() => dispatch(previewToggled(!isPreview))}
        >
          <span className="ve-wide-only">{previewLabel}</span>
        </Button>
        <Button
          variant="primary"
          icon="download"
          aria-label="Export"
          aria-haspopup="dialog"
          onClick={() => setIsExportOpen(true)}
        >
          <span className="ve-wide-only">Export</span>
        </Button>
        <PanelToggle side="right" />
      </div>
      {isSettingsOpen && <ProjectSettingsDialog onClose={() => setIsSettingsOpen(false)} />}
      {isExportOpen && <ExportDialog onClose={() => setIsExportOpen(false)} />}
      {isLicensesOpen && <LicensesDialog onClose={() => setIsLicensesOpen(false)} />}
      {isNewProjectOpen && <NewProjectDialog onClose={() => setIsNewProjectOpen(false)} />}
    </header>
  );
}
