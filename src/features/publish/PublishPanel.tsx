import { useId, useState, type JSX } from 'react';
import { readAppSettings, updateAppSettings, useAppSettings } from '../../app/appSettings';
import { describeError } from '../../app/errors';
import { useStore } from '../../app/store';
import { PublishError, publishToNetlify } from './netlify';
import { Button, Field, TextInput } from '../../../packages/ui/src';
import './publish.css';

type PublishStatus =
  | { kind: 'idle' }
  | { kind: 'publishing' }
  | { kind: 'live' }
  | { kind: 'failed'; message: string };

function forgetSite(projectId: string): void {
  const { [projectId]: forgotten, ...others } = readAppSettings().publishedSites;
  if (forgotten !== undefined) updateAppSettings({ publishedSites: others });
}

export function PublishPanel({ zip }: { zip: Blob }): JSX.Element {
  const id = useId();
  const projectId = useStore((state) => state.project.id);
  const { netlifyToken, publishedSites } = useAppSettings();
  const [status, setStatus] = useState<PublishStatus>({ kind: 'idle' });
  const published = publishedSites[projectId];
  const token = netlifyToken.trim();

  async function publish(): Promise<void> {
    setStatus({ kind: 'publishing' });
    try {
      const site = await publishToNetlify(zip, token, published?.siteId ?? null);
      const sites = { ...readAppSettings().publishedSites, [projectId]: site };
      updateAppSettings({ publishedSites: sites });
      setStatus({ kind: 'live' });
    } catch (error) {
      console.error('Publishing to Netlify failed', error);
      const isSiteGone = error instanceof PublishError && error.problem === 'missing-site';
      if (isSiteGone) forgetSite(projectId);
      const advice = isSiteGone ? ' Publish again to make a new site.' : '';
      setStatus({ kind: 'failed', message: `${describeError(error)}${advice}` });
    }
  }

  return (
    <section className="ve-publish" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="ve-publish-title">
        Publish online
      </h3>
      {published !== undefined && (
        <p>
          Your site is live at{' '}
          <a href={published.url} target="_blank" rel="noopener noreferrer">
            {published.url}
          </a>
        </p>
      )}
      <Field id={`${id}-token`} label="Netlify access token">
        <div className="ve-publish-token">
          <TextInput
            id={`${id}-token`}
            type="password"
            value={netlifyToken}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-note`}
            onChange={(event) => updateAppSettings({ netlifyToken: event.target.value })}
          />
          <Button
            disabled={netlifyToken === ''}
            onClick={() => updateAppSettings({ netlifyToken: '' })}
          >
            Remove
          </Button>
        </div>
      </Field>
      <p id={`${id}-note`} className="ui-muted">
        Make a token in Netlify under User settings, Applications, Personal access tokens. It is
        kept in this browser and sent only to netlify.com. It is never saved in projects or exported
        sites.
      </p>
      <div className="ve-publish-actions">
        <Button
          disabled={token === '' || status.kind === 'publishing'}
          onClick={() => void publish()}
        >
          {published === undefined ? 'Publish to Netlify' : 'Publish changes'}
        </Button>
        <span role="status">
          {status.kind === 'publishing' && 'Publishing…'}
          {status.kind === 'live' && 'Published. It can take a minute to show everywhere.'}
        </span>
      </div>
      {status.kind === 'failed' && (
        <p className="ui-field-error" role="alert">
          {status.message}
        </p>
      )}
    </section>
  );
}
