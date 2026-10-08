import { useEffect, useId, useMemo, useRef, useState, type JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import {
  blockSelected,
  designSheetToggled,
  dialogClosed,
  libraryOpened,
  noticeShown,
} from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { slugify } from '../../app/slugs';
import { dispatch, store } from '../../app/store';
import { componentsFor, ensurePackBlocks } from '../../components/registry';
import type { ExportResult } from '../../render/assembleSite';
import { prepareExportInput } from '../../render/exportSite';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { openPage } from '../pages/pageActions';
import { downloadBlob } from './download';
import { assembleExport, writeExportFolder } from './exportClient';
import { canExportToFolder, pickExportFolder } from './exportFolder';
import type { AssembledExport } from './exportJob';
import { collectExportWarnings, type ExportWarning } from './exportWarnings';
import { Button, closeDialogOf, Dialog } from '../../../packages/ui/src';
import './export.css';

const TITLE_ID = 've-export-title';
const BYTES_PER_KILOBYTE = 1024;

type Preparation =
  | { kind: 'preparing' }
  | { kind: 'ready'; assembled: AssembledExport; warnings: ExportWarning[] }
  | { kind: 'failed'; message: string };

async function prepareExport(): Promise<Preparation> {
  const { project } = store.getState();
  try {
    await ensureProjectIconSets(project);
    await ensurePackBlocks(Object.values(project.packBlocks));
    const components = componentsFor(project);
    const input = prepareExportInput(project, components);
    const assembled = await assembleExport(input, { core, behaviors });
    return { kind: 'ready', assembled, warnings: collectExportWarnings(project, components) };
  } catch (error) {
    console.error('Preparing the export failed', error);
    return { kind: 'failed', message: describeError(error) };
  }
}

const textEncoder = new TextEncoder();

function fileSize(content: string | Blob): number {
  if (typeof content === 'string') return textEncoder.encode(content).length;
  return content.size;
}

type FileSizes = { paths: string[]; sizes: Map<string, number>; totalBytes: number };

function fileSizesOf(files: ExportResult['files']): FileSizes {
  const paths = Object.keys(files);
  paths.sort();
  const sizes = new Map<string, number>();
  let totalBytes = 0;
  for (const path of paths) {
    const size = fileSize(files[path] ?? '');
    sizes.set(path, size);
    totalBytes += size;
  }
  return { paths, sizes, totalBytes };
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

function selectOnPage(pageId: string | null, blockId: string | null): void {
  const { editor } = store.getState();
  if (pageId === null || editor.currentPageId === pageId) {
    dispatch(blockSelected(blockId));
    return;
  }
  const fromPageId = editor.currentPageId;
  const unsubscribe = store.subscribe(() => {
    const { currentPageId } = store.getState().editor;
    if (currentPageId === fromPageId) return;
    unsubscribe();
    if (currentPageId === pageId) dispatch(blockSelected(blockId));
  });
  dispatch(openPage(pageId));
}

function fixWarning(warning: ExportWarning): void {
  dispatch(dialogClosed());
  if (warning.blockId !== null || warning.pageId !== null) {
    selectOnPage(warning.pageId, warning.blockId);
  } else if (warning.siteArea === 'design') {
    dispatch(designSheetToggled(true));
  } else {
    dispatch(libraryOpened('settings'));
  }
}

async function downloadZip({ zip }: AssembledExport): Promise<string> {
  const fileName = exportFileName(store.getState().project.settings.title, new Date());
  downloadBlob(zip, fileName);
  return `Saved ${fileName} (${formatBytes(zip.size)}).`;
}

async function saveToFolder({ result }: AssembledExport): Promise<string | null> {
  const folder = await pickExportFolder();
  if (folder === null) return null;
  await writeExportFolder(folder, result.files);
  return 'Saved to the folder you chose.';
}

function WarningList({ warnings }: { warnings: ExportWarning[] }): JSX.Element {
  const idPrefix = useId();
  return (
    <section className="ve-export-warnings" role="note" aria-labelledby={`${idPrefix}-title`}>
      <h3 id={`${idPrefix}-title`} className="ve-export-warnings-title">
        Before you publish
      </h3>
      <ul>
        {warnings.map((warning, index) => {
          const textId = `${idPrefix}-${index}`;
          return (
            <li key={`${warning.blockId ?? warning.pageId ?? 'site'}-${index}`}>
              <span id={textId}>{warning.text}</span>
              <Button variant="ghost" aria-describedby={textId} onClick={() => fixWarning(warning)}>
                Fix
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExportDone({ message }: { message: string }): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div className="ui-dialog-body">
      <h2 id={TITLE_ID} className="ui-title">
        Site exported
      </h2>
      <p role="status">{message}</p>
      <p className="ui-muted">
        To publish, upload these files to any static host. To view it now, open index.html.
      </p>
      <div className="ui-dialog-actions">
        <Button
          ref={closeRef}
          variant="primary"
          onClick={(event) => closeDialogOf(event.currentTarget)}
        >
          Close
        </Button>
      </div>
    </div>
  );
}

function Summary({ result }: { result: ExportResult }): JSX.Element {
  const { paths, sizes, totalBytes } = useMemo(() => fileSizesOf(result.files), [result.files]);
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
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

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
    action: (assembled: AssembledExport) => Promise<string | null>,
  ): Promise<void> {
    if (preparation.kind !== 'ready') return;
    setIsBusy(true);
    try {
      const message = await action(preparation.assembled);
      if (message !== null) setDoneMessage(message);
    } catch (error) {
      console.error('Export failed', error);
      dispatch(noticeShown('error', `Export failed: ${describeError(error)}`));
    } finally {
      setIsBusy(false);
    }
  }

  if (doneMessage !== null) {
    return (
      <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
        <ExportDone message={doneMessage} />
      </Dialog>
    );
  }

  const hasWarnings = preparation.kind === 'ready' && preparation.warnings.length > 0;
  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Export site
        </h2>
        {preparation.kind === 'preparing' && (
          <p className="ui-muted" role="status">
            Preparing your files…
          </p>
        )}
        {preparation.kind === 'failed' && (
          <p className="ui-field-error" role="alert">
            The site could not be exported: {preparation.message}
          </p>
        )}
        {preparation.kind === 'ready' && hasWarnings && (
          <WarningList warnings={preparation.warnings} />
        )}
        {preparation.kind === 'ready' && !hasWarnings && (
          <p>
            Everything looks ready. The zip holds one HTML file per page, one CSS file and the
            images your pages use.
          </p>
        )}
        {preparation.kind === 'ready' && <Summary result={preparation.assembled.result} />}
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
              onClick={() => void run(saveToFolder)}
            >
              Save to folder…
            </button>
          )}
          {preparation.kind === 'ready' && (
            <button
              type="button"
              className="ui-button ui-button--primary"
              disabled={isBusy}
              onClick={() => void run(downloadZip)}
            >
              Download zip
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
