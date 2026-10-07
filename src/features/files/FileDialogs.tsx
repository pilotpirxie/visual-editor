import { useSyncExternalStore, type JSX } from 'react';
import { useStore } from '../../app/store';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import type { OpenConflict } from './fileActions';
import { fileCommands } from './fileCommands';

const CONFLICT_TITLE_ID = 've-open-conflict-title';
const OUTSIDE_CHANGE_TITLE_ID = 've-outside-change-title';

function SameProjectDialog({ conflict }: { conflict: OpenConflict }): JSX.Element {
  const { project, picked, decision } = conflict;
  const canReplace = decision === 'replace-or-copy';
  return (
    <Dialog labelId={CONFLICT_TITLE_ID} onClose={fileCommands.closeDialog}>
      <div className="ve-dialog-body">
        <h2 id={CONFLICT_TITLE_ID} className="ve-properties-title">
          “{project.settings.title}” is already in this browser
        </h2>
        <p>
          {canReplace
            ? `${picked.name} is newer than the copy saved in this browser. Replace it, or open the file as a separate copy.`
            : `The copy saved in this browser is newer than ${picked.name}. You can open the file as a separate copy.`}
        </p>
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--outline"
            autoFocus
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={() => fileCommands.resolveConflict('copy', conflict)}
          >
            Open as copy
          </button>
          {canReplace && (
            <button
              type="button"
              className="ve-button ve-button--primary"
              onClick={() => fileCommands.resolveConflict('replace', conflict)}
            >
              Replace
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function OutsideChangeDialog(): JSX.Element {
  const fileName = useStore((state) => state.editor.linkedFile?.name ?? 'The file');
  return (
    <Dialog labelId={OUTSIDE_CHANGE_TITLE_ID} onClose={fileCommands.closeDialog}>
      <div className="ve-dialog-body">
        <h2 id={OUTSIDE_CHANGE_TITLE_ID} className="ve-properties-title">
          {fileName} changed outside the editor
        </h2>
        <p>Overwrite it with this project, save to a new file, or load the file’s version.</p>
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--outline"
            autoFocus
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={fileCommands.reload}
          >
            Reload from file
          </button>
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={() => {
              fileCommands.closeDialog();
              fileCommands.save(true);
            }}
          >
            Save as…
          </button>
          <button
            type="button"
            className="ve-button ve-button--danger"
            onClick={fileCommands.overwrite}
          >
            Overwrite
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function FileDialogs(): JSX.Element | null {
  const dialog = useSyncExternalStore(fileCommands.subscribe, fileCommands.getDialog);
  if (dialog === null) return null;
  if (dialog.kind === 'conflict') return <SameProjectDialog conflict={dialog.conflict} />;
  return <OutsideChangeDialog />;
}
