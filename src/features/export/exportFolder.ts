import type { ExportFiles } from '../../render/assembleSite';

type WritableFile = { write(data: string | Blob): Promise<void>; close(): Promise<void> };

export type WritableFolder = {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<WritableFolder>;
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<{ createWritable(): Promise<WritableFile> }>;
};

export function canExportToFolder(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

export async function pickExportFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (window.showDirectoryPicker === undefined) {
    throw new Error('This browser cannot write into a folder');
  }
  try {
    return await window.showDirectoryPicker({ id: 'visual-editor-export', mode: 'readwrite' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

async function folderFor(root: WritableFolder, path: string[]): Promise<WritableFolder> {
  let folder = root;
  for (const name of path) folder = await folder.getDirectoryHandle(name, { create: true });
  return folder;
}

export async function writeToFolder(root: WritableFolder, files: ExportFiles): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    const fileName = parts.pop();
    if (fileName === undefined || fileName === '') continue;
    const folder = await folderFor(root, parts);
    const handle = await folder.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }
}
