import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { linkedFileChanged } from '../../app/editorSlice';
import { createSampleProject } from '../../app/projectFactory';
import { dispatch } from '../../app/store';
import { click, getButton, queryButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { pickProjectFile, type PickedFile } from './fileAccess';
import {
  openPickedFile,
  reloadFromFile,
  resolveOpenConflict,
  saveToDisk,
  type OpenConflict,
} from './fileActions';
import { fileCommands } from './fileCommands';
import { FileDialogs } from './FileDialogs';

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

const picked: PickedFile = { text: '{}', name: 'site.json', lastModified: 10, handle: null };

function conflictOf(decision: OpenConflict['decision']): OpenConflict {
  return { picked, project: createSampleProject(), decision };
}

async function openConflictDialog(conflict: OpenConflict): Promise<void> {
  vi.mocked(pickProjectFile).mockResolvedValueOnce(picked);
  vi.mocked(openPickedFile).mockResolvedValueOnce({ kind: 'conflict', conflict });
  fileCommands.openFromDisk();
  await vi.waitFor(() => expect(fileCommands.getDialog()).not.toBeNull());
}

async function openOutsideChangeDialog(): Promise<void> {
  vi.mocked(saveToDisk).mockResolvedValueOnce({ kind: 'outside-change' });
  fileCommands.save(false);
  await vi.waitFor(() => expect(fileCommands.getDialog()).not.toBeNull());
  vi.mocked(saveToDisk).mockClear();
}

function dialogIn(container: HTMLElement): HTMLDialogElement | null {
  return container.querySelector('dialog');
}

function headingOf(container: HTMLElement): string {
  return container.querySelector('h2')?.textContent ?? '';
}

function closeAnyDialog(): void {
  runInAct(() => fileCommands.closeDialog());
}

beforeEach(() => {
  loadIntoAppStore();
  closeAnyDialog();
});

afterEach(() => {
  closeAnyDialog();
});

describe('FileDialogs', () => {
  it('renders nothing while no file dialog is open', () => {
    const { container } = render(<FileDialogs />);
    expect(container.innerHTML).toBe('');
  });
});

describe('the same project dialog', () => {
  it('offers to replace the stored copy when the file is newer', async () => {
    const conflict = conflictOf('replace-or-copy');
    await openConflictDialog(conflict);
    const { container } = render(<FileDialogs />);
    expect(dialogIn(container)?.open).toBe(true);
    expect(headingOf(container)).toBe('“Fieldnote” is already in this browser');
    expect(container.textContent).toContain('site.json is newer than the copy saved');
    click(getButton(container, 'Replace'));
    expect(resolveOpenConflict).toHaveBeenCalledWith('replace', conflict);
    expect(dialogIn(container)).toBeNull();
  });

  it('only offers a copy when the stored project is newer than the file', async () => {
    const conflict = conflictOf('copy-only');
    await openConflictDialog(conflict);
    const { container } = render(<FileDialogs />);
    expect(queryButton(container, 'Replace')).toBeNull();
    expect(container.textContent).toContain('is newer than site.json');
    click(getButton(container, 'Open as copy'));
    expect(resolveOpenConflict).toHaveBeenCalledWith('copy', conflict);
    expect(dialogIn(container)).toBeNull();
  });

  it('closes without opening anything on Cancel', async () => {
    await openConflictDialog(conflictOf('replace-or-copy'));
    const { container } = render(<FileDialogs />);
    click(getButton(container, 'Cancel'));
    expect(dialogIn(container)).toBeNull();
    expect(fileCommands.getDialog()).toBeNull();
    expect(resolveOpenConflict).not.toHaveBeenCalled();
  });
});

describe('the outside change dialog', () => {
  it('names the linked file that changed', async () => {
    runInAct(() => {
      dispatch(
        linkedFileChanged({ name: 'site.json', savedAt: null, kind: 'file', isAutoSaving: false }),
      );
    });
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    expect(headingOf(container)).toBe('site.json changed outside the editor');
  });

  it('falls back to a generic name without a linked file', async () => {
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    expect(headingOf(container)).toBe('The file changed outside the editor');
  });

  it('overwrites the file and closes', async () => {
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    click(getButton(container, 'Overwrite'));
    expect(dialogIn(container)).toBeNull();
    await vi.waitFor(() => expect(saveToDisk).toHaveBeenCalledWith(false, true));
  });

  it('reloads the project from the file and closes', async () => {
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    click(getButton(container, 'Reload from file'));
    expect(dialogIn(container)).toBeNull();
    await vi.waitFor(() => expect(reloadFromFile).toHaveBeenCalledTimes(1));
  });

  it('saves to a new file and closes', async () => {
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    click(getButton(container, 'Save as…'));
    expect(dialogIn(container)).toBeNull();
    await vi.waitFor(() => expect(saveToDisk).toHaveBeenCalledWith(true, false));
  });

  it('closes without saving or reloading on Cancel', async () => {
    await openOutsideChangeDialog();
    const { container } = render(<FileDialogs />);
    click(getButton(container, 'Cancel'));
    expect(dialogIn(container)).toBeNull();
    expect(saveToDisk).not.toHaveBeenCalled();
    expect(reloadFromFile).not.toHaveBeenCalled();
  });
});
