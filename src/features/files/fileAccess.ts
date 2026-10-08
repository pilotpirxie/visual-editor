import { PROJECT_FILE_EXTENSION, PROJECT_FILE_TYPE } from './projectFile';

export type PickedFile = {
  text: string;
  name: string;
  lastModified: number;
  handle: FileSystemFileHandle | null;
};

export type FilePicker = { id: string; description: string; type: string; extension: string };

type ChosenFile = { file: File; handle: FileSystemFileHandle | null };

const PROJECT_PICKER: FilePicker = {
  id: 'visual-editor-projects',
  description: 'Project file',
  type: PROJECT_FILE_TYPE,
  extension: PROJECT_FILE_EXTENSION,
};

function pickerTypes(picker: FilePicker): FilePickerAcceptType[] {
  return [{ description: picker.description, accept: { [picker.type]: [picker.extension] } }];
}

export function canUseFileSystemAccess(): boolean {
  return (
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function'
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function readHandle(handle: FileSystemFileHandle): Promise<PickedFile> {
  const file = await handle.getFile();
  return { text: await file.text(), name: file.name, lastModified: file.lastModified, handle };
}

function chooseWithInput(picker: FilePicker): Promise<ChosenFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${picker.extension},${picker.type}`;
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        resolve(file === undefined ? null : { file, handle: null });
      },
      { once: true },
    );
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

async function chooseFile(picker: FilePicker): Promise<ChosenFile | null> {
  if (window.showOpenFilePicker === undefined) return chooseWithInput(picker);
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({ id: picker.id, types: pickerTypes(picker) });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw error;
  }
  const handle = handles[0];
  if (handle === undefined) return null;
  return { file: await handle.getFile(), handle };
}

export async function pickFile(picker: FilePicker): Promise<File | null> {
  const chosen = await chooseFile(picker);
  return chosen?.file ?? null;
}

export async function pickProjectFile(): Promise<PickedFile | null> {
  const chosen = await chooseFile(PROJECT_PICKER);
  if (chosen === null) return null;
  const { file, handle } = chosen;
  return { text: await file.text(), name: file.name, lastModified: file.lastModified, handle };
}

export async function pickSaveHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (window.showSaveFilePicker === undefined) {
    throw new Error('This browser cannot save to a chosen file');
  }
  try {
    return await window.showSaveFilePicker({
      id: PROJECT_PICKER.id,
      suggestedName,
      types: pickerTypes(PROJECT_PICKER),
    });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw error;
  }
}

export async function writeFile(handle: FileSystemFileHandle, contents: string): Promise<number> {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
  const file = await handle.getFile();
  return file.lastModified;
}

export async function hasPermission(
  handle: FileSystemHandle,
  mode: FileSystemPermissionMode,
  shouldAsk: boolean,
): Promise<boolean> {
  const descriptor = { mode };
  if (handle.queryPermission === undefined) return true;
  if ((await handle.queryPermission(descriptor)) === 'granted') return true;
  if (!shouldAsk || handle.requestPermission === undefined) return false;
  return (await handle.requestPermission(descriptor)) === 'granted';
}
