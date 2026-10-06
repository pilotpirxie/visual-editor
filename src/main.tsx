import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/theme.css';
import { App } from './app/App';
import { autosave } from './app/store';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html is missing the #root element');

window.addEventListener('pagehide', () => void autosave.flush());

if ('storage' in navigator) {
  navigator.storage
    .persist()
    .catch((error: unknown) => console.warn('Persistent storage was not granted', error));
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
