import { useState, type JSX } from 'react';
import { dispatch, store, useStore } from '../../app/store';
import { linksToPage } from './linkUsage';
import { deletePage } from './pageActions';
import { Button, closeDialogOf, Dialog, DialogActions, DialogBody } from '../../../packages/ui/src';

const TITLE_ID = 've-delete-page-title';
const TEXT_ID = 've-delete-page-text';

type DeletePageDialogProps = { pageId: string; onClose(): void };

export function DeletePageDialog({ pageId, onClose }: DeletePageDialogProps): JSX.Element {
  const page = useStore((state) => state.project.pages.entities[pageId]);
  const blockCount = page?.blockIds.length ?? 0;
  const [usages] = useState(() => linksToPage(store.getState().project, pageId));

  function remove(element: Element): void {
    dispatch(deletePage(pageId));
    closeDialogOf(element);
  }

  return (
    <Dialog labelId={TITLE_ID} describedBy={TEXT_ID} onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title={`Delete “${page?.name ?? 'this page'}”?`}>
        <p id={TEXT_ID}>
          The page and its {blockCount === 1 ? '1 block' : `${blockCount} blocks`} are removed. You
          can undo this.
        </p>
        {usages.length > 0 && (
          <div className="ui-dialog-note" role="note">
            <p>These links point to this page and will stop working:</p>
            <ul>
              {usages.map((usage, index) => (
                <li key={`${usage.blockId}-${index}`}>
                  {usage.place} › {usage.blockName} › {usage.fieldLabel}
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogActions>
          <Button autoFocus onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={(event) => remove(event.currentTarget)}>
            Delete page
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
