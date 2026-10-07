import { describe, expect, it } from 'vitest';
import { writeToFolder, type WritableFolder } from './exportFolder';

type FakeFolder = WritableFolder & {
  files: Map<string, string | Blob>;
  folders: Map<string, FakeFolder>;
};

function fakeFolder(): FakeFolder {
  const files = new Map<string, string | Blob>();
  const folders = new Map<string, FakeFolder>();
  return {
    files,
    folders,
    async getDirectoryHandle(name) {
      const folder = folders.get(name) ?? fakeFolder();
      folders.set(name, folder);
      return folder;
    },
    async getFileHandle(name) {
      return {
        createWritable: async () => ({
          write: async (content) => {
            files.set(name, content);
          },
          close: async () => {},
        }),
      };
    },
  };
}

describe('writeToFolder', () => {
  it('writes every file, creating the asset folders it needs', async () => {
    const root = fakeFolder();
    await writeToFolder(root, {
      'index.html': '<!doctype html>',
      'assets/css/site.css': ':root {}',
      'assets/css/extra.css': 'a {}',
    });
    expect(root.files.get('index.html')).toBe('<!doctype html>');
    const css = root.folders.get('assets')?.folders.get('css');
    expect(css?.files.get('site.css')).toBe(':root {}');
    expect(css?.files.get('extra.css')).toBe('a {}');
  });
});
