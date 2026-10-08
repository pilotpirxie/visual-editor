import type { JSX } from 'react';
import { dialogOpened, libraryOpened, type EditorDialog } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { canUseFileSystemAccess } from './fileAccess';
import { setDiskAutosave } from './fileActions';
import { fileCommands } from './fileCommands';
import { packCommands } from '../block-packs/packCommands';
import { MenuButton, useMediaQuery, type MenuItem } from '../../../packages/ui/src';
import { SHORTCUT_KEYS } from '../editor/shortcutList';

const NARROW_TOOLBAR_QUERY = '(width < 520px)';

function openDialog(dialog: EditorDialog): () => void {
  return () => dispatch(dialogOpened(dialog));
}

export function FileMenu(): JSX.Element {
  const linkedFile = useStore((state) => state.editor.linkedFile);
  const isLinkedFileStale = useStore((state) => state.editor.isLinkedFileStale);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);
  const isNarrow = useMediaQuery(NARROW_TOOLBAR_QUERY);
  const canAutoSave = canUseFileSystemAccess() && linkedFile?.kind === 'file';
  const items: MenuItem[] = [
    { id: 'new', label: 'New project…', onSelect: openDialog({ kind: 'new-project' }) },
    {
      id: 'open',
      label: 'Open from disk…',
      shortcut: SHORTCUT_KEYS.open,
      onSelect: fileCommands.openFromDisk,
    },
    {
      id: 'save',
      label: 'Save to disk',
      shortcut: SHORTCUT_KEYS.save,
      onSelect: () => fileCommands.save(false),
    },
    {
      id: 'save-as',
      label: 'Save as…',
      shortcut: SHORTCUT_KEYS.saveAs,
      onSelect: () => fileCommands.save(true),
    },
    { id: 'snapshots', label: 'Snapshots…', onSelect: openDialog({ kind: 'snapshots' }) },
    { id: 'project-separator', isSeparator: true },
    {
      id: 'settings',
      label: 'Project settings',
      disabled: isReadOnly,
      onSelect: () => dispatch(libraryOpened('settings')),
    },
    { id: 'export', label: 'Export site…', onSelect: openDialog({ kind: 'export' }) },
    {
      id: 'load-pack',
      label: 'Load block pack…',
      disabled: isReadOnly,
      onSelect: packCommands.loadFromDisk,
    },
  ];
  if (canAutoSave) {
    items.push(
      { id: 'autosave-separator', isSeparator: true },
      {
        id: 'autosave',
        label: 'Auto-save to file',
        isChecked: linkedFile.isAutoSaving,
        onSelect: () => {
          setDiskAutosave(!linkedFile.isAutoSaving).catch((error: unknown) => {
            console.error('Changing auto-save to file failed', error);
          });
        },
      },
    );
  }
  items.push({ id: 'licenses-separator', isSeparator: true });
  if (isNarrow) items.push({ id: 'help', label: 'Help', onSelect: openDialog({ kind: 'help' }) });
  items.push({
    id: 'licenses',
    label: 'Open-source licenses',
    onSelect: openDialog({ kind: 'licenses' }),
  });
  const status = linkedFile !== null && isLinkedFileStale ? 'changes not saved to file' : undefined;
  return <MenuButton label="File" icon="file" items={items} status={status} />;
}
