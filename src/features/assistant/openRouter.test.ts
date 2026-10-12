import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantModel } from '../../app/appSettings';
import {
  askForImage,
  askForJson,
  AssistantError,
  listImageModels,
  listModels,
  parseJsonAnswer,
  type ImageRequest,
  type JsonRequest,
} from './openRouter';

const MODEL: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: ['low', 'high'],
  contextLength: 200000,
  maxOutputTokens: 64000,
  promptPrice: 3,
  completionPrice: 15,
};

const REQUEST: JsonRequest = {
  key: 'sk-test',
  model: MODEL,
  effort: 'high',
  system: 'You answer in JSON.',
  user: 'Plan a site.',
  schema: { name: 'plan', schema: { type: 'object' } },
};

type Call = { url: string; init: RequestInit };

let calls: Call[] = [];
let replies: (() => Response | Promise<Response>)[] = [];

function reply(status: number, body: unknown): () => Response {
  return () => new Response(JSON.stringify(body), { status });
}

function completion(content: string, extra: Record<string, unknown> = {}): () => Response {
  return reply(200, {
    choices: [{ message: { content }, finish_reason: 'stop' }],
    usage: { total_tokens: 1200, cost: 0.0042 },
    ...extra,
  });
}

function sentBody(index: number): Record<string, unknown> {
  const body: unknown = JSON.parse(String(calls[index].init.body));
  if (typeof body !== 'object' || body === null) throw new Error('The request had no JSON body');
  return { ...body };
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AssistantError) return error.kind;
    throw error;
  }
  return 'no error';
}

function live(): AbortSignal {
  return new AbortController().signal;
}

beforeEach(() => {
  calls = [];
  replies = [];
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = replies.shift();
    if (next === undefined) throw new TypeError('Failed to fetch');
    return next();
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('listModels', () => {
  it('keeps text models with room for a site that can answer in JSON', async () => {
    replies.push(
      reply(200, {
        data: [
          {
            id: 'acme/writer',
            name: 'Acme Writer',
            context_length: 200000,
            supported_parameters: ['structured_outputs', 'reasoning', 'max_tokens'],
            architecture: { output_modalities: ['text'] },
            pricing: { prompt: '0.000003', completion: '0.000015' },
            top_provider: { max_completion_tokens: 64000 },
            reasoning: { supported_efforts: ['low', 'high'] },
          },
          {
            id: 'acme/plain',
            supported_parameters: ['response_format', 'reasoning'],
            architecture: { output_modalities: ['text'] },
            pricing: { prompt: '-1', completion: 'free' },
          },
          {
            id: 'acme/chatty',
            supported_parameters: ['temperature'],
            architecture: { output_modalities: ['text'] },
          },
          {
            id: 'acme/painter',
            supported_parameters: ['response_format'],
            architecture: { output_modalities: ['image'] },
          },
          {
            id: 'acme/forgetful',
            context_length: 16000,
            supported_parameters: ['response_format'],
            architecture: { output_modalities: ['text'] },
          },
          {
            id: 'acme/terse',
            supported_parameters: ['response_format'],
            architecture: { output_modalities: ['text'] },
            top_provider: { max_completion_tokens: 4096 },
          },
          'not a model',
        ],
      }),
    );
    const models = await listModels('sk-test', live());
    expect(models).toEqual([
      MODEL,
      {
        id: 'acme/plain',
        name: 'acme/plain',
        canUseSchema: false,
        efforts: ['low', 'medium', 'high'],
        contextLength: null,
        maxOutputTokens: null,
        promptPrice: null,
        completionPrice: null,
      },
    ]);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/models');
    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe('Bearer sk-test');
  });

  it('explains a refused key', async () => {
    replies.push(reply(401, { error: { code: 401, message: 'No auth credentials found' } }));
    expect(await kindOf(listModels('wrong', live()))).toBe('key');
  });

  it('refuses a list it cannot read', async () => {
    replies.push(reply(200, { models: [] }));
    expect(await kindOf(listModels('sk-test', live()))).toBe('answer');
  });
});

describe('askForJson', () => {
  it('asks with a strict schema and the chosen effort', async () => {
    replies.push(completion('{"pages": 3}'));
    const answer = await askForJson(REQUEST, live());
    expect(answer).toEqual({ value: { pages: 3 }, usage: { tokens: 1200, cost: 0.0042 } });
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(sentBody(0)).toEqual({
      model: 'acme/writer',
      messages: [
        { role: 'system', content: 'You answer in JSON.' },
        { role: 'user', content: 'Plan a site.' },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'plan', strict: true, schema: { type: 'object' } },
      },
      provider: { require_parameters: true },
      max_tokens: 20000,
      reasoning: { effort: 'high' },
    });
  });

  it('falls back to plain JSON mode and leaves out what the model lacks', async () => {
    replies.push(completion('{"ok": true}'));
    const model: AssistantModel = {
      ...MODEL,
      canUseSchema: false,
      efforts: [],
      maxOutputTokens: null,
    };
    await askForJson({ ...REQUEST, model }, live());
    const body = sentBody(0);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body).not.toHaveProperty('provider');
    expect(body).not.toHaveProperty('max_tokens');
    expect(body).not.toHaveProperty('reasoning');
  });

  it('uses plain JSON mode when a step has no schema', async () => {
    replies.push(completion('{"ok": true}'));
    await askForJson({ ...REQUEST, schema: null, effort: null }, live());
    expect(sentBody(0).response_format).toEqual({ type: 'json_object' });
    expect(sentBody(0)).not.toHaveProperty('reasoning');
  });

  it('reads answers wrapped in a code fence or given in parts', async () => {
    replies.push(completion('```json\n{"a": 1}\n```'));
    expect((await askForJson(REQUEST, live())).value).toEqual({ a: 1 });
    replies.push(
      reply(200, { choices: [{ message: { content: [{ text: '{"b":' }, { text: ' 2}' }] } }] }),
    );
    const answer = await askForJson(REQUEST, live());
    expect(answer).toEqual({ value: { b: 2 }, usage: { tokens: 0, cost: 0 } });
  });

  it.each([
    [401, 'key'],
    [402, 'credit'],
    [400, 'model'],
    [403, 'model'],
    [404, 'model'],
  ])('does not retry status %i', async (status, kind) => {
    replies.push(reply(status, { error: { code: status, message: 'Nope' } }), completion('{}'));
    expect(await kindOf(askForJson(REQUEST, live()))).toBe(kind);
    expect(calls).toHaveLength(1);
  });

  it('includes what the server said when the model cannot answer', async () => {
    replies.push(reply(404, { error: { code: 404, message: 'No endpoints found' } }));
    await expect(askForJson(REQUEST, live())).rejects.toThrow(
      'The model could not answer: No endpoints found',
    );
  });

  it.each([
    ['a rate limit', reply(429, { error: { code: 429, message: 'Slow down' } })],
    ['a provider outage', reply(502, { error: { code: 502, message: 'Bad gateway' } })],
    ['an unusable answer', completion('Sure! Here is your plan.')],
    ['an empty answer', reply(200, { choices: [] })],
    ['an error inside a 200 answer', reply(200, { error: { code: 503, message: 'No provider' } })],
  ])('tries once more after %s', async (_name, first) => {
    replies.push(first, completion('{"ok": true}'));
    const pending = askForJson(REQUEST, live());
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).value).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it('gives up after the second failure', async () => {
    replies.push(completion('nope'), completion('still nope'));
    const pending = kindOf(askForJson(REQUEST, live()));
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe('answer');
    expect(calls).toHaveLength(2);
  });

  it('does not retry an answer that was cut off', async () => {
    replies.push(
      reply(200, { choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }] }),
    );
    expect(await kindOf(askForJson(REQUEST, live()))).toBe('model');
    expect(calls).toHaveLength(1);
  });

  it('reports a provider error inside the choice', async () => {
    replies.push(
      reply(200, { choices: [{ finish_reason: 'error', error: { code: 402, message: 'Pay' } }] }),
    );
    expect(await kindOf(askForJson(REQUEST, live()))).toBe('credit');
  });

  it('reports a connection that fails', async () => {
    expect(await kindOf(askForJson(REQUEST, live()))).toBe('network');
  });

  it('stops at once when cancelled before or during the call', async () => {
    const cancelled = new AbortController();
    cancelled.abort();
    expect(await kindOf(askForJson(REQUEST, cancelled.signal))).toBe('cancelled');
    expect(calls).toHaveLength(0);

    const running = new AbortController();
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const pending = kindOf(askForJson(REQUEST, running.signal));
    running.abort();
    expect(await pending).toBe('cancelled');
  });

  it('gives up on a call that takes more than three minutes', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const pending = askForJson(REQUEST, live()).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(180_000);
    const error = await pending;
    expect(error).toBeInstanceOf(AssistantError);
    expect(error).toHaveProperty('kind', 'network');
    expect(error).toHaveProperty('message', 'OpenRouter took too long to answer. Try again.');
  });

  it('cancels while waiting to retry', async () => {
    const running = new AbortController();
    replies.push(reply(429, { error: { code: 429, message: 'Slow down' } }), completion('{}'));
    const pending = kindOf(askForJson(REQUEST, running.signal));
    await vi.advanceTimersByTimeAsync(500);
    running.abort();
    expect(await pending).toBe('cancelled');
    expect(calls).toHaveLength(1);
  });
});

describe('listImageModels', () => {
  it('asks for image models and keeps the ones that create images', async () => {
    replies.push(
      reply(200, {
        data: [
          {
            id: 'acme/painter',
            name: 'Acme Painter',
            architecture: { output_modalities: ['image'] },
          },
          { id: 'acme/both', architecture: { output_modalities: ['image', 'text'] } },
          { id: 'acme/writer', name: 'Acme Writer', architecture: { output_modalities: ['text'] } },
          { id: '', name: 'Nameless', architecture: { output_modalities: ['image'] } },
          'not a model',
        ],
      }),
    );
    expect(await listImageModels('sk-test', live())).toEqual([
      { id: 'acme/painter', name: 'Acme Painter' },
      { id: 'acme/both', name: 'acme/both' },
    ]);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/models?output_modalities=image');
  });

  it('explains a refused key', async () => {
    replies.push(reply(401, { error: { message: 'No auth' } }));
    expect(await kindOf(listImageModels('sk-bad', live()))).toBe('key');
  });
});

describe('askForImage', () => {
  const PAINT: ImageRequest = {
    key: 'sk-test',
    model: { id: 'acme/painter', name: 'Acme Painter' },
    prompt: 'A loaf of bread on a wooden table',
    aspectRatio: '16:9',
  };

  function picture(mediaType: string, data = 'aGVsbG8='): () => Response {
    return reply(200, {
      data: [{ b64_json: data, media_type: mediaType }],
      usage: { total_tokens: 4175, cost: 0.04 },
    });
  }

  it('asks for one image in the wanted shape and returns it as a data URL', async () => {
    replies.push(picture('image/png'));
    const answer = await askForImage(PAINT, live());
    expect(answer).toEqual({
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      usage: { tokens: 4175, cost: 0.04 },
    });
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/images');
    expect(sentBody(0)).toEqual({
      model: 'acme/painter',
      prompt: 'A loaf of bread on a wooden table',
      aspect_ratio: '16:9',
      n: 1,
    });
  });

  it('refuses a file type that cannot be stored without asking again', async () => {
    replies.push(picture('image/svg+xml'));
    expect(await kindOf(askForImage(PAINT, live()))).toBe('answer');
    expect(calls).toHaveLength(1);
  });

  it('tries once more after an answer without an image', async () => {
    replies.push(reply(200, { data: [] }), picture('image/webp'));
    const pending = askForImage(PAINT, live());
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).dataUrl).toBe('data:image/webp;base64,aGVsbG8=');
    expect(calls).toHaveLength(2);
  });

  it('refuses data that is not base64', async () => {
    replies.push(picture('image/png', '<svg onload=alert(1)>'), picture('image/png', '"'));
    const pending = kindOf(askForImage(PAINT, live()));
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe('answer');
  });

  it('reports missing credit', async () => {
    replies.push(reply(402, { error: { message: 'Insufficient credits' } }));
    expect(await kindOf(askForImage(PAINT, live()))).toBe('credit');
  });
});

describe('parseJsonAnswer', () => {
  it('takes the JSON object out of surrounding text', () => {
    expect(parseJsonAnswer('Here you go: {"a": {"b": 1}} Enjoy!')).toEqual({ a: { b: 1 } });
  });

  it('drops a closing bracket too many and adds the ones that are missing', () => {
    const extra =
      '{"sections":[{"values":{"title":"A } in text","on":true}}},{"values":{"n":[1,2]]}}]}';
    expect(parseJsonAnswer(extra)).toEqual({
      sections: [{ values: { title: 'A } in text', on: true } }, { values: { n: [1, 2] } }],
    });
    expect(parseJsonAnswer('{"sections":[{"values":{"quote":"He said \\"hi\\" ]"}}')).toEqual({
      sections: [{ values: { quote: 'He said "hi" ]' } }],
    });
  });

  it('refuses text without an object', () => {
    expect(() => parseJsonAnswer('[1, 2, 3]')).toThrow(AssistantError);
    expect(() => parseJsonAnswer('{"a": }')).toThrow(AssistantError);
  });
});
