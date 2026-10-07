import { behaviors } from 'virtual:site-runtime';
import { customComponentsLoaded, noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch, store } from '../../app/store';
import { toPackFileJson, type ParsedPackFile } from '../../components/packFormat';
import type { BlockPack } from '../../components/types';
import { slugify } from '../../app/slugs';
import { downloadBlob } from '../export/download';
import { pickJsonFile, readFile, type JsonPicker } from '../files/fileAccess';
import { ensureCustomComponents } from './customComponents';
import {
  addPackToLibrary,
  addProjectPackToLibrary,
  removePackFromLibrary,
  takenClasses,
} from './packLibrary';

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

const PACK_PICKER: JsonPicker = { id: 'visual-editor-block-packs', description: 'Block pack' };

function reportFailure(action: string, error: unknown): void {
  console.error(`${action} failed`, error);
  dispatch(noticeShown('error', `${action} failed: ${describeError(error)}`));
}

function blockCountLabel(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
}

export function createPackCommands(): PackCommands {
  let dialog: PackDialog = null;
  const listeners = new Set<() => void>();

  function setDialog(next: PackDialog): void {
    dialog = next;
    for (const listener of listeners) listener();
  }

  async function readPack(text: string, fileName: string): Promise<void> {
    const { readBlockPack } = await import('./validatePack');
    const reading = await readBlockPack(text, {
      behaviorNames: Object.keys(behaviors),
      takenClasses: takenClasses(store.getState().editor.blockPacks, ''),
    });
    const { hasCompiled } = await ensureCustomComponents(reading.blocks);
    if (hasCompiled) dispatch(customComponentsLoaded());
    setDialog({ kind: 'load', fileName, reading });
  }

  async function pickAndRead(): Promise<void> {
    const picked = await pickJsonFile(PACK_PICKER);
    if (picked === null) return;
    await readPack(picked.text, picked.name);
  }

  async function readDropped(file: File): Promise<void> {
    const picked = await readFile(file);
    await readPack(picked.text, picked.name);
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
      readDropped(file).catch((error: unknown) => reportFailure('Loading the block pack', error));
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
      const json = `${JSON.stringify(toPackFileJson(pack, pack.blocks), null, 2)}\n`;
      const blob = new Blob([json], { type: 'application/json' });
      downloadBlob(blob, `${slugify(pack.name)}-${pack.version}.json`);
    },
  };
}

export const packCommands = createPackCommands();
