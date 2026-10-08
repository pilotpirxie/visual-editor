import { loadPackBlocks } from '../features/block-packs/packLibrary';
import { loadProjectIconSets } from '../features/icons/ensureIconSets';
import { noticeShown } from './editorSlice';
import type { AppThunk } from './store';

function loadProjectCustomBlocks(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const packBlocks = Object.values(getState().project.packBlocks);
    try {
      await dispatch(loadPackBlocks(packBlocks));
    } catch (error) {
      console.error('The custom blocks of the project could not be loaded', error);
      dispatch(
        noticeShown(
          'warning',
          'Custom blocks couldn’t load. Check your connection, then reload the page.',
        ),
      );
    }
  };
}

export function loadProjectAssets(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await Promise.all([dispatch(loadProjectIconSets()), dispatch(loadProjectCustomBlocks())]);
  };
}
