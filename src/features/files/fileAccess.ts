import { PROJECT_FILE_EXTENSION, PROJECT_FILE_TYPE } from './projectFile';

export type PickedFile = {
  text: string;
  name: string;
  lastModified: number;
  handle: FileSystemFileHandle | null;
};

const PICKER_ID = 'visual-editor-projects';

const PICKER_TYPES = [
  { description: 'Project file', accept: { [PROJECT_FILE_TYPE]: [PROJECT_FILE_EXTENSION] } },
];

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

function readChosenFile(input: HTMLInputElement): Promise<PickedFile | null> {
  const file = input.files?.[0];
  if (file === undefined) return Promise.resolve(null);
  return file.text().then((text) => ({
    text,
    name: file.name,
    lastModified: file.lastModified,
    handle: null,
  }));
}

function pickWithInput(): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${PROJECT_FILE_EXTENSION},${PROJECT_FILE_TYPE}`;
    input.addEventListener('change', () => readChosenFile(input).then(resolve, reject), {
      once: true,
    });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

export async function pickProjectFile(): Promise<PickedFile | null> {
  if (window.showOpenFilePicker === undefined) return pickWithInput();
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({ id: PICKER_ID, types: PICKER_TYPES });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw error;
  }
  const handle = handles[0];
  if (handle === undefined) return null;
  return readHandle(handle);
}

export async function pickSaveHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (window.showSaveFilePicker === undefined) {
    throw new Error('This browser cannot save to a chosen file');
  }
  try {
    return await window.showSaveFilePicker({ id: PICKER_ID, suggestedName, types: PICKER_TYPES });
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
