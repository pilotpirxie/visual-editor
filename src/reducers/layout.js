import actionTypes from "../constants/actionTypes";
import blocks from "../views/blocks/";
import {v4 as uuidv4} from 'uuid';

const initialState = {
  blocks: []
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
    default:
      return state;
  }
}
