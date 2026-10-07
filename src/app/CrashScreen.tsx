import type { JSX } from 'react';
import { HOME_PATH } from './router';

export function CrashScreen(): JSX.Element {
  return (
    <main className="ve-notice" role="alert">
      <h1>Something went wrong</h1>
      <p>Your work is saved in this browser. Reload the page to carry on.</p>
      <div className="ve-notice-actions">
        <button
          type="button"
          className="ui-button ui-button--primary"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <a href={HOME_PATH}>Back to my projects</a>
      </div>
    </main>
  );
}
