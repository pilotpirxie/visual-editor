import actionTypes from "../constants/actionTypes";
import blocks from "../views/blocks/";
import {v4 as uuidv4} from 'uuid';

const initialState = {
  blocks: [],
  selectedBlockUuid: ''
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case actionTypes.PUSH_BLOCK:
      return {
        ...state,
        blocks: [...state.blocks, {
          uuid: uuidv4(),
          blockId: action.blockId,
          data: {
            ...blocks[action.blockId].defaultData
          }
        }]
      }
    case actionTypes.SET_SELECTED_BLOCK:
      return {
        ...state,
        selectedBlockUuid: action.blockUuid
      }
    case actionTypes.REORDER_LAYOUT:
      return {
        ...state,
        blocks: [
          ...action.newBlocksLayout
        ]
      }
    case actionTypes.CHANGE_BLOCK_DATA:
      const index = state.blocks.findIndex(el => {
        return el.uuid === action.blockUuid;
      });
      const newBlocks = [...state.blocks];
      newBlocks[index].data[action.key] = action.value;
      return {
        ...state,
        blocks: [...newBlocks]
      }
    default:
      return state;
  }
}
