import type { Project } from '../app/types';

export type SaveStatus = 'saved' | 'saving' | 'error';

export type Autosave = {
  schedule(project: Project): void;
  flush(): Promise<void>;
  discard(projectId: string): void;
  hasUnsavedChanges(): boolean;
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
  let writesInFlight = 0;
  let hasFailed = false;

  async function saveAndReport(project: Project): Promise<void> {
    try {
      await save(project);
    } catch (error) {
      console.error(`Autosave failed for project ${project.id}`, error);
      hasFailed = true;
      onStatus('error');
      return;
    }
    hasFailed = false;
    if (pending === null) onStatus('saved');
  }

  async function saveAfter(previousWrite: Promise<void>, project: Project): Promise<void> {
    writesInFlight += 1;
    try {
      await previousWrite;
      await saveAndReport(project);
    } finally {
      writesInFlight -= 1;
    }
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

  function discard(projectId: string): void {
    if (pending?.id !== projectId) return;
    pending = null;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    onStatus('saved');
  }

  function hasUnsavedChanges(): boolean {
    return pending !== null || writesInFlight > 0 || hasFailed;
  }

  return { schedule, flush, discard, hasUnsavedChanges };
}
