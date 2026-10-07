import { noticeShown } from '../../app/editorSlice';
import { projectRestored } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import {
  getSnapshotProject,
  latestSnapshotText,
  putSnapshot,
  snapshotId,
  type SnapshotKind,
  type SnapshotSummary,
} from '../../persistence/db';
import { loadProjectAssets } from '../../app/projectAssets';

export const MAX_SNAPSHOTS = 20;

const SUFFIX_LENGTH = 8;
const NAME_FORMAT = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

export function defaultSnapshotName(date: Date): string {
  return `Snapshot ${NAME_FORMAT.format(date)}`;
}

export function takeSnapshot(name: string, kind: SnapshotKind): AppThunk<Promise<boolean>> {
  return async (dispatch, getState) => {
    const { project, editor } = getState();
    if (editor.isReadOnly) return false;
    const text = JSON.stringify(project);
    try {
      if (kind === 'auto' && (await latestSnapshotText(project.id)) === text) return false;
      const createdAt = new Date().toISOString();
      const suffix = crypto.randomUUID().slice(0, SUFFIX_LENGTH);
      await putSnapshot(
        {
          id: snapshotId(project.id, createdAt, suffix),
          projectId: project.id,
          name,
          kind,
          createdAt,
          document: text,
        },
        MAX_SNAPSHOTS,
      );
      return true;
    } catch (error) {
      console.error(`Could not save the snapshot "${name}" of project ${project.id}`, error);
      dispatch(
        noticeShown('warning', `The snapshot “${name}” could not be saved in this browser.`),
      );
      return false;
    }
  };
}

export function restoreSnapshot(snapshot: SnapshotSummary): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await dispatch(takeSnapshot(`Before restoring “${snapshot.name}”`, 'auto'));
    const restored = await getSnapshotProject(snapshot.id);
    if (restored === null) throw new Error('This snapshot no longer exists');
    dispatch(projectRestored(restored));
    void dispatch(loadProjectAssets());
    const message = `Restored “${snapshot.name}”. Undo brings back the version you had.`;
    dispatch(noticeShown('info', message));
  };
}
