import actionTypes from "../constants/actionTypes";
import blocks from '../constants/blocks';

const initialState = {
  ...blocks
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}
