import { useEffect, useId, useMemo, useRef, useState, type JSX } from 'react';
import { behaviors, core } from 'virtual:site-runtime';
import { useAppSettings } from '../../app/appSettings';
import {
  blockSelected,
  designSheetToggled,
  dialogClosed,
  libraryOpened,
  noticeShown,
} from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { slugify } from '../../app/slugs';
import { dispatch, store, useStore } from '../../app/store';
import { componentsFor, ensurePackBlocks } from '../../components/registry';
import type { ExportResult } from '../../render/assembleSite';
import { prepareExportInput } from '../../render/exportSite';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { openPage } from '../pages/pageActions';
import { publishedSiteOf, publishSite, publishTokenOf, type PublishHost } from '../publish/hosts';
import { PublishPanel } from '../publish/PublishPanel';
import { downloadBlob } from './download';
import { assembleExport, writeExportFolder } from './exportClient';
import { canExportToFolder, pickExportFolder } from './exportFolder';
import type { AssembledExport } from './exportJob';
import { collectExportWarnings, type ExportWarning } from './exportWarnings';
import { Button, closeDialogOf, Dialog } from '../../../packages/ui/src';
import './export.css';

const TITLE_ID = 've-export-title';
const BYTES_PER_KILOBYTE = 1024;

type Destination = 'zip' | 'folder' | PublishHost;

type DestinationChoice = { id: Destination; name: string; hint: string };

const DESTINATIONS: readonly DestinationChoice[] = [
  { id: 'zip', name: 'Download a zip', hint: 'One file with the whole site, ready for any host.' },
  {
    id: 'folder',
    name: 'Save to a folder',
    hint: 'Write the files into a folder on this computer.',
  },
  {
    id: 'netlify',
    name: 'Publish to Netlify',
    hint: 'Put the site online in your Netlify account.',
  },
  {
    id: 'github',
    name: 'Publish to GitHub Pages',
    hint: 'Put the site online from a public GitHub repository.',
  },
];

type Outcome = { title: string; message: string; url: string | null };

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

function isPublishHost(destination: Destination): destination is PublishHost {
  return destination === 'netlify' || destination === 'github';
}

async function exportTo(
  destination: Destination,
  assembled: AssembledExport,
): Promise<Outcome | null> {
  if (destination === 'zip') {
    const fileName = exportFileName(store.getState().project.settings.title, new Date());
    downloadBlob(assembled.zip, fileName);
    const message = `Saved ${fileName} (${formatBytes(assembled.zip.size)}).`;
    return { title: 'Site exported', message, url: null };
  } else if (destination === 'folder') {
    const folder = await pickExportFolder();
    if (folder === null) return null;
    await writeExportFolder(folder, assembled.result.files);
    return { title: 'Site exported', message: 'Saved to the folder you chose.', url: null };
  } else {
    const site = await publishSite(destination, assembled);
    const message = 'Published. It can take a minute to show everywhere.';
    return { title: 'Site published', message, url: site.url };
  }
}

function actionLabel(destination: Destination, isPublished: boolean): string {
  if (destination === 'zip') {
    return 'Download zip';
  } else if (destination === 'folder') {
    return 'Save to folder…';
  } else if (isPublished) {
    return 'Publish changes';
  } else if (destination === 'netlify') {
    return 'Publish to Netlify';
  } else {
    return 'Publish to GitHub Pages';
  }
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

function ExportDone({ outcome }: { outcome: Outcome }): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div className="ui-dialog-body">
      <h2 id={TITLE_ID} className="ui-title">
        {outcome.title}
      </h2>
      <p role="status">{outcome.message}</p>
      {outcome.url === null ? (
        <p className="ui-muted">
          To publish, upload these files to any static host. To view it now, open index.html.
        </p>
      ) : (
        <p className="ve-export-address">
          <a href={outcome.url} target="_blank" rel="noopener noreferrer">
            {outcome.url}
          </a>
        </p>
      )}
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

type DestinationPickerProps = {
  destination: Destination;
  isDisabled: boolean;
  onChoose(destination: Destination): void;
};

function DestinationPicker({
  destination,
  isDisabled,
  onChoose,
}: DestinationPickerProps): JSX.Element {
  const name = useId();
  const canUseFolder = canExportToFolder();
  return (
    <fieldset className="ve-export-destinations" disabled={isDisabled}>
      <legend>Where should it go?</legend>
      {DESTINATIONS.map((choice) => {
        if (choice.id === 'folder' && !canUseFolder) return null;
        return (
          <label key={choice.id} className="ve-export-destination">
            <input
              type="radio"
              name={name}
              checked={destination === choice.id}
              onChange={() => onChoose(choice.id)}
            />
            <span className="ve-export-destination-name">{choice.name}</span>
            <span className="ui-muted">{choice.hint}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

type ExportChoiceProps = { assembled: AssembledExport; onDone(outcome: Outcome): void };

function ExportChoice({ assembled, onDone }: ExportChoiceProps): JSX.Element {
  const [destination, setDestination] = useState<Destination>('zip');
  const [isBusy, setIsBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const projectId = useStore((state) => state.project.id);
  const settings = useAppSettings();
  const host = isPublishHost(destination) ? destination : null;
  const isPublished = host !== null && publishedSiteOf(host, settings, projectId) !== null;
  const isTokenMissing = host !== null && publishTokenOf(host, settings).trim() === '';

  async function run(): Promise<void> {
    setIsBusy(true);
    setPublishError(null);
    try {
      const outcome = await exportTo(destination, assembled);
      if (outcome !== null) onDone(outcome);
    } catch (error) {
      console.error('Export failed', error);
      if (host === null) {
        dispatch(noticeShown('error', `Export failed: ${describeError(error)}`));
      } else {
        setPublishError(describeError(error));
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <DestinationPicker
        destination={destination}
        isDisabled={isBusy}
        onChoose={(next) => {
          setDestination(next);
          setPublishError(null);
        }}
      />
      {host !== null && <PublishPanel key={host} host={host} error={publishError} />}
      <div className="ui-dialog-actions">
        {isBusy && host !== null && (
          <span className="ve-export-progress" role="status">
            Publishing… This can take a minute.
          </span>
        )}
        <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
        <Button variant="primary" disabled={isBusy || isTokenMissing} onClick={() => void run()}>
          {actionLabel(destination, isPublished)}
        </Button>
      </div>
    </>
  );
}

export function ExportDialog({ onClose }: { onClose(): void }): JSX.Element {
  const [preparation, setPreparation] = useState<Preparation>({ kind: 'preparing' });
  const [outcome, setOutcome] = useState<Outcome | null>(null);

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

  if (outcome !== null) {
    return (
      <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
        <ExportDone outcome={outcome} />
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
            Everything looks ready. Your site is one HTML file per page, one CSS file and the images
            your pages use.
          </p>
        )}
        {preparation.kind === 'ready' && <Summary result={preparation.assembled.result} />}
        {preparation.kind === 'ready' ? (
          <ExportChoice assembled={preparation.assembled} onDone={setOutcome} />
        ) : (
          <div className="ui-dialog-actions">
            <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
