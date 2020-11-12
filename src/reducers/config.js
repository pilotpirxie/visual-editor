import actionTypes from "../constants/actionTypes";

const initialState = {
  appName: 'Test App'
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case actionTypes.CHANGE_APP_NAME:
      return {
        ...state,
        appName: action.newName,
      };
    default:
      return state;
  }
}
