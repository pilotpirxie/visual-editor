import type { JSX } from 'react';
import { Button, closeDialogOf, Dialog, DialogActions, DialogBody } from '../../../packages/ui/src';

const TITLE_ID = 've-delete-project-title';
const TEXT_ID = 've-delete-project-text';

type DeleteProjectDialogProps = {
  title: string;
  isOpenElsewhere: boolean;
  onConfirm(): void;
  onClose(): void;
};

export function DeleteProjectDialog({
  title,
  isOpenElsewhere,
  onConfirm,
  onClose,
}: DeleteProjectDialogProps): JSX.Element {
  return (
    <Dialog labelId={TITLE_ID} describedBy={TEXT_ID} onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title={`Delete “${title}”?`}>
        <p id={TEXT_ID}>
          {isOpenElsewhere
            ? 'It is open in another tab, which will close it. This cannot be undone.'
            : 'The project is removed from this browser. This cannot be undone.'}
        </p>
        <DialogActions>
          <Button autoFocus onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={(event) => {
              onConfirm();
              closeDialogOf(event.currentTarget);
            }}
          >
            Delete project
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
