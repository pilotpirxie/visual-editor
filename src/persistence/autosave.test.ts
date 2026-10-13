import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { createAutosave, type SaveStatus } from './autosave';

type AutosaveFixture = {
  autosave: ReturnType<typeof createAutosave>;
  saved: Project[];
  statuses: SaveStatus[];
};

function setup(save: (project: Project) => Promise<void> = async () => {}): AutosaveFixture {
  const saved: Project[] = [];
  const statuses: SaveStatus[] = [];
  const autosave = createAutosave({
    save: async (project) => {
      await save(project);
      saved.push(project);
    },
    delayMs: 1000,
    onStatus: (status) => statuses.push(status),
  });
  return { autosave, saved, statuses };
}

function edited(project: Project, title: string): Project {
  return { ...project, settings: { ...project.settings, title } };
}

describe('createAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves the latest project once, one second after the last change', async () => {
    const { autosave, saved, statuses } = setup();
    const project = createSampleProject();
    autosave.schedule(edited(project, 'A'));
    await vi.advanceTimersByTimeAsync(600);
    autosave.schedule(edited(project, 'AB'));
    await vi.advanceTimersByTimeAsync(999);
    expect(saved).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(saved.map(({ settings }) => settings.title)).toEqual(['AB']);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('drops a pending save for a project that was deleted elsewhere', async () => {
    const { autosave, saved, statuses } = setup();
    const project = createSampleProject();
    autosave.schedule(project);
    autosave.discard(project.id);
    await vi.advanceTimersByTimeAsync(1000);
    await autosave.flush();
    expect(saved).toHaveLength(0);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('keeps a pending save for another project when discarding', async () => {
    const { autosave, saved } = setup();
    const project = createSampleProject();
    autosave.schedule(project);
    autosave.discard('another-project');
    await autosave.flush();
    expect(saved).toHaveLength(1);
  });

  it('saves immediately on flush', async () => {
    const { autosave, saved } = setup();
    autosave.schedule(createSampleProject());
    await autosave.flush();
    expect(saved).toHaveLength(1);
  });

  it('saves a pending project before scheduling another project', async () => {
    const { autosave, saved } = setup();
    const first = createSampleProject();
    const second = createSampleProject();
    autosave.schedule(first);
    autosave.schedule(second);
    await autosave.flush();
    expect(saved.map(({ id }) => id)).toEqual([first.id, second.id]);
  });

  it('reports an error when saving fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { autosave, statuses } = setup(async () => {
      throw new Error('Quota exceeded');
    });
    autosave.schedule(createSampleProject());
    await autosave.flush();
    expect(statuses.at(-1)).toBe('error');
    expect(error).toHaveBeenCalled();
    expect(autosave.hasUnsavedChanges()).toBe(true);
    error.mockRestore();
  });

  it('tries a failed save again until it works', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const { autosave, saved, statuses } = setup(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('The connection is closing');
    });
    autosave.schedule(createSampleProject());
    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses.at(-1)).toBe('error');
    expect(autosave.hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(saved).toHaveLength(1);
    expect(statuses.at(-1)).toBe('saved');
    expect(autosave.hasUnsavedChanges()).toBe(false);
    error.mockRestore();
  });

  it('gives up after three more tries when saving keeps failing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const { autosave, statuses } = setup(async () => {
      attempts += 1;
      throw new Error('Quota exceeded');
    });
    autosave.schedule(createSampleProject());
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 10_000 + 30_000);
    expect(attempts).toBe(4);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(attempts).toBe(4);
    expect(statuses.at(-1)).toBe('error');
    expect(autosave.hasUnsavedChanges()).toBe(true);
    error.mockRestore();
  });

  it('saves a newer edit instead of trying the failed one again', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const { autosave, saved } = setup(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('The connection is closing');
    });
    const project = createSampleProject();
    autosave.schedule(edited(project, 'A'));
    await vi.advanceTimersByTimeAsync(1000);
    autosave.schedule(edited(project, 'AB'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(saved.map(({ settings }) => settings.title)).toEqual(['AB']);
    error.mockRestore();
  });

  it('does not try again after a flush, so nothing is written once editing has ended', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const { autosave } = setup(async () => {
      attempts += 1;
      throw new Error('Quota exceeded');
    });
    autosave.schedule(createSampleProject());
    await vi.advanceTimersByTimeAsync(1000);
    await autosave.flush();
    expect(attempts).toBe(2);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(attempts).toBe(2);
    error.mockRestore();
  });

  it('does not try again for a project that was deleted elsewhere', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const { autosave } = setup(async () => {
      attempts += 1;
      throw new Error('Quota exceeded');
    });
    const project = createSampleProject();
    autosave.schedule(project);
    await vi.advanceTimersByTimeAsync(1000);
    autosave.discard(project.id);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(attempts).toBe(1);
    error.mockRestore();
  });

  it('has unsaved changes from the first edit until the write finishes', async () => {
    let finishWrite = (): void => {};
    const { autosave } = setup(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    expect(autosave.hasUnsavedChanges()).toBe(false);
    autosave.schedule(createSampleProject());
    expect(autosave.hasUnsavedChanges()).toBe(true);
    const flushed = autosave.flush();
    expect(autosave.hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    finishWrite();
    await flushed;
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });
});
