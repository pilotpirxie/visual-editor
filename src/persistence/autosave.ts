import type { Project } from '../app/types';

export type SaveStatus = 'saved' | 'saving' | 'error';

export type Autosave = {
  schedule(project: Project): void;
  flush(): Promise<void>;
};

type AutosaveOptions = {
  save(project: Project): Promise<void>;
  delayMs: number;
  onStatus(status: SaveStatus): void;
};

export function createAutosave({ save, delayMs, onStatus }: AutosaveOptions): Autosave {
  let pending: Project | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWrite: Promise<void> = Promise.resolve();

  async function saveAndReport(project: Project): Promise<void> {
    try {
      await save(project);
    } catch (error) {
      console.error(`Autosave failed for project ${project.id}`, error);
      onStatus('error');
      return;
    }
    if (pending === null) onStatus('saved');
  }

  async function saveAfter(previousWrite: Promise<void>, project: Project): Promise<void> {
    await previousWrite;
    await saveAndReport(project);
  }

  function write(project: Project): Promise<void> {
    lastWrite = saveAfter(lastWrite, project);
    return lastWrite;
  }

  function flush(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === null) return lastWrite;
    const project = pending;
    pending = null;
    return write(project);
  }

  function schedule(project: Project): void {
    if (pending !== null && pending.id !== project.id) void flush();
    pending = project;
    onStatus('saving');
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => void flush(), delayMs);
  }

  return { schedule, flush };
}
