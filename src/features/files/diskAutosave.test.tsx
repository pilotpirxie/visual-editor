import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  linkedFileChanged,
  linkedFileOutdated,
  noticeDismissed,
  type LinkedFile,
} from '../../app/editorSlice';
import { createSampleProject } from '../../app/projectFactory';
import { projectLoaded, settingSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { render, runInAct, type Rendered } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { useDiskAutosave } from './diskAutosave';
import { writeAutosavedFile } from './fileActions';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
}));

vi.mock('./fileActions', () => ({
  writeAutosavedFile: vi.fn(async () => 'written'),
}));

const DISK_AUTOSAVE_DELAY_MS = 5000;

const PAUSED_NOTICE = 'Auto-save to site.json is paused. Use Save to disk to reconnect the file.';

function DiskAutosaveHost(): null {
  useDiskAutosave();
  return null;
}

function linkFile(overrides: Partial<LinkedFile> = {}): void {
  const linkedFile: LinkedFile = {
    name: 'site.json',
    savedAt: '2026-10-07T10:00:00.000Z',
    kind: 'file',
    isAutoSaving: true,
    ...overrides,
  };
  runInAct(() => {
    dispatch(linkedFileChanged(linkedFile));
  });
}

function editDescription(description: string): void {
  runInAct(() => {
    dispatch(settingSet('description', description, 'discrete'));
  });
}

function markFileStale(): void {
  runInAct(() => {
    dispatch(linkedFileOutdated());
  });
}

function noticeTexts(): string[] {
  const texts: string[] = [];
  for (const notice of store.getState().editor.notices) texts.push(notice.text);
  return texts;
}

function countOf(texts: string[], wanted: string): number {
  let count = 0;
  for (const text of texts) {
    if (text === wanted) count += 1;
  }
  return count;
}

function dismissAllNotices(): void {
  for (const notice of store.getState().editor.notices) dispatch(noticeDismissed(notice.id));
}

async function waitForDiskAutosave(): Promise<void> {
  await vi.advanceTimersByTimeAsync(DISK_AUTOSAVE_DELAY_MS);
}

let host: Rendered;

beforeEach(() => {
  vi.useFakeTimers();
  loadIntoAppStore();
  dismissAllNotices();
  linkFile();
  host = render(<DiskAutosaveHost />);
});

afterEach(() => {
  host.unmount();
  vi.useRealTimers();
});

describe('useDiskAutosave', () => {
  it('writes the first edit after a save to the linked file', async () => {
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
    expect(writeAutosavedFile).toHaveBeenCalledWith(store.getState().project);
  });

  it('writes the edited project to the linked file five seconds after an edit', async () => {
    markFileStale();
    editDescription('Interview notes for product teams');
    await vi.advanceTimersByTimeAsync(DISK_AUTOSAVE_DELAY_MS - 1);
    expect(writeAutosavedFile).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
    expect(writeAutosavedFile).toHaveBeenCalledWith(store.getState().project);
  });

  it('writes a burst of edits once, with the latest project', async () => {
    markFileStale();
    editDescription('First draft');
    editDescription('Second draft');
    editDescription('Final draft');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
    const written = vi.mocked(writeAutosavedFile).mock.calls[0]?.[0];
    expect(written?.settings.description).toBe('Final draft');
  });

  it('does not write when auto-save to the file is off', async () => {
    linkFile({ isAutoSaving: false });
    markFileStale();
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).not.toHaveBeenCalled();
  });

  it('does not write when the project has no linked file', async () => {
    runInAct(() => {
      dispatch(linkedFileChanged(null));
    });
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).not.toHaveBeenCalled();
  });

  it('does not write a project just because it was opened', async () => {
    const other = createSampleProject();
    runInAct(() => {
      dispatch(projectLoaded({ project: other, pageId: other.pages.homePageId }));
    });
    await waitForDiskAutosave();
    expect(writeAutosavedFile).not.toHaveBeenCalled();
  });

  it('still writes the pending edit of the previous project after another one opens', async () => {
    editDescription('Interview notes');
    const edited = store.getState().project;
    const other = createSampleProject();
    runInAct(() => {
      dispatch(projectLoaded({ project: other, pageId: other.pages.homePageId }));
    });
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
    expect(writeAutosavedFile).toHaveBeenCalledWith(edited);
  });

  it('shows the paused notice once while writes stay paused', async () => {
    vi.mocked(writeAutosavedFile).mockResolvedValue('paused');
    markFileStale();
    editDescription('First draft');
    await waitForDiskAutosave();
    editDescription('Second draft');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(2);
    expect(countOf(noticeTexts(), PAUSED_NOTICE)).toBe(1);
  });

  it('shows the paused notice again after a write succeeded in between', async () => {
    vi.mocked(writeAutosavedFile)
      .mockResolvedValueOnce('paused')
      .mockResolvedValueOnce('written')
      .mockResolvedValueOnce('paused');
    markFileStale();
    editDescription('First draft');
    await waitForDiskAutosave();
    editDescription('Second draft');
    await waitForDiskAutosave();
    markFileStale();
    editDescription('Third draft');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(3);
    expect(countOf(noticeTexts(), PAUSED_NOTICE)).toBe(2);
  });

  it('shows no notice when the project is not linked any more', async () => {
    vi.mocked(writeAutosavedFile).mockResolvedValue('not-linked');
    markFileStale();
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
    expect(noticeTexts()).toEqual([]);
  });

  it('logs a failed write without showing the paused notice', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(writeAutosavedFile).mockRejectedValue(new Error('Disk is full'));
    markFileStale();
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(consoleError).toHaveBeenCalledWith(
      `Autosave failed for project ${store.getState().project.id}`,
      expect.any(Error),
    );
    expect(noticeTexts()).toEqual([]);
  });

  it('writes a pending edit right away when the editor closes', async () => {
    markFileStale();
    editDescription('Interview notes');
    host.unmount();
    await vi.advanceTimersByTimeAsync(0);
    expect(writeAutosavedFile).toHaveBeenCalledTimes(1);
  });

  it('stops watching edits once the editor closes', async () => {
    host.unmount();
    markFileStale();
    editDescription('Interview notes');
    await waitForDiskAutosave();
    expect(writeAutosavedFile).not.toHaveBeenCalled();
  });
});
