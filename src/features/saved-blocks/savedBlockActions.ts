import { noticeShown, savedBlocksLoaded } from '../../app/editorSlice';
import type { AppThunk } from '../../app/store';
import { blockComponentId } from '../../components/registry';
import {
  deleteSavedBlock,
  listSavedBlocks,
  putSavedBlock,
  type SavedBlockRecord,
} from '../../persistence/db';
import { createEnvelope, parseEnvelope, pasteEnvelope } from '../editor/clipboard';

export function loadSavedBlocks(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    dispatch(savedBlocksLoaded(await listSavedBlocks()));
  };
}

export function saveBlock(blockId: string, name: string): AppThunk<Promise<boolean>> {
  return async (dispatch, getState) => {
    const { project } = getState();
    const block = project.blocks.entities[blockId];
    const envelope = createEnvelope(project, blockId);
    if (block === undefined || envelope === null) return false;
    await putSavedBlock({
      id: crypto.randomUUID(),
      name,
      componentId: blockComponentId(block),
      savedAt: new Date().toISOString(),
      envelope: JSON.stringify(envelope),
    });
    await dispatch(loadSavedBlocks());
    dispatch(noticeShown('info', `Saved “${name}”. Find it in Blocks › My blocks.`));
    return true;
  };
}

export function insertSavedBlock(record: SavedBlockRecord): AppThunk<Promise<void>> {
  return async (dispatch) => {
    const envelope = parseEnvelope(record.envelope);
    if (envelope === null) {
      console.warn(`Saved block ${record.id} has an envelope that cannot be read`);
      dispatch(noticeShown('error', `“${record.name}” can’t be added: its saved data is damaged.`));
      return;
    }
    await dispatch(pasteEnvelope(envelope));
  };
}

export function renameSavedBlock(record: SavedBlockRecord, name: string): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await putSavedBlock({ ...record, name });
    await dispatch(loadSavedBlocks());
  };
}

export function removeSavedBlock(record: SavedBlockRecord): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await deleteSavedBlock(record.id);
    await dispatch(loadSavedBlocks());
  };
}
