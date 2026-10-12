import { noticeShown } from '../../app/editorSlice';
import {} from '../../app/errors';
import { packRemoved } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import type { ParsedPackFile } from '../../components/packFormat';
import type { BlockPack, PackInfo } from '../../components/types';
import { slugify } from '../../app/slugs';
import { downloadBlob } from '../export/download';
import { pickFile, type FilePicker } from '../files/fileAccess';
import { reportFailure } from '../files/fileCommands';
import {
  addPackToLibrary,
  addProjectPackToLibrary,
  blockCountLabel,
  loadPackBlocks,
  packInLibrary,
  removePackFromLibrary,
  takenClasses,
} from './packLibrary';
import { packUsage } from './packUpdates';
import { packZip } from './packZip';
import { takeSnapshot } from '../snapshots/snapshots';

type PackDialog =
  { kind: 'load'; fileName: string; reading: ParsedPackFile } | { kind: 'manage' } | null;

export type PackCommands = {
  subscribe(listener: () => void): () => void;
  getDialog(): PackDialog;
  closeDialog(): void;
  manage(): void;
  loadFromDisk(): void;
  loadFile(file: File): void;
  confirm(pack: BlockPack): void;
  remove(packId: string): void;
  removeFromProject(packId: string): void;
  addFromProject(packId: string): void;
  download(pack: BlockPack): void;
};

const PACK_PICKER: FilePicker = {
  id: 'visual-editor-block-packs',
  description: 'Block pack',
  type: 'application/zip',
  extension: '.zip',
};

function removeFromOpenProject(pack: PackInfo): number {
  const { project } = store.getState();
  const { blockCount } = packUsage(project, pack.id);
  void dispatch(takeSnapshot(`Before removing ${pack.name}`, 'auto'));
  dispatch(packRemoved({ packId: pack.id }));
  return blockCount;
}

async function removePack(packId: string): Promise<void> {
  const state = store.getState();
  const pack = packInLibrary(state, packId);
  if (state.editor.isReadOnly || pack === undefined) return;
  await dispatch(removePackFromLibrary(packId));
  const blockCount = removeFromOpenProject(pack);
  const removed =
    blockCount === 0
      ? `Removed ${pack.name} from your library.`
      : `Removed ${pack.name} from your library and ${blockCountLabel(blockCount)} from this project. Undo brings the blocks back.`;
  dispatch(noticeShown('info', removed));
}

function removePackFromProject(packId: string): void {
  const state = store.getState();
  const embedded = Object.values(state.project.packBlocks).find(({ pack }) => pack.id === packId);
  if (state.editor.isReadOnly || embedded === undefined) return;
  const blockCount = removeFromOpenProject(embedded.pack);
  const removed =
    blockCount === 0
      ? `Removed ${embedded.pack.name} from this project.`
      : `Removed ${blockCountLabel(blockCount)} of ${embedded.pack.name} from this project. Undo brings them back.`;
  dispatch(noticeShown('info', removed));
}

function createPackCommands(): PackCommands {
  let dialog: PackDialog = null;
  const listeners = new Set<() => void>();

  function setDialog(next: PackDialog): void {
    dialog = next;
    for (const listener of listeners) listener();
  }

  async function readPack(file: File): Promise<void> {
    const { readBlockPack } = await import('../../components/validatePack');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const taken = takenClasses(store.getState().editor.blockPacks, '');
    const reading = await readBlockPack(bytes, taken);
    await dispatch(loadPackBlocks(reading.blocks));
    setDialog({ kind: 'load', fileName: file.name, reading });
  }

  async function downloadPack(pack: BlockPack): Promise<void> {
    const zip = await packZip(pack);
    downloadBlob(zip, `${slugify(pack.name)}-${pack.version}.zip`);
  }

  async function pickAndRead(): Promise<void> {
    const file = await pickFile(PACK_PICKER);
    if (file === null) return;
    await readPack(file);
  }

  async function addPack(pack: BlockPack): Promise<void> {
    await dispatch(addPackToLibrary(pack));
    setDialog(null);
    const text = `Added ${pack.name} ${pack.version} (${blockCountLabel(pack.blocks.length)}) to your library.`;
    dispatch(noticeShown('info', text));
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getDialog: () => dialog,
    closeDialog: () => setDialog(null),
    manage: () => setDialog({ kind: 'manage' }),
    loadFromDisk() {
      pickAndRead().catch((error: unknown) => reportFailure('Loading the block pack', error));
    },
    loadFile(file) {
      readPack(file).catch((error: unknown) => reportFailure('Loading the block pack', error));
    },
    confirm(pack) {
      addPack(pack).catch((error: unknown) => reportFailure('Adding the block pack', error));
    },
    remove(packId) {
      removePack(packId).catch((error: unknown) => reportFailure('Removing the block pack', error));
    },
    removeFromProject: removePackFromProject,
    addFromProject(packId) {
      dispatch(addProjectPackToLibrary(packId)).catch((error: unknown) =>
        reportFailure('Adding the block pack', error),
      );
    },
    download(pack) {
      downloadPack(pack).catch((error: unknown) =>
        reportFailure('Downloading the block pack', error),
      );
    },
  };
}

export const packCommands = createPackCommands();
