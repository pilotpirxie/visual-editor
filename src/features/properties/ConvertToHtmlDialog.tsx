import type { JSX } from 'react';
import { conversionRequested } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { blockLabel } from '../../components/registry';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import { convertToHtml } from '../editor/htmlBlockActions';

const TITLE_ID = 've-convert-title';

export function ConvertToHtmlDialog({ blockId }: { blockId: string }): JSX.Element | null {
  const block = useStore((state) => state.project.blocks.entities[blockId]);
  if (block?.kind !== 'component') return null;

  return (
    <Dialog labelId={TITLE_ID} onClose={() => dispatch(conversionRequested(null))}>
      <div className="ve-dialog-body">
        <h2 id={TITLE_ID} className="ve-properties-title">
          Convert “{blockLabel(block)}” to HTML?
        </h2>
        <div className="ve-dialog-warning" role="note">
          <ul>
            <li>Its fields are replaced by its code, which you then edit by hand.</li>
            <li>
              This cannot be turned back into a block later. Undo works right after converting.
            </li>
            <li>Links to your pages become fixed addresses that no longer follow page renames.</li>
          </ul>
        </div>
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
            className="ve-button ve-button--primary"
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
