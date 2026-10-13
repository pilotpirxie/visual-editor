import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppSettings, type AssistantModel } from '../../app/appSettings';
import { readOnlyChanged } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { blockIdAt, componentBlockOf, loadIntoAppStore } from '../../test/fixtures';
import { askAssistant, stopAssistant } from './assistantChat';

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

const HERO_INDEX = 1;

type ChatBody = { messages: { role: string; content: string }[]; response_format?: unknown };

let bodies: ChatBody[];
let answers: unknown[];
let failure: Response | null;

function completion(value: unknown): Response {
  const choices = [{ message: { content: JSON.stringify(value) } }];
  return new Response(JSON.stringify({ choices, usage: { total_tokens: 10, cost: 0.001 } }));
}

function heroTitle(project: Project = store.getState().project): unknown {
  return componentBlockOf(project, blockIdAt(HERO_INDEX)).values.title;
}

function messages(): ReturnType<typeof store.getState>['editor']['assistantMessages'] {
  return store.getState().editor.assistantMessages;
}

beforeEach(() => {
  localStorage.clear();
  updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
  loadIntoAppStore();
  bodies = [];
  answers = [];
  failure = null;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit = {}) => {
    bodies.push(JSON.parse(String(init.body)));
    if (init.signal?.aborted === true) throw new DOMException('Aborted', 'AbortError');
    if (failure !== null) return failure;
    return completion(answers.shift() ?? {});
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('askAssistant', () => {
  it('changes the project in one undo step and answers the request', async () => {
    const before = heroTitle();
    answers = [
      { reply: 'The headline is shorter now.', edits: [{ section: 's2', instruction: 'Shorten' }] },
      { sections: [{ values: { title: 'Hear every customer' } }] },
    ];
    await dispatch(askAssistant('Make the headline shorter'));
    expect(heroTitle()).toBe('Hear every customer');
    expect(messages()).toEqual([
      {
        id: expect.any(String),
        request: 'Make the headline shorter',
        status: 'done',
        reply: 'The headline is shorter now.',
        changes: ['Rewrote “Hero, centered text”'],
      },
    ]);
    expect(bodies[0].messages[1].content).toContain('"""Make the headline shorter"""');
    expect(bodies[0].messages[1].content).toContain('the page the person has open');
    dispatch(undo());
    expect(heroTitle()).toBe(before);
  });

  it('puts the newest request first and tells the model what was said before', async () => {
    answers = [{ reply: 'Which section do you mean?' }, { reply: 'Done.' }];
    await dispatch(askAssistant('Make it better'));
    await dispatch(askAssistant('The hero'));
    expect(messages().map(({ request }) => request)).toEqual(['The hero', 'Make it better']);
    expect(messages()[1]).toMatchObject({ status: 'done', changes: [] });
    expect(bodies[1].messages[1].content).toContain('They asked: Make it better');
    expect(bodies[1].messages[1].content).toContain('You answered: Which section do you mean?');
  });

  it('says so when the model answers with nothing', async () => {
    answers = [{}];
    await dispatch(askAssistant('Hello'));
    expect(messages()[0]).toMatchObject({ status: 'done', reply: 'Nothing was changed.' });
  });

  it('explains a failure and leaves the project alone', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = store.getState().project;
    failure = new Response(JSON.stringify({ error: { code: 402 } }), { status: 402 });
    await dispatch(askAssistant('Make the headline shorter'));
    expect(messages()[0]).toMatchObject({
      status: 'failed',
      reply: 'This OpenRouter key does not have enough credit for the request.',
      changes: [],
    });
    expect(store.getState().project).toBe(before);
    expect(logged).toHaveBeenCalledOnce();
  });

  it('can be stopped before anything changes', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = store.getState().project;
    vi.stubGlobal('fetch', (_url: string, init: RequestInit = {}) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const asking = dispatch(askAssistant('Make the headline shorter'));
    expect(messages()[0].status).toBe('working');
    stopAssistant();
    await asking;
    expect(messages()[0]).toMatchObject({
      status: 'failed',
      reply: 'Stopped. Nothing was changed.',
    });
    expect(store.getState().project).toBe(before);
    expect(logged).not.toHaveBeenCalled();
  });

  it('does nothing in a read-only tab', async () => {
    dispatch(readOnlyChanged(true));
    await dispatch(askAssistant('Make the headline shorter'));
    expect(messages()).toEqual([]);
    expect(bodies).toEqual([]);
  });

  it('forgets the conversation when another project opens', async () => {
    answers = [{ reply: 'Done.' }];
    await dispatch(askAssistant('Hello'));
    expect(messages()).toHaveLength(1);
    loadIntoAppStore();
    expect(messages()).toEqual([]);
  });
});
