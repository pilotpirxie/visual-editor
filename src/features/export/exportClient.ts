import type { ExportFiles, ExportInput, SiteRuntimeChunks } from '../../render/assembleSite';
import type { WritableFolder } from './exportFolder';
import {
  runExportJob,
  type AssembledExport,
  type ExportJob,
  type ExportJobResult,
} from './exportJob';

let hasWarnedAboutFallback = false;

function warnAboutFallback(reason: unknown): void {
  if (hasWarnedAboutFallback) return;
  hasWarnedAboutFallback = true;
  console.warn('Export runs on the main thread because a worker could not start', reason);
}

function createExportWorker(): Worker | null {
  if (typeof Worker !== 'function') return null;
  try {
    return new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    warnAboutFallback(error);
    return null;
  }
}

function runInWorker(worker: Worker, job: ExportJob): Promise<ExportJobResult> {
  return new Promise((resolve, reject) => {
    worker.addEventListener('message', (event: MessageEvent<ExportJobResult>) => {
      resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      reject(new Error(event.message || 'The export worker stopped'));
    });
    worker.addEventListener('messageerror', () => {
      reject(new Error('The export worker sent a message that could not be read'));
    });
    worker.postMessage(job);
  });
}

async function runJob(job: ExportJob): Promise<ExportJobResult> {
  const worker = createExportWorker();
  if (worker === null) return runExportJob(job);
  try {
    return await runInWorker(worker, job);
  } catch (error) {
    warnAboutFallback(error);
    return runExportJob(job);
  } finally {
    worker.terminate();
  }
}

export async function assembleExport(
  input: ExportInput,
  runtime: SiteRuntimeChunks,
): Promise<AssembledExport> {
  const outcome = await runJob({ kind: 'assemble', input, runtime });
  if (outcome.kind === 'failed') throw new Error(outcome.message);
  if (outcome.kind !== 'assembled') throw new Error('The export worker sent an unexpected reply');
  return outcome.assembled;
}

export async function writeExportFolder(folder: WritableFolder, files: ExportFiles): Promise<void> {
  const outcome = await runJob({ kind: 'write-folder', folder, files });
  if (outcome.kind === 'failed') throw new Error(outcome.message);
}
