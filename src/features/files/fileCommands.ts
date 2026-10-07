import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch } from '../../app/store';
import { hasPermission, pickProjectFile, readHandle, type PickedFile } from './fileAccess';
import {
  openPickedFile,
  reloadFromFile,
  resolveOpenConflict,
  saveToDisk,
  type OpenConflict,
} from './fileActions';
import type { FileLink } from '../../persistence/db';

export type FileDialog =
  { kind: 'conflict'; conflict: OpenConflict } | { kind: 'outside-change' } | null;

export type FileCommands = {
  subscribe(listener: () => void): () => void;
  getDialog(): FileDialog;
  closeDialog(): void;
  openFromDisk(): void;
  openRecent(link: FileLink): void;
  save(isSaveAs: boolean): void;
  resolveConflict(choice: 'replace' | 'copy', conflict: OpenConflict): void;
  overwrite(): void;
  reload(): void;
};

function reportFailure(action: string, error: unknown): void {
  console.error(`${action} failed`, error);
  dispatch(noticeShown('error', `${action} failed: ${describeError(error)}`));
}

async function readRecent(link: FileLink): Promise<PickedFile | null> {
  if (!(await hasPermission(link.handle, 'read', true))) return null;
  return readHandle(link.handle);
}

export function createFileCommands(): FileCommands {
  let dialog: FileDialog = null;
  const listeners = new Set<() => void>();

  function setDialog(next: FileDialog): void {
    dialog = next;
    for (const listener of listeners) listener();
  }

  async function openPicked(pickedFile: Promise<PickedFile | null>): Promise<void> {
    const picked = await pickedFile;
    if (picked === null) return;
    const result = await openPickedFile(picked);
    if (result.kind === 'conflict') setDialog({ kind: 'conflict', conflict: result.conflict });
  }

  async function saveWith(isSaveAs: boolean, isOverwriteAllowed: boolean): Promise<void> {
    const result = await saveToDisk(isSaveAs, isOverwriteAllowed);
    if (result.kind === 'outside-change') setDialog({ kind: 'outside-change' });
  }

  function run(action: string, task: Promise<void>): void {
    task.catch((error: unknown) => reportFailure(action, error));
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getDialog: () => dialog,
    closeDialog: () => setDialog(null),
    openFromDisk: () => run('Opening the file', openPicked(pickProjectFile())),
    openRecent: (link) => run(`Opening ${link.name}`, openPicked(readRecent(link))),
    save: (isSaveAs) => run('Saving to disk', saveWith(isSaveAs, false)),
    resolveConflict(choice, conflict) {
      setDialog(null);
      run('Opening the file', resolveOpenConflict(choice, conflict));
    },
    overwrite() {
      setDialog(null);
      run('Saving to disk', saveWith(false, true));
    },
    reload() {
      setDialog(null);
      run('Reloading the file', reloadFromFile());
    },
  };
}

export const fileCommands = createFileCommands();
