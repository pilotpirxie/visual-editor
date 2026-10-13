import { useRef, useState, type FormEvent, type JSX } from 'react';
import { useAppSettings } from '../../app/appSettings';
import { dialogOpened, type AssistantMessage } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { askAssistant, stopAssistant } from './assistantChat';
import { TypedStatus } from './TypedStatus';
import './assistant.css';
import { Button, Icon, submitOnEnter, TextArea } from '../../../packages/ui/src';

const REQUEST_ID = 've-assistant-request';
const MAX_REQUEST_LENGTH = 2000;
const ROWS = 3;
const THINKING_PHRASES = [
  'Reading your request…',
  'Looking at your page…',
  'Working out the changes…',
  'Choosing the words…',
];

function MessageItem({ message }: { message: AssistantMessage }): JSX.Element {
  const { request, status, reply, changes } = message;
  return (
    <li className="ve-assistant-message">
      <div className="ve-assistant-answer">
        {status === 'working' && (
          <div className="ve-assistant-working">
            <Icon name="sparkles" />
            <TypedStatus phrases={THINKING_PHRASES} />
          </div>
        )}
        {status === 'done' && <p className="ve-assistant-reply">{reply}</p>}
        {status === 'failed' && <p className="ve-assistant-reply ui-field-error">{reply}</p>}
        {changes.length > 0 && (
          <ul className="ve-assistant-changes">
            {changes.map((change) => (
              <li key={change}>
                <Icon name="check" />
                {change}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="ve-assistant-request">{request}</p>
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
          disabled={!isReady}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={submitOnEnter}
        />
        <div className="ve-assistant-actions">
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
