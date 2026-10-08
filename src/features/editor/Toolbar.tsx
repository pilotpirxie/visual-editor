import type { JSX } from 'react';
import {
  designSheetToggled,
  deviceChanged,
  dialogOpened,
  panelToggled,
  previewToggled,
  type DeviceMode,
} from '../../app/editorSlice';
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
  useTooltip,
  type MenuItem,
} from '../../../packages/ui/src';
import { DeviceMenu, DeviceToggle } from './DeviceToggle';
import { SHORTCUT_KEYS } from './shortcutList';

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

function PropertiesToggle(): JSX.Element {
  const isOpen = useStore((state) => !state.editor.panels.right.collapsed);
  return (
    <IconButton
      className="ve-wide-only"
      label={isOpen ? 'Hide properties panel' : 'Show properties panel'}
      icon="panel-right"
      isPressed={isOpen}
      onClick={() => dispatch(panelToggled('right'))}
    />
  );
}

const DEVICE_MODES: DeviceMode[] = ['responsive', 'desktop', 'tablet', 'phone'];

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
        <LogoLink />
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
        <Button
          variant="ghost"
          icon="palette"
          aria-label="Design"
          id="ve-design-toggle"
          aria-pressed={isDesignSheetOpen}
          disabled={isReadOnly}
          onClick={() => dispatch(designSheetToggled(!isDesignSheetOpen))}
        >
          <span className="ve-wide-only">Design</span>
        </Button>
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
        <PropertiesToggle />
      </div>
    </header>
  );
}
