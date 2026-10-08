import { useMemo, useState, type JSX } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch, useStore } from '../../app/store';
import type { BlockPack, PackInfo } from '../../components/types';
import { packCommands } from './packCommands';
import { blockCountLabel, missingPacks } from './packLibrary';
import { createZip, type ZipEntry } from '../export/zip';
import { downloadBlob } from '../export/download';
import { Button, closeDialogOf, Dialog } from '../../../packages/ui/src';

const TITLE_ID = 've-manage-packs-title';
const EXAMPLE_FOLDER = './example-pack/';
const EXAMPLE_FILE_NAME = 'example-block-pack.zip';

const exampleTextFiles = import.meta.glob<string>('./example-pack/**/*.{json,hbs,css}', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const exampleThumbnails = import.meta.glob<string>('./example-pack/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

async function fetchBytes(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

async function examplePackZip(): Promise<Blob> {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [];
  for (const [path, text] of Object.entries(exampleTextFiles)) {
    entries.push({ path: path.slice(EXAMPLE_FOLDER.length), data: encoder.encode(text) });
  }
  for (const [path, url] of Object.entries(exampleThumbnails)) {
    entries.push({ path: path.slice(EXAMPLE_FOLDER.length), data: await fetchBytes(url) });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return createZip(entries);
}

async function saveExamplePack(): Promise<void> {
  downloadBlob(await examplePackZip(), EXAMPLE_FILE_NAME);
}

function downloadExamplePack(): void {
  saveExamplePack().catch((error: unknown) => {
    console.error('Downloading the example pack failed', error);
    dispatch(noticeShown('error', `Downloading the example pack failed: ${describeError(error)}`));
  });
}

function PackRow({ pack }: { pack: BlockPack }): JSX.Element {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  return (
    <li className="ve-pack-row">
      <div className="ve-pack-info">
        <strong>
          {pack.name} {pack.version}
        </strong>
        {pack.isPartial && <span className="ve-pack-badge">Partial</span>}
        <span className="ui-muted">
          {pack.author} · {pack.license} · {blockCountLabel(pack.blocks.length)}
        </span>
      </div>
      <div className="ve-pack-actions">
        {isConfirmingRemove ? (
          <>
            <Button variant="secondary" onClick={() => setIsConfirmingRemove(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => packCommands.remove(pack.id)}>
              Remove from library
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={packCommands.loadFromDisk}>
              Update
            </Button>
            {!pack.isPartial && (
              <Button variant="ghost" onClick={() => packCommands.download(pack)}>
                Download
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsConfirmingRemove(true)}>
              Remove
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function MissingPackRow({ pack }: { pack: PackInfo }): JSX.Element {
  return (
    <li className="ve-pack-row">
      <div className="ve-pack-info">
        <strong>
          {pack.name} {pack.version}
        </strong>
        <span className="ui-muted">
          {pack.author} · {pack.license}
        </span>
      </div>
      <div className="ve-pack-actions">
        <Button variant="ghost" onClick={() => packCommands.addFromProject(pack.id)}>
          Add to library
        </Button>
      </div>
    </li>
  );
}

export function ManagePacksDialog(): JSX.Element {
  const packs = useStore((state) => state.editor.blockPacks);
  const packBlocks = useStore((state) => state.project.packBlocks);
  const missing = useMemo(() => missingPacks(packBlocks, packs), [packBlocks, packs]);

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={packCommands.closeDialog}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Block packs
        </h2>
        {packs.length === 0 ? (
          <p className="ui-muted">
            No block packs yet. Load a pack file to add custom blocks to your library.
          </p>
        ) : (
          <ul className="ve-pack-list" aria-label="Packs in your library">
            {packs.map((pack) => (
              <PackRow key={pack.id} pack={pack} />
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <section className="ve-pack-missing">
            <h3 className="ui-title">Used by this project, not in your library</h3>
            <ul className="ve-pack-list">
              {missing.map((pack) => (
                <MissingPackRow key={pack.id} pack={pack} />
              ))}
            </ul>
          </section>
        )}
        <div className="ui-dialog-actions ve-pack-footer">
          <Button className="ve-pack-example" variant="ghost" onClick={downloadExamplePack}>
            Download example pack
          </Button>
          <Button variant="secondary" onClick={packCommands.loadFromDisk}>
            Load block pack…
          </Button>
          <Button variant="primary" onClick={(event) => closeDialogOf(event.currentTarget)}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
