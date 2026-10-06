import { useEffect, useRef, useState, type JSX } from 'react';
import { pageRemoved } from '../../app/projectSlice';
import { dispatch, store, useStore } from '../../app/store';
import { linksToPage } from './linkUsage';
import './pages.css';

type DeletePageDialogProps = { pageId: string; onClose(): void };

export function DeletePageDialog({ pageId, onClose }: DeletePageDialogProps): JSX.Element {
  const page = useStore((state) => state.project.pages.entities[pageId]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const blockCount = page?.blockIds.length ?? 0;
  const [usages] = useState(() => linksToPage(store.getState().project, pageId));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  function close(): void {
    dialogRef.current?.close();
  }

  function remove(): void {
    dispatch(pageRemoved({ pageId }));
    close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="ve-dialog"
      aria-labelledby="ve-delete-page-title"
      aria-describedby="ve-delete-page-text"
      onClose={onClose}
    >
      <div className="ve-dialog-body">
        <h2 id="ve-delete-page-title" className="ve-properties-title">
          Delete “{page?.name ?? 'this page'}”?
        </h2>
        <p id="ve-delete-page-text">
          The page and its {blockCount === 1 ? '1 block' : `${blockCount} blocks`} are removed. You
          can undo this.
        </p>
        {usages.length > 0 && (
          <div className="ve-dialog-warning" role="note">
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
        <div className="ve-dialog-actions">
          <button type="button" className="ve-button ve-button--outline" autoFocus onClick={close}>
            Cancel
          </button>
          <button type="button" className="ve-button ve-button--danger" onClick={remove}>
            Delete page
          </button>
        </div>
      </div>
    </dialog>
  );
}
