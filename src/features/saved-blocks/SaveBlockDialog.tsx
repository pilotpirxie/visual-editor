import { useState, type FormEvent, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { noticeShown } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { blockLabel } from '../../components/registry';
import { saveBlock } from './savedBlockActions';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  TextInput,
} from '../../../packages/ui/src';

const TITLE_ID = 've-save-block-title';
const NAME_ID = 've-save-block-name';

function initialName(blockId: string): string {
  const { project } = store.getState();
  const block = project.blocks.entities[blockId];
  return block === undefined ? 'Saved block' : blockLabel(block, project);
}

export function SaveBlockDialog({
  blockId,
  onClose,
}: {
  blockId: string;
  onClose(): void;
}): JSX.Element {
  const [name, setName] = useState(() => initialName(blockId));
  const [isSaving, setIsSaving] = useState(false);
  const trimmed = name.trim();

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (trimmed === '') return;
    const form = event.currentTarget;
    setIsSaving(true);
    try {
      const isSaved = await dispatch(saveBlock(blockId, trimmed));
      if (isSaved) closeDialogOf(form);
    } catch (error) {
      console.error(`Could not save block ${blockId}`, error);
      dispatch(noticeShown('error', `The block could not be saved: ${describeError(error)}`));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog labelId={TITLE_ID} onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="Save block" onSubmit={(event) => void save(event)}>
        <Field id={NAME_ID} label="Name" error={trimmed === '' ? 'Give the block a name.' : null}>
          <TextInput
            id={NAME_ID}
            value={name}
            autoFocus
            isInvalid={trimmed === ''}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </Field>
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSaving || trimmed === ''}>
            Save block
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
