import { combineReducers} from "redux";

import config from './config';
import blocks from './blocks';

export default combineReducers({
  config,
  blocks
});
