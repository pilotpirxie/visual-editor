import type { JSX } from 'react';
import {
  designSheetToggled,
  deviceChanged,
  dialogOpened,
  LIBRARY_DRAWER_QUERY,
  libraryDrawerToggled,
  panelToggled,
  previewToggled,
  type DeviceMode,
  type PanelSide,
} from '../../app/editorSlice';
import type { SaveStatus } from '../../persistence/autosave';
import { redo, undo } from '../../app/history';
import { followLink, HOME_PATH } from '../../app/router';
import { dispatch, useStore } from '../../app/store';
import { FileMenu } from '../files/FileMenu';
import { duplicateBlock, removeBlock } from './blockActions';
import { clipboardItems } from './blockMenu';
import {
  Button,
  Icon,
  IconButton,
  MenuButton,
  useMediaQuery,
  useTooltip,
  type MenuItem,
} from '../../../packages/ui/src';
import { DeviceMenu, DeviceToggle } from './DeviceToggle';
import { SHORTCUT_KEYS } from './shortcutList';

const PANEL_TOGGLES: Record<PanelSide, { name: string; icon: string }> = {
  left: { name: 'library panel', icon: 'panel-left' },
  right: { name: 'properties panel', icon: 'panel-right' },
};

function EditMenu({ isReadOnly }: { isReadOnly: boolean }): JSX.Element {
  const selectedBlockId = useStore((state) => state.editor.selectedBlockId);
  const hasClipboard = useStore((state) => state.editor.clipboardText !== null);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);
  const items: MenuItem[] = [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: SHORTCUT_KEYS.undo,
      disabled: !canUndo,
      onSelect: () => dispatch(undo()),
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: SHORTCUT_KEYS.redo,
      disabled: !canRedo,
      onSelect: () => dispatch(redo()),
    },
    { id: 'clipboard-separator', isSeparator: true },
    ...clipboardItems(selectedBlockId, hasClipboard),
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: SHORTCUT_KEYS.duplicate,
      disabled: selectedBlockId === null,
      onSelect: () => {
        if (selectedBlockId !== null) dispatch(duplicateBlock(selectedBlockId));
      },
    },
    {
      id: 'save-block',
      label: 'Save block…',
      disabled: selectedBlockId === null,
      onSelect: () => {
        if (selectedBlockId !== null) {
          dispatch(dialogOpened({ kind: 'save-block', blockId: selectedBlockId }));
        }
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: SHORTCUT_KEYS.remove,
      isDanger: true,
      disabled: selectedBlockId === null,
      onSelect: () => {
        if (selectedBlockId !== null) dispatch(removeBlock(selectedBlockId));
      },
    },
  ];
  items.push(
    { id: 'find-separator', isSeparator: true },
    {
      id: 'find',
      label: 'Find and replace…',
      onSelect: () => dispatch(dialogOpened({ kind: 'find' })),
    },
  );
  return <MenuButton label="Edit" icon="clipboard" items={items} disabled={isReadOnly} />;
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

function LibraryToggle(): JSX.Element {
  const isDrawer = useMediaQuery(LIBRARY_DRAWER_QUERY);
  const isDrawerOpen = useStore((state) => state.editor.isLibraryDrawerOpen);
  if (!isDrawer) return <PanelToggle side="left" />;
  return (
    <IconButton
      id="ve-library-toggle"
      className="ve-wide-only"
      label="Library"
      icon="panel-left"
      aria-expanded={isDrawerOpen}
      aria-controls="ve-library"
      onClick={() => dispatch(libraryDrawerToggled(!isDrawerOpen))}
    />
  );
}

const DEVICE_MODES: DeviceMode[] = ['responsive', 'desktop', 'tablet', 'phone'];

const SAVE_STATES: Record<SaveStatus, { label: string; icon: string }> = {
  saved: { label: 'All changes saved', icon: 'cloud-check' },
  saving: { label: 'Saving…', icon: 'cloud-upload' },
  error: { label: 'Changes not saved', icon: 'cloud-alert' },
};

function ProjectName({ isReadOnly }: { isReadOnly: boolean }): JSX.Element {
  const title = useStore((state) => state.project.settings.title);
  const { triggerProps, tooltip } = useTooltip({ text: 'Project settings' });
  return (
    <>
      <button
        type="button"
        className="ve-project-name"
        aria-label={`${title}, project settings`}
        aria-haspopup="dialog"
        disabled={isReadOnly}
        {...triggerProps}
        onClick={() => dispatch(dialogOpened({ kind: 'settings' }))}
      >
        {title}
      </button>
      {tooltip}
    </>
  );
}

function SaveState(): JSX.Element {
  const status = useStore((state) => state.editor.saveStatus);
  const { label, icon } = SAVE_STATES[status];
  const { triggerProps, tooltip } = useTooltip({ text: label });
  return (
    <>
      <span
        className="ve-save-state"
        role="img"
        aria-label={label}
        data-status={status}
        {...triggerProps}
      >
        <Icon name={icon} />
      </span>
      {tooltip}
    </>
  );
}

function LogoLink(): JSX.Element {
  const { triggerProps, tooltip } = useTooltip({ text: 'My projects' });
  return (
    <>
      <a
        className="ve-logo"
        href={HOME_PATH}
        onClick={followLink}
        aria-label="My projects"
        {...triggerProps}
      >
        <Icon name="house" />
        <span className="ve-logo-text">Visual Editor</span>
      </a>
      {tooltip}
    </>
  );
}

export function PreviewButton({ isDisabled }: { isDisabled: boolean }): JSX.Element {
  const isPreview = useStore((state) => state.editor.isPreview);
  const label = isPreview ? 'Exit preview' : 'Preview';
  const { triggerProps, tooltip } = useTooltip({ text: label, shortcut: SHORTCUT_KEYS.preview });
  return (
    <>
      <Button
        variant="ghost"
        icon={isPreview ? 'eye-off' : 'eye'}
        aria-label={label}
        disabled={isDisabled}
        {...triggerProps}
        onClick={() => dispatch(previewToggled(!isPreview))}
      >
        <span className="ve-wide-only">{label}</span>
      </Button>
      {tooltip}
    </>
  );
}

export function Toolbar(): JSX.Element {
  const device = useStore((state) => state.editor.device);
  const canUndo = useStore((state) => state.history.past.length > 0);
  const canRedo = useStore((state) => state.history.future.length > 0);
  const isDesignSheetOpen = useStore((state) => state.editor.isDesignSheetOpen);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);

  return (
    <header className="ve-toolbar">
      <div className="ve-toolbar-group ve-toolbar-start">
        <LibraryToggle />
        <LogoLink />
        <div className="ve-project">
          <ProjectName isReadOnly={isReadOnly} />
          <SaveState />
        </div>
        <FileMenu />
        <EditMenu isReadOnly={isReadOnly} />
      </div>

      <div className="ve-toolbar-group ve-toolbar-center">
        <DeviceToggle
          name="ve-device"
          className="ve-device-toggle"
          value={device}
          modes={DEVICE_MODES}
          onChange={(mode) => dispatch(deviceChanged(mode))}
        />
        <DeviceMenu
          className="ve-device-menu"
          value={device}
          modes={DEVICE_MODES}
          onChange={(mode) => dispatch(deviceChanged(mode))}
        />
      </div>

      <div className="ve-toolbar-group">
        <IconButton
          className="ve-wide-only"
          label="Undo"
          shortcut={SHORTCUT_KEYS.undo}
          icon="undo"
          disabled={!canUndo || isReadOnly}
          onClick={() => dispatch(undo())}
        />
        <IconButton
          className="ve-wide-only"
          label="Redo"
          shortcut={SHORTCUT_KEYS.redo}
          icon="redo"
          disabled={!canRedo || isReadOnly}
          onClick={() => dispatch(redo())}
        />
        <IconButton
          className="ve-help-button"
          label="Help"
          icon="circle-help"
          shortcut={SHORTCUT_KEYS.help}
          aria-haspopup="dialog"
          onClick={() => dispatch(dialogOpened({ kind: 'help' }))}
        />
        <IconButton
          label="Design system"
          icon="palette"
          disabled={isReadOnly}
          isPressed={isDesignSheetOpen}
          onClick={() => dispatch(designSheetToggled(!isDesignSheetOpen))}
        />
        <PreviewButton isDisabled={isReadOnly} />
        <Button
          variant="primary"
          icon="download"
          aria-label="Export"
          aria-haspopup="dialog"
          onClick={() => dispatch(dialogOpened({ kind: 'export' }))}
        >
          <span className="ve-wide-only">Export</span>
        </Button>
        <PanelToggle side="right" />
      </div>
    </header>
  );
}
