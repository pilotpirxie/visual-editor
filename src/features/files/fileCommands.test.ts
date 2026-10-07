import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { store } from '../../app/store';
import type { FileLink } from '../../persistence/db';
import { loadIntoAppStore } from '../../test/fixtures';
import { hasPermission, pickProjectFile, readHandle, type PickedFile } from './fileAccess';
import {
  openPickedFile,
  reloadFromFile,
  resolveOpenConflict,
  saveToDisk,
  type OpenConflict,
} from './fileActions';
import { createFileCommands, type FileCommands } from './fileCommands';

vi.mock('./fileAccess', () => ({
  hasPermission: vi.fn(async () => true),
  pickProjectFile: vi.fn(async () => null),
  readHandle: vi.fn(),
}));

vi.mock('./fileActions', () => ({
  openPickedFile: vi.fn(async () => ({ kind: 'opened' })),
  reloadFromFile: vi.fn(async () => {}),
  resolveOpenConflict: vi.fn(async () => {}),
  saveToDisk: vi.fn(async () => ({ kind: 'saved' })),
}));

function fakeHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    isSameEntry: async () => false,
    getFile: async () => new File(['{}'], name),
    createWritable: async () => {
      throw new Error('These tests never write files');
    },
  };
}

function pickedFile(): PickedFile {
  return { text: '{}', name: 'site.json', lastModified: 10, handle: fakeHandle('site.json') };
}

function conflictOf(picked: PickedFile): OpenConflict {
  return { picked, project: createSampleProject(), decision: 'replace-or-copy' };
}

function recentLink(): FileLink {
  return {
    id: 'project-1',
    handle: fakeHandle('site.json'),
    name: 'site.json',
    lastModified: 10,
    openedAt: '2026-10-07T10:00:00.000Z',
    isAutoSaving: false,
  };
}

function noticeTexts(): string[] {
  const texts: string[] = [];
  for (const notice of store.getState().editor.notices) texts.push(notice.text);
  return texts;
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let commands: FileCommands;

beforeEach(() => {
  loadIntoAppStore();
  commands = createFileCommands();
});

describe('openFromDisk', () => {
  it('opens the conflict dialog and tells subscribers when the project is already stored', async () => {
    const picked = pickedFile();
    const conflict = conflictOf(picked);
    vi.mocked(pickProjectFile).mockResolvedValueOnce(picked);
    vi.mocked(openPickedFile).mockResolvedValueOnce({ kind: 'conflict', conflict });
    const listener = vi.fn();
    commands.subscribe(listener);
    commands.openFromDisk();
    await vi.waitFor(() => expect(commands.getDialog()).toEqual({ kind: 'conflict', conflict }));
    expect(openPickedFile).toHaveBeenCalledWith(picked);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('opens a new project without any dialog', async () => {
    vi.mocked(pickProjectFile).mockResolvedValueOnce(pickedFile());
    commands.openFromDisk();
    await vi.waitFor(() => expect(openPickedFile).toHaveBeenCalledTimes(1));
    await settle();
    expect(commands.getDialog()).toBeNull();
  });

  it('does nothing when the user closes the picker', async () => {
    commands.openFromDisk();
    await settle();
    expect(pickProjectFile).toHaveBeenCalledTimes(1);
    expect(openPickedFile).not.toHaveBeenCalled();
    expect(commands.getDialog()).toBeNull();
  });

  it('shows an error notice when the picker fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pickProjectFile).mockRejectedValueOnce(new Error('Blocked by policy'));
    commands.openFromDisk();
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('Opening the file failed: Blocked by policy'),
    );
    expect(consoleError).toHaveBeenCalledWith('Opening the file failed', expect.any(Error));
  });

  it('shows an error notice when the file is not a project', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pickProjectFile).mockResolvedValueOnce(pickedFile());
    vi.mocked(openPickedFile).mockRejectedValueOnce(new Error('This file is not a project file'));
    commands.openFromDisk();
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('Opening the file failed: This file is not a project file'),
    );
    expect(commands.getDialog()).toBeNull();
  });
});

describe('openRecent', () => {
  it('reads the remembered file after asking to read it', async () => {
    const link = recentLink();
    const picked = pickedFile();
    vi.mocked(readHandle).mockResolvedValueOnce(picked);
    commands.openRecent(link);
    await vi.waitFor(() => expect(openPickedFile).toHaveBeenCalledWith(picked));
    expect(hasPermission).toHaveBeenCalledWith(link.handle, 'read', true);
    expect(readHandle).toHaveBeenCalledWith(link.handle);
  });

  it('does not read the file when permission is refused', async () => {
    vi.mocked(hasPermission).mockResolvedValueOnce(false);
    commands.openRecent(recentLink());
    await settle();
    expect(readHandle).not.toHaveBeenCalled();
    expect(openPickedFile).not.toHaveBeenCalled();
  });

  it('names the file in the error notice when it cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(readHandle).mockRejectedValueOnce(new Error('The file was moved'));
    commands.openRecent(recentLink());
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('Opening site.json failed: The file was moved'),
    );
  });
});

describe('save', () => {
  it('saves to the linked file without allowing an overwrite', async () => {
    commands.save(false);
    await vi.waitFor(() => expect(saveToDisk).toHaveBeenCalledWith(false, false));
    await settle();
    expect(commands.getDialog()).toBeNull();
  });

  it('asks for a new file on Save as', async () => {
    commands.save(true);
    await vi.waitFor(() => expect(saveToDisk).toHaveBeenCalledWith(true, false));
  });

  it('opens the outside change dialog when the file changed elsewhere', async () => {
    vi.mocked(saveToDisk).mockResolvedValueOnce({ kind: 'outside-change' });
    commands.save(false);
    await vi.waitFor(() => expect(commands.getDialog()).toEqual({ kind: 'outside-change' }));
  });

  it('shows an error notice when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveToDisk).mockRejectedValueOnce(new Error('Disk is full'));
    commands.save(false);
    await vi.waitFor(() => expect(noticeTexts()).toContain('Saving to disk failed: Disk is full'));
  });
});

describe('dialog choices', () => {
  async function openOutsideChangeDialog(): Promise<void> {
    vi.mocked(saveToDisk).mockResolvedValueOnce({ kind: 'outside-change' });
    commands.save(false);
    await vi.waitFor(() => expect(commands.getDialog()).not.toBeNull());
  }

  it('closes the conflict dialog and runs the chosen way of opening the file', async () => {
    const picked = pickedFile();
    const conflict = conflictOf(picked);
    vi.mocked(pickProjectFile).mockResolvedValueOnce(picked);
    vi.mocked(openPickedFile).mockResolvedValueOnce({ kind: 'conflict', conflict });
    commands.openFromDisk();
    await vi.waitFor(() => expect(commands.getDialog()).not.toBeNull());
    commands.resolveConflict('copy', conflict);
    expect(commands.getDialog()).toBeNull();
    await vi.waitFor(() => expect(resolveOpenConflict).toHaveBeenCalledWith('copy', conflict));
  });

  it('reports a failure while resolving a conflict', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(resolveOpenConflict).mockRejectedValueOnce(new Error('Quota exceeded'));
    commands.resolveConflict('replace', conflictOf(pickedFile()));
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('Opening the file failed: Quota exceeded'),
    );
  });

  it('closes the outside change dialog and overwrites the file', async () => {
    await openOutsideChangeDialog();
    commands.overwrite();
    expect(commands.getDialog()).toBeNull();
    await vi.waitFor(() => expect(saveToDisk).toHaveBeenLastCalledWith(false, true));
  });

  it('closes the outside change dialog and reloads the file', async () => {
    await openOutsideChangeDialog();
    commands.reload();
    expect(commands.getDialog()).toBeNull();
    await vi.waitFor(() => expect(reloadFromFile).toHaveBeenCalledTimes(1));
  });

  it('reports a failure while reloading the file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(reloadFromFile).mockRejectedValueOnce(new Error('The file was moved'));
    commands.reload();
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('Reloading the file failed: The file was moved'),
    );
  });

  it('closes any dialog on request', async () => {
    await openOutsideChangeDialog();
    commands.closeDialog();
    expect(commands.getDialog()).toBeNull();
  });
});

describe('subscribe', () => {
  it('tells every subscriber about each dialog change', () => {
    const first = vi.fn();
    const second = vi.fn();
    commands.subscribe(first);
    commands.subscribe(second);
    commands.closeDialog();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops telling a subscriber once it unsubscribes', () => {
    const listener = vi.fn();
    const unsubscribe = commands.subscribe(listener);
    unsubscribe();
    commands.closeDialog();
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps separate dialogs for separate command sets', async () => {
    const other = createFileCommands();
    vi.mocked(saveToDisk).mockResolvedValueOnce({ kind: 'outside-change' });
    commands.save(false);
    await vi.waitFor(() => expect(commands.getDialog()).not.toBeNull());
    expect(other.getDialog()).toBeNull();
  });
});
