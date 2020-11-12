import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import reportWebVitals from './utils/reportWebVitals';
import store from './utils/store';
import App from './containers/App';

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
