import type { JSX } from 'react';
import { conversionRequested } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { blockLabel } from '../../components/registry';
import { convertToHtml } from '../editor/htmlBlockActions';
import { closeDialogOf, Dialog } from '../../../packages/ui/src';

const TITLE_ID = 've-convert-title';

export function ConvertToHtmlDialog({ blockId }: { blockId: string }): JSX.Element | null {
  const block = useStore((state) => state.project.blocks.entities[blockId]);
  const packBlocks = useStore((state) => state.project.packBlocks);
  if (block?.kind !== 'component') return null;

  return (
    <Dialog labelId={TITLE_ID} onClose={() => dispatch(conversionRequested(null))}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Convert “{blockLabel(block, { packBlocks })}” to HTML?
        </h2>
        <div className="ui-dialog-note" role="note">
          <ul>
            <li>Its fields are replaced by its code, which you then edit by hand.</li>
            <li>
              This cannot be turned back into a block later. Undo works right after converting.
            </li>
            <li>Links to your pages become fixed addresses that no longer follow page renames.</li>
          </ul>
        </div>
        <div className="ui-dialog-actions">
          <button
            type="button"
            className="ui-button ui-button--secondary"
            autoFocus
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ui-button ui-button--primary"
            onClick={(event) => {
              const dialog = event.currentTarget;
              dispatch(convertToHtml(blockId));
              closeDialogOf(dialog);
            }}
          >
            Convert to HTML
          </button>
        </div>
      </div>
    </Dialog>
  );
}
