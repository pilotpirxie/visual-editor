import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch, store } from '../../app/store';
import type { ParsedPackFile } from '../../components/packFormat';
import type { BlockPack } from '../../components/types';
import { slugify } from '../../app/slugs';
import { downloadBlob } from '../export/download';
import { pickFile, type FilePicker } from '../files/fileAccess';
import {
  addPackToLibrary,
  addProjectPackToLibrary,
  blockCountLabel,
  loadPackBlocks,
  removePackFromLibrary,
  takenClasses,
} from './packLibrary';
import { packZip } from './packZip';

export type PackDialog =
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
  addFromProject(packId: string): void;
  download(pack: BlockPack): void;
};

const PACK_PICKER: FilePicker = {
  id: 'visual-editor-block-packs',
  description: 'Block pack',
  type: 'application/zip',
  extension: '.zip',
};

function reportFailure(action: string, error: unknown): void {
  console.error(`${action} failed`, error);
  dispatch(noticeShown('error', `${action} failed: ${describeError(error)}`));
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
      dispatch(removePackFromLibrary(packId)).catch((error: unknown) =>
        reportFailure('Removing the block pack', error),
      );
    },
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
