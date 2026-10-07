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
    const unsubscribe = store.subscribe(() => {
      const { project, editor } = store.getState();
      if (project === previousProject) return;
      const isSameProject = project.id === previousProject.id;
      previousProject = project;
      const isAutoSaving = editor.linkedFile?.isAutoSaving === true;
      if (isSameProject && isAutoSaving && editor.isLinkedFileStale) diskAutosave.schedule(project);
    });
    return () => {
      unsubscribe();
      void diskAutosave.flush();
    };
  }, []);
}
