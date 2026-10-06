import createSagaMiddleware from 'redux-saga';
import { createStore, applyMiddleware, compose } from 'redux';
import rootReducer from '../reducers';
import rootSaga from '../sagas';
const sagaMiddleware = createSagaMiddleware();

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const globalStore = createStore(
  rootReducer,
  composeEnhancers(
    applyMiddleware(sagaMiddleware)
  ),
);

sagaMiddleware.run(rootSaga);

export default globalStore;

