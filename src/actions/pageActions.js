import actionTypes from '../constants/actionTypes';

export const pushBlock = (blockId, parentUuid = null) => ({
  type: actionTypes.PUSH_BLOCK,
  blockId,
  parentUuid,
});

export const moveBlock = (payload) => ({
  type: actionTypes.MOVE_BLOCK,
  payload,
});

export const deleteBlock = (blockUuid) => ({
  type: actionTypes.DELETE_BLOCK,
  blockUuid,
});

export const setSelectedBlock = (blockUuid) => ({
  type: actionTypes.SET_SELECTED_BLOCK,
  blockUuid,
});

export const changeBlockData = (blockUuid, key, value) => ({
  type: actionTypes.CHANGE_BLOCK_DATA,
  blockUuid,
  key,
  value,
});

export const addPage = () => ({
  type: actionTypes.ADD_PAGE,
});

export const removePage = (pageIndex) => ({
  type: actionTypes.REMOVE_PAGE,
  pageIndex,
});

export const switchPage = (pageIndex) => ({
  type: actionTypes.SWITCH_PAGE,
  pageIndex,
});

export const updatePageName = (pageIndex, newName) => ({
    type: actionTypes.UPDATE_PAGE_NAME,
    pageIndex,
    newName,
});