import { useEffect } from 'react';
import { getProject } from '../persistence/db';
import { subscribeTabMessages } from '../persistence/tabChannel';
import { noticeShown } from './editorSlice';
import { projectRefreshed } from './history';
import { loadProjectAssets } from './projectAssets';
import { HOME_PATH, navigate } from './router';
import { autosave, dispatch, store } from './store';

function isShowing(projectId: string): boolean {
  return store.getState().project.id === projectId;
}

async function refreshReadOnlyCopy(projectId: string): Promise<void> {
  const project = await getProject(projectId);
  if (project === null) return;
  const { editor } = store.getState();
  if (!editor.isReadOnly || !isShowing(projectId)) return;
  dispatch(projectRefreshed(project));
  await dispatch(loadProjectAssets());
}

function leaveDeletedProject(projectId: string): void {
  const { title } = store.getState().project.settings;
  autosave.discard(projectId);
  navigate(HOME_PATH);
  dispatch(noticeShown('warning', `“${title}” was deleted in another tab.`));
}

export function useTabSync(projectId: string): void {
  useEffect(() => {
    return subscribeTabMessages((message) => {
      if (message.kind === 'saved-blocks-changed' || message.projectId !== projectId) return;
      if (!isShowing(projectId)) return;
      if (message.kind === 'project-deleted') {
        leaveDeletedProject(projectId);
        return;
      }
      if (!store.getState().editor.isReadOnly) return;
      refreshReadOnlyCopy(projectId).catch((error: unknown) => {
        console.error(`Could not refresh project ${projectId} from another tab`, error);
      });
    });
  }, [projectId]);
}
