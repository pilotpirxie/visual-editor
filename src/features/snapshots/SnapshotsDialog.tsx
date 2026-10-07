import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { noticeShown } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { deleteSnapshot, listSnapshots, type SnapshotSummary } from '../../persistence/db';
import { formatLastEdit } from '../home/projects';
import { defaultSnapshotName, restoreSnapshot, takeSnapshot } from './snapshots';
import './snapshots.css';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  IconButton,
  TextInput,
} from '../../../packages/ui/src';

const TITLE_ID = 've-snapshots-title';
const NAME_ID = 've-snapshot-name';

type SnapshotList =
  | { status: 'loading' }
  | { status: 'ready'; snapshots: SnapshotSummary[]; listedAt: number }
  | { status: 'failed'; message: string };

function useSnapshotList(projectId: string, version: number): SnapshotList {
  const [list, setList] = useState<SnapshotList>({ status: 'loading' });
  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const snapshots = await listSnapshots(projectId);
        if (!isCancelled) setList({ status: 'ready', snapshots, listedAt: Date.now() });
      } catch (error) {
        console.error(`Could not list the snapshots of project ${projectId}`, error);
        if (!isCancelled) setList({ status: 'failed', message: describeError(error) });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [projectId, version]);
  return list;
}

type SnapshotRowProps = {
  snapshot: SnapshotSummary;
  listedAt: number;
  isReadOnly: boolean;
  onRestore(snapshot: SnapshotSummary, element: Element): void;
  onDelete(snapshot: SnapshotSummary): void;
};

function SnapshotRow({
  snapshot,
  listedAt,
  isReadOnly,
  onRestore,
  onDelete,
}: SnapshotRowProps): JSX.Element {
  return (
    <li className="ve-snapshot-row">
      <div className="ve-snapshot-info">
        <strong>{snapshot.name}</strong>
        {snapshot.kind === 'auto' && <span className="ve-snapshot-badge">Auto</span>}
        <span className="ui-muted">{formatLastEdit(snapshot.createdAt, listedAt)}</span>
      </div>
      <div className="ve-snapshot-actions">
        <Button
          variant="ghost"
          disabled={isReadOnly}
          onClick={(event) => onRestore(snapshot, event.currentTarget)}
        >
          Restore
        </Button>
        <IconButton
          label={`Delete “${snapshot.name}”`}
          icon="trash"
          onClick={() => onDelete(snapshot)}
        />
      </div>
    </li>
  );
}

export function SnapshotsDialog({ onClose }: { onClose(): void }): JSX.Element {
  const projectId = useStore((state) => state.project.id);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);
  const [version, setVersion] = useState(0);
  const list = useSnapshotList(projectId, version);
  const [name, setName] = useState(() => defaultSnapshotName(new Date()));
  const [isBusy, setIsBusy] = useState(false);

  async function take(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    const trimmed = name.trim();
    await dispatch(
      takeSnapshot(trimmed === '' ? defaultSnapshotName(new Date()) : trimmed, 'manual'),
    );
    setName(defaultSnapshotName(new Date()));
    setVersion((current) => current + 1);
    setIsBusy(false);
  }

  async function restore(snapshot: SnapshotSummary, element: Element): Promise<void> {
    setIsBusy(true);
    try {
      await dispatch(restoreSnapshot(snapshot));
      closeDialogOf(element);
    } catch (error) {
      console.error(`Could not restore snapshot ${snapshot.id}`, error);
      dispatch(
        noticeShown('error', `“${snapshot.name}” could not be restored: ${describeError(error)}`),
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(snapshot: SnapshotSummary): Promise<void> {
    try {
      await deleteSnapshot(snapshot.id);
    } catch (error) {
      console.error(`Could not delete snapshot ${snapshot.id}`, error);
      dispatch(
        noticeShown('error', `“${snapshot.name}” could not be deleted: ${describeError(error)}`),
      );
    }
    setVersion((current) => current + 1);
  }

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="Snapshots" onSubmit={(event) => void take(event)}>
        {!isReadOnly && (
          <div className="ve-snapshot-take">
            <Field id={NAME_ID} label="Name">
              <TextInput
                id={NAME_ID}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </Field>
            <Button type="submit" variant="primary" icon="history" disabled={isBusy}>
              Take snapshot
            </Button>
          </div>
        )}
        {list.status === 'loading' && (
          <p className="ui-muted" role="status">
            Loading snapshots…
          </p>
        )}
        {list.status === 'failed' && (
          <p className="ui-field-error" role="alert">
            Snapshots could not be loaded: {list.message}
          </p>
        )}
        {list.status === 'ready' && list.snapshots.length === 0 && (
          <p className="ui-muted">No snapshots yet.</p>
        )}
        {list.status === 'ready' && list.snapshots.length > 0 && (
          <ul className="ve-snapshot-list" aria-busy={isBusy}>
            {list.snapshots.map((snapshot) => (
              <SnapshotRow
                key={snapshot.id}
                snapshot={snapshot}
                listedAt={list.listedAt}
                isReadOnly={isReadOnly || isBusy}
                onRestore={(item, element) => void restore(item, element)}
                onDelete={(item) => void remove(item)}
              />
            ))}
          </ul>
        )}
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Close</Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
