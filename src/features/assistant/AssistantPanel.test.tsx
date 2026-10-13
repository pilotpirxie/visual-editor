import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppSettings, type AssistantModel } from '../../app/appSettings';
import { assistantAnswered, assistantAsked } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { blockIdAt, componentBlockOf, loadIntoAppStore } from '../../test/fixtures';
import {
  changeValue,
  click,
  getButton,
  pressKey,
  queryButton,
  render,
  runInAct,
} from '../../test/dom';
import { AssistantPanel } from './AssistantPanel';

const MODEL: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: [],
  contextLength: null,
  maxOutputTokens: null,
  promptPrice: null,
  completionPrice: null,
};

let answers: unknown[];
let release: (() => void) | null;

function completion(value: unknown): Response {
  const choices = [{ message: { content: JSON.stringify(value) } }];
  return new Response(JSON.stringify({ choices, usage: { total_tokens: 10, cost: 0.001 } }));
}

function requestBox(container: HTMLElement): HTMLTextAreaElement {
  const box = container.querySelector('textarea');
  if (box === null) throw new Error('No request box');
  return box;
}

function messageTexts(container: HTMLElement): (string | null)[] {
  const requests = container.querySelectorAll('.ve-assistant-request');
  return [...requests].map((request) => request.textContent);
}

async function settled(): Promise<void> {
  await act(async () => {
    await vi.waitFor(() => {
      const newest = store.getState().editor.assistantMessages.at(0);
      if (newest?.status === 'working') throw new Error('Still working');
    });
  });
}

beforeEach(() => {
  localStorage.clear();
  loadIntoAppStore();
  answers = [];
  release = null;
  vi.stubGlobal('fetch', async () => completion(answers.shift() ?? {}));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AssistantPanel', () => {
  it('points to App settings until a key and a model are set', () => {
    const { container } = render(<AssistantPanel />);
    expect(requestBox(container).disabled).toBe(true);
    expect(getButton(container, 'Change it').disabled).toBe(true);
    click(getButton(container, 'Open App settings'));
    expect(store.getState().editor.openDialog).toEqual({ kind: 'app-settings', tab: 'assistant' });
  });

  it('shows only the request box before the first request', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container } = render(<AssistantPanel />);
    expect(requestBox(container).disabled).toBe(false);
    expect(queryButton(container, 'Open App settings')).toBeNull();
    expect(container.querySelector('.ui-muted')).toBeNull();
    expect(getButton(container, 'Change it').disabled).toBe(true);
  });

  it('sends the request on Enter, changes the site and shows the answer', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    answers = [
      { reply: 'The headline is shorter now.', edits: [{ section: 's2', instruction: 'Shorten' }] },
      { sections: [{ values: { title: 'Hear every customer' } }] },
    ];
    const { container } = render(<AssistantPanel />);
    changeValue(requestBox(container), '  Make the headline shorter ');
    pressKey(requestBox(container), 'Enter', { shiftKey: true });
    expect(messageTexts(container)).toEqual([]);
    pressKey(requestBox(container), 'Enter');
    expect(messageTexts(container)).toEqual(['Make the headline shorter']);
    expect(requestBox(container).value).toBe('');
    expect(container.querySelector('.ve-assistant-working')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Working on your change');
    await settled();
    expect(container.querySelector('.ve-assistant-working')).toBeNull();
    expect(container.querySelector('.ve-assistant-reply')?.textContent).toBe(
      'The headline is shorter now.',
    );
    expect(container.querySelector('.ve-assistant-changes')?.textContent).toBe(
      'Rewrote “Hero, centered text”',
    );
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'The headline is shorter now.',
    );
    const hero = componentBlockOf(store.getState().project, blockIdAt(1));
    expect(hero.values.title).toBe('Hear every customer');
  });

  it('lists the newest request first, each answer above its request', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container } = render(<AssistantPanel />);
    runInAct(() => {
      dispatch(assistantAsked({ id: 'first', request: 'Add a pricing section' }));
      dispatch(assistantAnswered({ id: 'first', status: 'done', reply: 'Added.', changes: [] }));
      dispatch(assistantAsked({ id: 'second', request: 'Make it darker' }));
      dispatch(
        assistantAnswered({ id: 'second', status: 'failed', reply: 'No credit.', changes: [] }),
      );
    });
    expect(messageTexts(container)).toEqual(['Make it darker', 'Add a pricing section']);
    const replies = [...container.querySelectorAll('.ve-assistant-reply')];
    expect(replies[0].classList.contains('ui-field-error')).toBe(true);
    expect(replies[1].classList.contains('ui-field-error')).toBe(false);
    const answer = container.querySelector('.ve-assistant-answer');
    const request = container.querySelector('.ve-assistant-request');
    expect(answer?.compareDocumentPosition(request ?? answer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const form = container.querySelector('form');
    const list = container.querySelector('ol');
    expect(form?.compareDocumentPosition(list ?? form)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('offers Stop instead of sending while a request is running', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    vi.stubGlobal('fetch', (_url: string, init: RequestInit = {}) => {
      return new Promise<Response>((_resolve, reject) => {
        release = () => reject(new DOMException('Aborted', 'AbortError'));
        init.signal?.addEventListener('abort', release);
      });
    });
    const { container } = render(<AssistantPanel />);
    changeValue(requestBox(container), 'Make the headline shorter');
    click(getButton(container, 'Change it'));
    expect(queryButton(container, 'Change it')).toBeNull();
    changeValue(requestBox(container), 'Another one');
    pressKey(requestBox(container), 'Enter');
    expect(messageTexts(container)).toEqual(['Make the headline shorter']);
    click(getButton(container, 'Stop'));
    await settled();
    expect(container.querySelector('.ve-assistant-reply')?.textContent).toBe(
      'Stopped. Nothing was changed.',
    );
    expect(getButton(container, 'Change it').disabled).toBe(false);
  });
});
