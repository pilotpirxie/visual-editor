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

const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];

export function createAutosave({ save, delayMs, onStatus }: AutosaveOptions): Autosave {
  let pending: Project | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWrite: Promise<void> = Promise.resolve();
  let writesInFlight = 0;
  let hasFailed = false;
  let retriesUsed = 0;

  function stopRetrying(): void {
    retriesUsed = RETRY_DELAYS_MS.length;
  }

  function retryLater(project: Project): void {
    const retryDelayMs = RETRY_DELAYS_MS[retriesUsed];
    if (pending !== null || retryDelayMs === undefined) return;
    retriesUsed += 1;
    pending = project;
    timer = setTimeout(() => void writePending(), retryDelayMs);
  }

  async function saveAndReport(project: Project): Promise<void> {
    try {
      await save(project);
    } catch (error) {
      console.error(`Autosave failed for project ${project.id}`, error);
      hasFailed = true;
      onStatus('error');
      retryLater(project);
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

  function writePending(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === null) return lastWrite;
    const project = pending;
    pending = null;
    return write(project);
  }

  function flush(): Promise<void> {
    stopRetrying();
    return writePending();
  }

  function schedule(project: Project): void {
    if (pending !== null && pending.id !== project.id) void writePending();
    pending = project;
    retriesUsed = 0;
    onStatus('saving');
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => void writePending(), delayMs);
  }

  function discard(projectId: string): void {
    stopRetrying();
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
