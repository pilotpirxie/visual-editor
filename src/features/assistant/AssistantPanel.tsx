import { useRef, useState, type FormEvent, type JSX } from 'react';
import { useAppSettings } from '../../app/appSettings';
import { dialogOpened, type AssistantMessage } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { askAssistant, stopAssistant } from './assistantChat';
import './assistant.css';
import { Button, submitOnEnter, TextArea } from '../../../packages/ui/src';

const REQUEST_ID = 've-assistant-request';
const KEYS_ID = 've-assistant-keys';
const MAX_REQUEST_LENGTH = 2000;
const ROWS = 3;

function MessageItem({ message }: { message: AssistantMessage }): JSX.Element {
  const { request, status, reply, changes } = message;
  return (
    <li className="ve-assistant-message">
      <p className="ve-assistant-request">{request}</p>
      {status === 'working' && (
        <div className="ve-assistant-working" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      {status === 'done' && <p className="ve-assistant-reply">{reply}</p>}
      {status === 'failed' && <p className="ve-assistant-reply ui-field-error">{reply}</p>}
      {changes.length > 0 && (
        <ul className="ve-assistant-changes">
          {changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function AssistantPanel(): JSX.Element {
  const { openRouterKey, assistantModel } = useAppSettings();
  const messages = useStore((state) => state.editor.assistantMessages);
  const [request, setRequest] = useState('');
  const requestRef = useRef<HTMLTextAreaElement>(null);
  const isReady = openRouterKey.trim() !== '' && assistantModel !== null;
  const newest = messages.at(0);
  const isWorking = newest?.status === 'working';
  const canAsk = isReady && !isWorking && request.trim() !== '';

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canAsk) return;
    void dispatch(askAssistant(request.trim()));
    setRequest('');
    requestRef.current?.focus();
  }

  let spokenStatus = '';
  if (isWorking) {
    spokenStatus = 'Working on your change';
  } else if (newest !== undefined) {
    spokenStatus = newest.reply;
  }

  return (
    <div className="ve-assistant">
      <form className="ve-assistant-form" onSubmit={submit}>
        <label className="ui-field-label" htmlFor={REQUEST_ID}>
          What should change?
        </label>
        <TextArea
          id={REQUEST_ID}
          ref={requestRef}
          rows={ROWS}
          maxLength={MAX_REQUEST_LENGTH}
          placeholder="Make the headline shorter and add a pricing section below it."
          aria-describedby={KEYS_ID}
          disabled={!isReady}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={submitOnEnter}
        />
        <div className="ve-assistant-actions">
          <span id={KEYS_ID} className="ui-muted">
            Enter to send
          </span>
          {isWorking && <Button onClick={stopAssistant}>Stop</Button>}
          {!isWorking && (
            <Button type="submit" variant="primary" icon="sparkles" disabled={!canAsk}>
              Change it
            </Button>
          )}
        </div>
      </form>
      {!isReady && (
        <p className="ui-muted">
          Add an OpenRouter key and pick a model first.{' '}
          <button
            type="button"
            className="ve-assistant-link"
            onClick={() => dispatch(dialogOpened({ kind: 'app-settings', tab: 'assistant' }))}
          >
            Open App settings
          </button>
        </p>
      )}
      {isReady && messages.length === 0 && (
        <p className="ui-muted">
          Say what to change in plain words: text, sections, pages, colors or fonts. Select a
          section first to change just that one. Undo brings back what you had.
        </p>
      )}
      <p className="ve-visually-hidden" role="status">
        {spokenStatus}
      </p>
      <ol className="ve-assistant-messages" aria-label="Your requests, newest first">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </ol>
    </div>
  );
}
