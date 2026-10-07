import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { store } from '../../app/store';
import type { Project } from '../../app/types';
import * as db from '../../persistence/db';
import { loadIntoAppStore } from '../../test/fixtures';
import { downloadBlob } from '../export/download';
import * as fileAccess from './fileAccess';
import { openPickedFile, resolveOpenConflict, saveToDisk } from './fileActions';
import { serializeProject } from './projectFile';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
  getProjectSummary: vi.fn(async () => null),
  getFileLink: vi.fn(async () => null),
  putFileLink: vi.fn(async () => {}),
}));

vi.mock('../export/download', () => ({ downloadBlob: vi.fn() }));

vi.mock('./fileAccess', () => ({
  canUseFileSystemAccess: vi.fn(() => false),
  hasPermission: vi.fn(async () => true),
  pickSaveHandle: vi.fn(async () => null),
  readHandle: vi.fn(),
  writeFile: vi.fn(async () => 42),
}));

function fakeHandle(name: string, lastModified: number): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    isSameEntry: async () => false,
    getFile: async () => new File(['{}'], name, { lastModified }),
    createWritable: async () => {
      throw new Error('Writing goes through writeFile in these tests');
    },
  };
}

function link(project: Project, lastModified: number): db.FileLink {
  return {
    id: project.id,
    handle: fakeHandle('site.json', lastModified),
    name: 'site.json',
    lastModified,
    openedAt: '2026-10-07T10:00:00.000Z',
    isAutoSaving: false,
  };
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('openPickedFile', () => {
  it('stores a new project and links its file', async () => {
    const project = createSampleProject();
    const handle = fakeHandle('site.json', 10);
    const picked = { text: serializeProject(project), name: 'site.json', lastModified: 10, handle };
    expect(await openPickedFile(picked)).toEqual({ kind: 'opened' });
    expect(db.putProject).toHaveBeenCalledWith(project);
    expect(db.putFileLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: project.id, name: 'site.json', handle }),
    );
  });

  it('reports a conflict when the browser already has the project', async () => {
    const project = createSampleProject();
    vi.mocked(db.getProjectSummary).mockResolvedValue({
      id: project.id,
      title: 'Fieldnote',
      updatedAt: '2026-10-07T10:00:00.000Z',
    });
    const picked = {
      text: serializeProject(project),
      name: 'site.json',
      lastModified: Date.parse('2026-10-07T12:00:00.000Z'),
      handle: null,
    };
    const result = await openPickedFile(picked);
    expect(result.kind === 'conflict' && result.conflict.decision).toBe('replace-or-copy');
    expect(db.putProject).not.toHaveBeenCalled();
  });

  it('opens a conflicting file as a copy with new ids', async () => {
    const project = createSampleProject();
    const picked = { text: '', name: 'site.json', lastModified: 0, handle: null };
    await resolveOpenConflict('copy', { picked, project, decision: 'copy-only' });
    const [stored] = vi.mocked(db.putProject).mock.calls[0] ?? [];
    expect(stored?.id).not.toBe(project.id);
    expect(stored?.settings.title).toBe('Copy of Fieldnote');
  });
});

describe('saveToDisk', () => {
  it('downloads the project file where browsers cannot write files', async () => {
    expect(await saveToDisk(false)).toEqual({ kind: 'downloaded' });
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'fieldnote.json');
    expect(store.getState().editor.linkedFile).toMatchObject({ kind: 'download' });
  });

  it('writes back to the linked file without asking where', async () => {
    vi.mocked(fileAccess.canUseFileSystemAccess).mockReturnValue(true);
    vi.mocked(db.getFileLink).mockResolvedValue(link(store.getState().project, 7));
    expect(await saveToDisk(false)).toEqual({ kind: 'saved' });
    expect(fileAccess.pickSaveHandle).not.toHaveBeenCalled();
    expect(fileAccess.writeFile).toHaveBeenCalled();
    expect(db.putFileLink).toHaveBeenCalledWith(expect.objectContaining({ lastModified: 42 }));
    expect(store.getState().editor.linkedFile).toMatchObject({ name: 'site.json', kind: 'file' });
  });

  it('stops when the file changed elsewhere unless overwriting is allowed', async () => {
    vi.mocked(fileAccess.canUseFileSystemAccess).mockReturnValue(true);
    const stored = { ...link(store.getState().project, 7), handle: fakeHandle('site.json', 99) };
    vi.mocked(db.getFileLink).mockResolvedValue(stored);
    expect(await saveToDisk(false)).toEqual({ kind: 'outside-change' });
    expect(fileAccess.writeFile).not.toHaveBeenCalled();
    expect(await saveToDisk(false, true)).toEqual({ kind: 'saved' });
  });

  it('asks for a new file on Save as and stops when the user cancels', async () => {
    vi.mocked(fileAccess.canUseFileSystemAccess).mockReturnValue(true);
    expect(await saveToDisk(true)).toEqual({ kind: 'cancelled' });
    expect(fileAccess.pickSaveHandle).toHaveBeenCalledWith('fieldnote.json');
  });
});
