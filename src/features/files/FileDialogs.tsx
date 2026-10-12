import { useSyncExternalStore, type JSX } from 'react';
import { useStore } from '../../app/store';
import type { OpenConflict } from './fileActions';
import { fileCommands } from './fileCommands';
import { Button, closeDialogOf, Dialog, DialogActions } from '../../../packages/ui/src';

const CONFLICT_TITLE_ID = 've-open-conflict-title';
const OUTSIDE_CHANGE_TITLE_ID = 've-outside-change-title';

function SameProjectDialog({ conflict }: { conflict: OpenConflict }): JSX.Element {
  const { project, picked, decision } = conflict;
  const canReplace = decision === 'replace-or-copy';
  return (
    <Dialog labelId={CONFLICT_TITLE_ID} onClose={fileCommands.closeDialog}>
      <div className="ui-dialog-body">
        <h2 id={CONFLICT_TITLE_ID} className="ui-title">
          “{project.settings.title}” is already in this browser
        </h2>
        <p>
          {canReplace
            ? `${picked.name} is newer than the copy saved in this browser. Replace it, or open the file as a separate copy.`
            : `The copy saved in this browser is newer than ${picked.name}. You can open the file as a separate copy.`}
        </p>
        <DialogActions>
          <Button autoFocus onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          <Button onClick={() => fileCommands.resolveConflict('copy', conflict)}>
            Open as copy
          </Button>
          {canReplace && (
            <Button
              variant="primary"
              onClick={() => fileCommands.resolveConflict('replace', conflict)}
            >
              Replace
            </Button>
          )}
        </DialogActions>
      </div>
    </Dialog>
  );
}

function OutsideChangeDialog(): JSX.Element {
  const fileName = useStore((state) => state.editor.linkedFile?.name ?? 'The file');
  return (
    <Dialog labelId={OUTSIDE_CHANGE_TITLE_ID} onClose={fileCommands.closeDialog}>
      <div className="ui-dialog-body">
        <h2 id={OUTSIDE_CHANGE_TITLE_ID} className="ui-title">
          {fileName} changed outside the editor
        </h2>
        <p>Overwrite it with this project, save to a new file, or load the file’s version.</p>
        <DialogActions>
          <Button autoFocus onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          <Button onClick={fileCommands.reload}>Reload from file</Button>
          <Button
            onClick={() => {
              fileCommands.closeDialog();
              fileCommands.save(true);
            }}
          >
            Save as…
          </Button>
          <Button variant="danger" onClick={fileCommands.overwrite}>
            Overwrite
          </Button>
        </DialogActions>
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
