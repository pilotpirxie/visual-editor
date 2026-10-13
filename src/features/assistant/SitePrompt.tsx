import { useState, type FormEvent, type JSX } from 'react';
import { useAppSettings } from '../../app/appSettings';
import './assistant.css';
import { Button, submitOnEnter, TextArea } from '../../../packages/ui/src';

const HELP_ID = 've-site-prompt-help';
const MAX_DESCRIPTION_LENGTH = 4000;
const ROWS = 3;

type SitePromptProps = {
  titleId: string;
  isDisabled: boolean;
  onBuild(description: string): void;
  onOpenSettings(): void;
};

export function SitePrompt({
  titleId,
  isDisabled,
  onBuild,
  onOpenSettings,
}: SitePromptProps): JSX.Element {
  const { openRouterKey, assistantModel } = useAppSettings();
  const [description, setDescription] = useState('');
  const isReady = openRouterKey.trim() !== '' && assistantModel !== null;
  const canBuild = isReady && !isDisabled && description.trim() !== '';

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (canBuild) onBuild(description.trim());
  }

  return (
    <section className="ve-site-prompt" aria-labelledby={titleId}>
      <h1 id={titleId} className="ve-site-prompt-title">
        Tell us about your site
      </h1>
      <p id={HELP_ID} className="ve-site-prompt-intro ui-muted">
        Write it the way you would tell a friend. You get a full site with its own look, ready to
        edit.
      </p>
      <form className="ve-site-prompt-form" onSubmit={submit}>
        <TextArea
          aria-labelledby={titleId}
          aria-describedby={HELP_ID}
          rows={ROWS}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="A site for my bakery in Leeds: our story, the menu with prices, opening hours and how to order a cake."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={submitOnEnter}
        />
        <Button type="submit" variant="primary" icon="sparkles" disabled={!canBuild}>
          Build my site
        </Button>
      </form>
      {!isReady && (
        <p className="ve-site-prompt-setup ui-muted">
          Add an OpenRouter key and pick a model first.{' '}
          <button type="button" className="ve-home-footer-link" onClick={onOpenSettings}>
            Open App settings
          </button>
        </p>
      )}
    </section>
  );
}
