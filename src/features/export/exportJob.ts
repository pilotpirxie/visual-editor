import {
  assembleSite,
  type ExportFiles,
  type ExportInput,
  type ExportResult,
  type SiteRuntimeChunks,
} from '../../render/assembleSite';
import { writeToFolder, type WritableFolder } from './exportFolder';
import { createZip, zipEntriesOf } from './zip';

export type ExportJob =
  | { kind: 'assemble'; input: ExportInput; runtime: SiteRuntimeChunks }
  | { kind: 'write-folder'; folder: WritableFolder; files: ExportFiles };

export type AssembledExport = { result: ExportResult; zip: Blob };

export type ExportJobResult =
  | { kind: 'assembled'; assembled: AssembledExport }
  | { kind: 'written' }
  | { kind: 'failed'; message: string };

async function runJob(job: ExportJob): Promise<ExportJobResult> {
  if (job.kind === 'assemble') {
    const result = assembleSite(job.input, job.runtime);
    const zip = await createZip(await zipEntriesOf(result.files));
    return { kind: 'assembled', assembled: { result, zip } };
  }
  await writeToFolder(job.folder, job.files);
  return { kind: 'written' };
}

export async function runExportJob(job: ExportJob): Promise<ExportJobResult> {
  try {
    return await runJob(job);
  } catch (error) {
    console.error(`The export job "${job.kind}" failed`, error);
    return { kind: 'failed', message: error instanceof Error ? error.message : String(error) };
  }
}
