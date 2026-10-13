import { useId, type JSX } from 'react';
import { updateAppSettings, useAppSettings } from '../../app/appSettings';
import { useStore } from '../../app/store';
import { publishedSiteOf, publishTokenChange, publishTokenOf, type PublishHost } from './hosts';
import { Button, Field, TextInput } from '../../../packages/ui/src';
import './publish.css';

type HostText = { name: string; tokenLabel: string; note: string };

const HOST_TEXT: Record<PublishHost, HostText> = {
  netlify: {
    name: 'Netlify',
    tokenLabel: 'Netlify access token',
    note: 'Make a token in Netlify under User settings, Applications, Personal access tokens. It is kept in this browser and sent only to netlify.com. It is never saved in projects or exported sites.',
  },
  github: {
    name: 'GitHub Pages',
    tokenLabel: 'GitHub access token',
    note: 'Make a classic token on GitHub under Settings, Developer settings, Personal access tokens, with the repo scope. It is kept in this browser and sent only to github.com. It is never saved in projects or exported sites. The site goes into a new public repository in your account.',
  },
};

type PublishPanelProps = { host: PublishHost; error: string | null };

export function PublishPanel({ host, error }: PublishPanelProps): JSX.Element {
  const id = useId();
  const projectId = useStore((state) => state.project.id);
  const settings = useAppSettings();
  const text = HOST_TEXT[host];
  const token = publishTokenOf(host, settings);
  const published = publishedSiteOf(host, settings, projectId);

  return (
    <section className="ve-publish" aria-label={`${text.name} details`}>
      {published !== null && (
        <p>
          Your site's address is{' '}
          <a href={published.url} target="_blank" rel="noopener noreferrer">
            {published.url}
          </a>
        </p>
      )}
      <Field id={`${id}-token`} label={text.tokenLabel}>
        <div className="ve-publish-token">
          <TextInput
            id={`${id}-token`}
            type="password"
            value={token}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-note`}
            onChange={(event) => updateAppSettings(publishTokenChange(host, event.target.value))}
          />
          <Button
            disabled={token === ''}
            onClick={() => updateAppSettings(publishTokenChange(host, ''))}
          >
            Remove
          </Button>
        </div>
      </Field>
      <p id={`${id}-note`} className="ui-muted">
        {text.note}
      </p>
      {error !== null && (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
