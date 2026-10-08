import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/theme.css';
import { App } from './app/App';
import { browserFeatureChecks, missingFeatures } from './app/browserSupport';
import { CrashScreen } from './app/CrashScreen';
import { autosave } from './app/store';
import { ErrorBoundary } from '../packages/ui/src';

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('index.html is missing the #root element');

function showUnsupportedBrowser(root: HTMLElement, missing: string[]): void {
  const message = document.createElement('main');
  message.className = 've-unsupported';
  const heading = document.createElement('h1');
  heading.textContent = 'This browser can’t run Visual Editor';
  const text = document.createElement('p');
  text.textContent = `Use the latest Chrome, Edge, Firefox or Safari. Missing: ${missing.join(', ')}.`;
  message.append(heading, text);
  root.replaceChildren(message);
}

window.addEventListener('beforeunload', (event) => {
  if (!autosave.hasUnsavedChanges()) return;
  void autosave.flush();
  event.preventDefault();
});
window.addEventListener('pagehide', () => void autosave.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void autosave.flush();
});

if ('storage' in navigator) {
  navigator.storage
    .persist()
    .catch((error: unknown) => console.warn('Persistent storage was not granted', error));
}

const missing = missingFeatures(browserFeatureChecks());
if (missing.length > 0) {
  console.error('This browser lacks features the editor needs', missing);
  showUnsupportedBrowser(rootElement, missing);
} else {
  createRoot(rootElement, {
    onUncaughtError: (error, info) => {
      console.error('The editor crashed', error, info.componentStack);
    },
  }).render(
    <StrictMode>
      <ErrorBoundary fallback={() => <CrashScreen />}>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
