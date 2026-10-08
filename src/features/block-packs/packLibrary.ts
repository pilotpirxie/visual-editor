import { blockPacksLoaded, packBlocksLoaded, noticeShown } from '../../app/editorSlice';
import { customBlocksUpgraded } from '../../app/projectSlice';
import type { AppThunk, RootState } from '../../app/store';
import { compareVersions, rootClassOf, type PackError } from '../../components/packFormat';
import { builtInComponents, ensurePackBlocks } from '../../components/registry';
import type { BlockPack, LibraryEntry, PackBlock, PackInfo } from '../../components/types';
import { deleteBlockPack, listBlockPacks, putBlockPack } from '../../persistence/db';
import { upgradeNotice, upgradeProjectToPack, type UpgradeRule } from './packUpdates';

export function blockCountLabel(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
}

export function libraryEntries(packs: readonly BlockPack[]): LibraryEntry[] {
  const entries: LibraryEntry[] = [...builtInComponents.values()];
  for (const pack of packs) entries.push(...pack.blocks);
  return entries;
}

export function loadPackBlocks(packBlocks: Iterable<PackBlock>): AppThunk<Promise<PackError[]>> {
  return async (dispatch) => {
    const { hasCompiled, problems } = await ensurePackBlocks(packBlocks);
    if (hasCompiled) dispatch(packBlocksLoaded());
    return problems;
  };
}

function packEntryFor(packs: readonly BlockPack[], componentId: string): PackBlock | undefined {
  for (const pack of packs) {
    const custom = pack.blocks.find(({ definition }) => definition.id === componentId);
    if (custom !== undefined) return custom;
  }
  return undefined;
}

export function customEntryFor(state: RootState, componentId: string): PackBlock | undefined {
  if (builtInComponents.has(componentId)) return undefined;
  const embedded = state.project.packBlocks[componentId];
  if (embedded !== undefined) return embedded;
  return packEntryFor(state.editor.blockPacks, componentId);
}

export function takenClasses(
  packs: readonly BlockPack[],
  exceptPackId: string,
): Map<string, string> {
  const classes = new Map<string, string>();
  for (const pack of packs) {
    if (pack.id === exceptPackId) continue;
    for (const { definition } of pack.blocks) {
      classes.set(rootClassOf(definition.id), definition.id);
    }
  }
  return classes;
}

export function loadPackLibrary(): AppThunk<Promise<BlockPack[]>> {
  return async (dispatch, getState) => {
    const packs = await listBlockPacks();
    const current = getState().editor.blockPacks;
    if (JSON.stringify(current) === JSON.stringify(packs)) return current;
    dispatch(blockPacksLoaded(packs));
    return packs;
  };
}

function upgradeOpenProject(pack: BlockPack, rule: UpgradeRule): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const upgrade = upgradeProjectToPack(getState().project, pack, rule);
    if (upgrade === null) return;
    await dispatch(loadPackBlocks(Object.values(upgrade.definitions)));
    dispatch(customBlocksUpgraded({ definitions: upgrade.definitions, blocks: upgrade.blocks }));
    dispatch(noticeShown('info', upgradeNotice(pack, upgrade)));
  };
}

export function missingPacks(
  packBlocks: Record<string, PackBlock>,
  libraryPacks: readonly BlockPack[],
): PackInfo[] {
  const libraryIds = new Set(libraryPacks.map(({ id }) => id));
  const missing = new Map<string, PackInfo>();
  for (const { pack } of Object.values(packBlocks)) {
    if (!libraryIds.has(pack.id)) missing.set(pack.id, pack);
  }
  return [...missing.values()];
}

export function syncProjectWithLibrary(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const packs = await dispatch(loadPackLibrary());
    for (const pack of packs) await dispatch(upgradeOpenProject(pack, 'newer'));
    const { project, editor } = getState();
    for (const pack of missingPacks(project.packBlocks, editor.blockPacks)) {
      dispatch(
        noticeShown(
          'info',
          `This project uses blocks from “${pack.name}”, which is not in your library. You can add it from Blocks › Manage packs.`,
        ),
      );
    }
  };
}

export function packInLibrary(state: RootState, packId: string): BlockPack | undefined {
  return state.editor.blockPacks.find(({ id }) => id === packId);
}

export function canReplacePack(existing: BlockPack | undefined, offered: PackInfo): boolean {
  return existing === undefined || compareVersions(offered.version, existing.version) >= 0;
}

export function addPackToLibrary(pack: BlockPack): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const existing = packInLibrary(getState(), pack.id);
    if (!canReplacePack(existing, pack)) {
      throw new Error(`Your library already has the newer version ${existing?.version ?? ''}`);
    }
    await putBlockPack(pack);
    await dispatch(loadPackLibrary());
    await dispatch(upgradeOpenProject(pack, 'newer-or-changed'));
  };
}

export function removePackFromLibrary(packId: string): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await deleteBlockPack(packId);
    await dispatch(loadPackLibrary());
  };
}

export function addProjectPackToLibrary(packId: string): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const blocks = Object.values(getState().project.packBlocks).filter(
      (custom) => custom.pack.id === packId,
    );
    const [first] = blocks;
    if (first === undefined) return;
    await putBlockPack({ ...first.pack, blocks, isPartial: true });
    await dispatch(loadPackLibrary());
  };
}
