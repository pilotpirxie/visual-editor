import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { builtInComponents } from '../../components/registry';
import { prepareExportInput } from '../../render/exportSite';
import { loadIconSet } from '../icons/loadIconSet';
import { assembleExport, writeExportFolder } from './exportClient';
import type { WritableFolder } from './exportFolder';

const runtime = { core: '/* core */', behaviors: { menu: '/* menu */' } };

beforeAll(async () => {
  await loadIconSet('lucide');
});

function memoryFolder(written: Map<string, string | Blob>, prefix = ''): WritableFolder {
  return {
    async getDirectoryHandle(name) {
      return memoryFolder(written, `${prefix}${name}/`);
    },
    async getFileHandle(name) {
      return {
        async createWritable() {
          return {
            async write(data) {
              written.set(`${prefix}${name}`, data);
            },
            async close() {},
          };
        },
      };
    },
  };
}

describe('assembleExport', () => {
  it('builds the site files and a zip on the main thread when workers are missing', async () => {
    const input = prepareExportInput(createSampleProject(), builtInComponents);
    const { result, zip } = await assembleExport(input, runtime);
    expect(Object.keys(result.files)).toContain('index.html');
    expect(zip.type).toBe('application/zip');
    expect(zip.size).toBeGreaterThan(0);
  });

  it('reports a failed export with its reason', async () => {
    const project = createSampleProject();
    project.assets.broken = {
      id: 'broken',
      name: 'x.png',
      mimeType: 'image/png',
      dataUrl: 'data:,x',
    };
    project.settings.faviconAssetId = 'broken';
    const input = prepareExportInput(project, builtInComponents);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(assembleExport(input, runtime)).rejects.toThrow(
      'Only base64 data URLs can be exported as files',
    );
    error.mockRestore();
  });
});

describe('writeExportFolder', () => {
  it('writes every file into nested folders', async () => {
    const written = new Map<string, string | Blob>();
    const folder = memoryFolder(written);
    await writeExportFolder(folder, { 'index.html': '<p>Hi</p>', 'assets/css/site.css': 'a{}' });
    expect([...written.keys()].sort()).toEqual(['assets/css/site.css', 'index.html']);
  });
});
