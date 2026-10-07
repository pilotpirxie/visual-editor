import { useEffect, useState, type JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { slugify } from '../../app/slugs';
import { dispatch, store } from '../../app/store';
import { registry } from '../../components/registry';
import { buildExportFiles, type ExportResult } from '../../render/exportSite';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { downloadBlob } from './download';
import { canExportToFolder, pickExportFolder, writeToFolder } from './exportFolder';
import { collectExportWarnings, type ExportWarning } from './exportWarnings';
import { createZip, zipEntriesOf } from './zip';
import { closeDialogOf, Dialog } from '../../../packages/ui/src';

const TITLE_ID = 've-export-title';
const BYTES_PER_KILOBYTE = 1024;

type Preparation =
  | { kind: 'preparing' }
  | { kind: 'ready'; result: ExportResult; warnings: ExportWarning[] }
  | { kind: 'failed'; message: string };

async function prepareExport(): Promise<Preparation> {
  const { project } = store.getState();
  try {
    await ensureProjectIconSets(project);
    const result = buildExportFiles(project, registry, { core, behaviors });
    return { kind: 'ready', result, warnings: collectExportWarnings(project, registry) };
  } catch (error) {
    console.error('Preparing the export failed', error);
    return { kind: 'failed', message: describeError(error) };
  }
}

function fileSize(content: string | Blob): number {
  if (typeof content === 'string') return new TextEncoder().encode(content).length;
  return content.size;
}

export function formatBytes(bytes: number): string {
  if (bytes < BYTES_PER_KILOBYTE) return `${bytes} B`;
  return `${(bytes / BYTES_PER_KILOBYTE).toFixed(1)} KB`;
}

export function exportFileName(title: string, date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${slugify(title)}-${date.getFullYear()}-${month}-${day}.zip`;
}

function warningPlace(warning: ExportWarning): string {
  const { project } = store.getState();
  if (warning.pageId === null) return 'Shared blocks';
  return project.pages.entities[warning.pageId]?.name ?? 'A page';
}

async function downloadZip(result: ExportResult): Promise<void> {
  const now = new Date();
  const zip = await createZip(await zipEntriesOf(result.files), now);
  downloadBlob(zip, exportFileName(store.getState().project.settings.title, now));
}

async function saveToFolder(result: ExportResult): Promise<boolean> {
  const folder = await pickExportFolder();
  if (folder === null) return false;
  await writeToFolder(folder, result.files);
  dispatch(
    noticeShown('info', `Exported ${Object.keys(result.files).length} files to ${folder.name}.`),
  );
  return true;
}

function Summary({ result }: { result: ExportResult }): JSX.Element {
  const paths = Object.keys(result.files);
  paths.sort();
  const sizes = new Map<string, number>();
  let totalBytes = 0;
  for (const path of paths) {
    const size = fileSize(result.files[path] ?? '');
    sizes.set(path, size);
    totalBytes += size;
  }
  const { omitted } = result;
  return (
    <details className="ve-export-files">
      <summary>
        {paths.length} files, {formatBytes(totalBytes)}
      </summary>
      <ul>
        {paths.map((path) => (
          <li key={path}>
            <span>{path}</span>
            <span className="ui-muted">{formatBytes(sizes.get(path) ?? 0)}</span>
          </li>
        ))}
      </ul>
      <p className="ui-muted">
        Left out: {omitted.components} unused blocks, {omitted.tokens} unused design tokens
        {omitted.primitives.length > 0
          ? `, unused styles for ${omitted.primitives.join(', ')}`
          : ''}
        .
      </p>
    </details>
  );
}

export function ExportDialog({ onClose }: { onClose(): void }): JSX.Element {
  const [preparation, setPreparation] = useState<Preparation>({ kind: 'preparing' });
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function prepare(): Promise<void> {
      const next = await prepareExport();
      if (!isCancelled) setPreparation(next);
    }
    void prepare();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function run(
    action: (result: ExportResult) => Promise<boolean | void>,
    element: Element,
  ): Promise<void> {
    if (preparation.kind !== 'ready') return;
    setIsBusy(true);
    try {
      const isDone = await action(preparation.result);
      if (isDone !== false) closeDialogOf(element);
    } catch (error) {
      console.error('Export failed', error);
      dispatch(noticeShown('error', `Export failed: ${describeError(error)}`));
    } finally {
      setIsBusy(false);
    }
  }

  const hasWarnings = preparation.kind === 'ready' && preparation.warnings.length > 0;
  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Export site
        </h2>
        {preparation.kind === 'preparing' && <p className="ui-muted">Preparing your files…</p>}
        {preparation.kind === 'failed' && (
          <p className="ui-field-error" role="alert">
            The site could not be exported: {preparation.message}
          </p>
        )}
        {preparation.kind === 'ready' && hasWarnings && (
          <div className="ui-dialog-note" role="note">
            <strong>Check these before you publish</strong>
            <ul>
              {preparation.warnings.map((warning, index) => (
                <li key={`${warning.blockId ?? 'page'}-${index}`}>
                  {warningPlace(warning)}: {warning.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {preparation.kind === 'ready' && !hasWarnings && (
          <p>
            Everything looks ready. The zip holds one HTML file per page, one CSS file and the
            images your pages use.
          </p>
        )}
        {preparation.kind === 'ready' && <Summary result={preparation.result} />}
        <div className="ui-dialog-actions">
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          {preparation.kind === 'ready' && canExportToFolder() && (
            <button
              type="button"
              className="ui-button ui-button--secondary"
              disabled={isBusy}
              onClick={(event) => void run(saveToFolder, event.currentTarget)}
            >
              Save to folder…
            </button>
          )}
          {preparation.kind === 'ready' && (
            <button
              type="button"
              className="ui-button ui-button--primary"
              disabled={isBusy}
              onClick={(event) => void run(downloadZip, event.currentTarget)}
            >
              {hasWarnings ? 'Export anyway' : 'Download zip'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
