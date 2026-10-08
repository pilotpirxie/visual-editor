import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { createAutosave, type SaveStatus } from './autosave';

function setup(save: (project: Project) => Promise<void> = async () => {}) {
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
