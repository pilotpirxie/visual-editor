import { useMemo, useState, type JSX } from 'react';
import { useStore } from '../../app/store';
import type { BlockPack, PackInfo } from '../../components/types';
import exampleUrl from './example-pack.json?url';
import { packCommands } from './packCommands';
import { missingPacks } from './packLibrary';
import { Button, closeDialogOf, Dialog } from '../../../packages/ui/src';

const TITLE_ID = 've-manage-packs-title';

function blockCount(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
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
          {pack.author} · {pack.license} · {blockCount(pack.blocks.length)}
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
  const customDefinitions = useStore((state) => state.project.customDefinitions);
  const missing = useMemo(() => missingPacks(customDefinitions, packs), [customDefinitions, packs]);

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
          <a className="ve-pack-example" href={exampleUrl} download="example-block-pack.json">
            Download example pack
          </a>
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
