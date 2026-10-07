import { useEffect } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { createAutosave } from '../../persistence/autosave';
import { writeAutosavedFile } from './fileActions';

const DISK_AUTOSAVE_DELAY_MS = 5000;

export function useDiskAutosave(): void {
  useEffect(() => {
    let isPausedNoticeShown = false;
    const diskAutosave = createAutosave({
      async save(project) {
        const result = await writeAutosavedFile(project);
        if (result === 'written') isPausedNoticeShown = false;
        if (result !== 'paused' || isPausedNoticeShown) return;
        isPausedNoticeShown = true;
        const name = store.getState().editor.linkedFile?.name ?? 'the file';
        dispatch(
          noticeShown(
            'warning',
            `Auto-save to ${name} is paused. Use Save to disk to reconnect the file.`,
          ),
        );
      },
      delayMs: DISK_AUTOSAVE_DELAY_MS,
      onStatus() {},
    });
    let previousProject = store.getState().project;
    let wasStale = store.getState().editor.isLinkedFileStale;
    const unsubscribe = store.subscribe(() => {
      const { project, editor } = store.getState();
      const isStale = editor.isLinkedFileStale;
      const hasChanged = project !== previousProject || isStale !== wasStale;
      const isSameProject = project.id === previousProject.id;
      previousProject = project;
      wasStale = isStale;
      if (!hasChanged || !isSameProject) return;
      const isAutoSaving = editor.linkedFile?.isAutoSaving === true;
      if (isAutoSaving && isStale) diskAutosave.schedule(project);
    });
    return () => {
      unsubscribe();
      void diskAutosave.flush();
    };
  }, []);
}
