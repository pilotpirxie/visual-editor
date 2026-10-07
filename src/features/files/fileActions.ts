import { linkedFileChanged, noticeShown } from '../../app/editorSlice';
import { copyProjectWithNewIds } from '../../app/projectCopy';
import { projectLoaded } from '../../app/projectSlice';
import { editorPath, navigate } from '../../app/router';
import { autosave, dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import {
  getFileLink,
  getProjectSummary,
  putFileLink,
  putProject,
  type FileLink,
} from '../../persistence/db';
import { isProjectOpenElsewhere } from '../../persistence/projectLocks';
import { downloadBlob } from '../export/download';
import { syncProjectWithLibrary } from '../block-packs/packLibrary';
import { loadProjectAssets } from '../../app/projectAssets';
import {
  canUseFileSystemAccess,
  hasPermission,
  pickSaveHandle,
  readHandle,
  writeFile,
  type PickedFile,
} from './fileAccess';
import {
  openDecision,
  parseProjectFile,
  PROJECT_FILE_TYPE,
  projectFileName,
  serializeProject,
  type OpenDecision,
} from './projectFile';

export type OpenConflict = {
  picked: PickedFile;
  project: Project;
  decision: Exclude<OpenDecision, 'open'>;
};

export type OpenResult = { kind: 'opened' } | { kind: 'conflict'; conflict: OpenConflict };

export type SaveResult =
  { kind: 'saved' } | { kind: 'downloaded' } | { kind: 'cancelled' } | { kind: 'outside-change' };

function nowIso(): string {
  return new Date().toISOString();
}

function showLinkedFile(link: FileLink): void {
  dispatch(
    linkedFileChanged({
      name: link.name,
      savedAt: nowIso(),
      kind: 'file',
      isAutoSaving: link.isAutoSaving,
    }),
  );
}

function openInEditor(project: Project): void {
  const isAlreadyOpen = store.getState().project.id === project.id;
  if (isAlreadyOpen) {
    dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
    void dispatch(loadProjectAssets());
    dispatch(syncProjectWithLibrary()).catch((error: unknown) => {
      console.warn('Could not compare the project with your block packs', error);
    });
  }
  navigate(editorPath(project.id, project.pages.homePageId));
}

async function linkFile(project: Project, picked: PickedFile): Promise<void> {
  if (picked.handle === null) return;
  const link: FileLink = {
    id: project.id,
    handle: picked.handle,
    name: picked.name,
    lastModified: picked.lastModified,
    openedAt: nowIso(),
    isAutoSaving: false,
  };
  await putFileLink(link);
  if (store.getState().project.id === project.id) showLinkedFile(link);
}

async function storeAndOpen(project: Project, picked: PickedFile): Promise<void> {
  await autosave.flush();
  await putProject(project);
  openInEditor(project);
  await linkFile(project, picked);
}

async function openCopy(project: Project): Promise<void> {
  const copy = copyProjectWithNewIds(project, `Copy of ${project.settings.title}`);
  await putProject(copy);
  openInEditor(copy);
}

export async function openPickedFile(picked: PickedFile): Promise<OpenResult> {
  const project = parseProjectFile(picked.text);
  if (await isProjectOpenElsewhere(project.id)) {
    await openCopy(project);
    const message = `“${project.settings.title}” is open in another tab, so it opened as a copy.`;
    dispatch(noticeShown('info', message));
    return { kind: 'opened' };
  }
  const existing = await getProjectSummary(project.id);
  const decision = openDecision(existing, picked.lastModified);
  if (decision !== 'open') return { kind: 'conflict', conflict: { picked, project, decision } };
  await storeAndOpen(project, picked);
  return { kind: 'opened' };
}

export async function resolveOpenConflict(
  choice: 'replace' | 'copy',
  { picked, project }: OpenConflict,
): Promise<void> {
  if (choice === 'replace') {
    await storeAndOpen(project, picked);
    return;
  }
  await openCopy(project);
}

async function writeLinkedFile(
  project: Project,
  handle: FileSystemFileHandle,
  isAutoSaving: boolean,
): Promise<FileLink> {
  const lastModified = await writeFile(handle, serializeProject(project));
  const link: FileLink = {
    id: project.id,
    handle,
    name: handle.name,
    lastModified,
    openedAt: nowIso(),
    isAutoSaving,
  };
  await putFileLink(link);
  return link;
}

function downloadProject(project: Project): SaveResult {
  const name = projectFileName(project);
  downloadBlob(new Blob([serializeProject(project)], { type: PROJECT_FILE_TYPE }), name);
  dispatch(linkedFileChanged({ name, savedAt: nowIso(), kind: 'download', isAutoSaving: false }));
  return { kind: 'downloaded' };
}

async function saveAsNewFile(project: Project): Promise<SaveResult> {
  const handle = await pickSaveHandle(projectFileName(project));
  if (handle === null) return { kind: 'cancelled' };
  showLinkedFile(await writeLinkedFile(project, handle, false));
  return { kind: 'saved' };
}

export async function isChangedElsewhere(link: FileLink): Promise<boolean> {
  const file = await link.handle.getFile();
  return file.lastModified !== link.lastModified;
}

export async function saveToDisk(
  isSaveAs: boolean,
  isOverwriteAllowed = false,
): Promise<SaveResult> {
  const { project } = store.getState();
  if (!canUseFileSystemAccess()) return downloadProject(project);
  if (isSaveAs) return saveAsNewFile(project);
  const link = await getFileLink(project.id);
  if (link === null) return saveAsNewFile(project);
  if (!(await hasPermission(link.handle, 'readwrite', true))) {
    throw new Error(`The browser did not allow saving to ${link.name}`);
  }
  if (!isOverwriteAllowed && (await isChangedElsewhere(link))) return { kind: 'outside-change' };
  showLinkedFile(await writeLinkedFile(project, link.handle, link.isAutoSaving));
  return { kind: 'saved' };
}

export async function reloadFromFile(): Promise<void> {
  const { project } = store.getState();
  const link = await getFileLink(project.id);
  if (link === null) throw new Error('This project is not linked to a file');
  if (!(await hasPermission(link.handle, 'read', true))) {
    throw new Error(`The browser did not allow reading ${link.name}`);
  }
  const picked = await readHandle(link.handle);
  const reloaded = parseProjectFile(picked.text);
  if (reloaded.id !== project.id) throw new Error(`${link.name} now holds a different project`);
  await storeAndOpen(reloaded, picked);
}

export async function setDiskAutosave(isAutoSaving: boolean): Promise<void> {
  const { project } = store.getState();
  const link = await getFileLink(project.id);
  if (link === null) return;
  const updated = { ...link, isAutoSaving };
  await putFileLink(updated);
  const shown = store.getState().editor.linkedFile;
  if (shown !== null) dispatch(linkedFileChanged({ ...shown, isAutoSaving }));
}

export async function showStoredLink(projectId: string): Promise<void> {
  const link = await getFileLink(projectId);
  if (link === null || store.getState().project.id !== projectId) return;
  dispatch(
    linkedFileChanged({
      name: link.name,
      savedAt: null,
      kind: 'file',
      isAutoSaving: link.isAutoSaving,
    }),
  );
}

export type AutosaveWrite = 'written' | 'not-linked' | 'paused';

export async function writeAutosavedFile(project: Project): Promise<AutosaveWrite> {
  const link = await getFileLink(project.id);
  if (link === null || !link.isAutoSaving) return 'not-linked';
  if (!(await hasPermission(link.handle, 'readwrite', false))) return 'paused';
  if (await isChangedElsewhere(link)) return 'paused';
  const written = await writeLinkedFile(project, link.handle, true);
  if (store.getState().project.id === project.id) showLinkedFile(written);
  return 'written';
}
