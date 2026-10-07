import type { JSX } from 'react';
import { useStore } from '../../app/store';
import { MenuButton, type MenuItem } from '../editor/Menu';
import { canUseFileSystemAccess } from './fileAccess';
import { setDiskAutosave } from './fileActions';
import { fileCommands } from './fileCommands';

type FileMenuProps = {
  onNewProject(): void;
  onProjectSettings(): void;
  onExport(): void;
  onLicenses(): void;
};

export function FileMenu({
  onNewProject,
  onProjectSettings,
  onExport,
  onLicenses,
}: FileMenuProps): JSX.Element {
  const linkedFile = useStore((state) => state.editor.linkedFile);
  const canAutoSave = canUseFileSystemAccess() && linkedFile?.kind === 'file';
  const items: MenuItem[] = [
    { id: 'new', label: 'New project…', onSelect: onNewProject },
    {
      id: 'open',
      label: 'Open from disk…',
      shortcut: 'Mod+O',
      onSelect: fileCommands.openFromDisk,
    },
    {
      id: 'save',
      label: 'Save to disk',
      shortcut: 'Mod+S',
      onSelect: () => fileCommands.save(false),
    },
    {
      id: 'save-as',
      label: 'Save as…',
      shortcut: 'Shift+Mod+S',
      onSelect: () => fileCommands.save(true),
    },
    { id: 'project-separator', isSeparator: true },
    { id: 'settings', label: 'Project settings…', onSelect: onProjectSettings },
    { id: 'export', label: 'Export site…', onSelect: onExport },
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
  items.push(
    { id: 'licenses-separator', isSeparator: true },
    { id: 'licenses', label: 'Open-source licenses', onSelect: onLicenses },
  );
  return <MenuButton label="File" icon="file" items={items} />;
}
