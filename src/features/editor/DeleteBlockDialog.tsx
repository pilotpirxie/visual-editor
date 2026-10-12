import { useState, type JSX } from 'react';
import { dispatch, useStore } from '../../app/store';
import { blockLabel } from '../../components/registry';
import { focusCanvas } from '../canvas/frameDom';
import { removeBlockNow } from './blockActions';
import { Button, closeDialogOf, Dialog, DialogActions, DialogBody } from '../../../packages/ui/src';

const TITLE_ID = 've-delete-block-title';
const TEXT_ID = 've-delete-block-text';

type DeleteBlockDialogProps = { blockId: string; onClose(): void };

export function DeleteBlockDialog({ blockId, onClose }: DeleteBlockDialogProps): JSX.Element {
  const name = useStore((state) => {
    const block = state.project.blocks.entities[blockId];
    return block === undefined ? 'this block' : `“${blockLabel(block, state.project)}”`;
  });

  const [wasOpenedFromCanvas] = useState(() => document.activeElement instanceof HTMLIFrameElement);

  function close(): void {
    onClose();
    if (wasOpenedFromCanvas) focusCanvas();
  }

  function remove(element: Element): void {
    closeDialogOf(element);
    dispatch(removeBlockNow(blockId));
  }

  return (
    <Dialog labelId={TITLE_ID} describedBy={TEXT_ID} onClose={close}>
      <DialogBody titleId={TITLE_ID} title={`Delete ${name}?`}>
        <p id={TEXT_ID}>The block is removed from this page. You can undo this.</p>
        <DialogActions>
          <Button autoFocus onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={(event) => remove(event.currentTarget)}>
            Delete block
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
