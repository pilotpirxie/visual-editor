import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublishError, publishToNetlify } from './netlify';

type Reply = { status: number; body: unknown };

const ZIP = new Blob(['zip'], { type: 'application/zip' });

function stubNetlify(replies: Reply[]): ReturnType<typeof vi.fn> {
  const fetchStub = vi.fn(async () => {
    const reply = replies.shift();
    if (reply === undefined) throw new Error('Netlify was called more often than expected');
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

async function problemOf(publish: Promise<unknown>): Promise<string> {
  try {
    await publish;
  } catch (error) {
    if (error instanceof PublishError) return error.problem;
    throw error;
  }
  throw new Error('Publishing was expected to fail');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('publishToNetlify', () => {
  it('creates a site, uploads the zip and waits until it is live', async () => {
    vi.useFakeTimers();
    const fetchStub = stubNetlify([
      { status: 201, body: { id: 'site-1' } },
      {
        status: 200,
        body: { id: 'deploy-1', state: 'uploaded', ssl_url: 'https://one.netlify.app' },
      },
      { status: 200, body: { id: 'deploy-1', state: 'processing' } },
      { status: 200, body: { id: 'deploy-1', state: 'ready' } },
    ]);
    const publishing = publishToNetlify(ZIP, 'token-1', null);
    await vi.runAllTimersAsync();
    expect(await publishing).toEqual({ siteId: 'site-1', url: 'https://one.netlify.app' });
    const calls = fetchStub.mock.calls.map(([url, init]) => [url, init?.method]);
    expect(calls).toEqual([
      ['https://api.netlify.com/api/v1/sites', 'POST'],
      ['https://api.netlify.com/api/v1/sites/site-1/deploys', 'POST'],
      ['https://api.netlify.com/api/v1/deploys/deploy-1', 'GET'],
      ['https://api.netlify.com/api/v1/deploys/deploy-1', 'GET'],
    ]);
    const upload = fetchStub.mock.calls[1]?.[1];
    expect(upload?.body).toBe(ZIP);
    expect(upload?.headers).toEqual({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/zip',
    });
  });

  it('publishes to the same site again without creating a new one', async () => {
    const fetchStub = stubNetlify([
      {
        status: 200,
        body: { id: 'deploy-2', state: 'uploaded', ssl_url: 'https://one.netlify.app' },
      },
      { status: 200, body: { id: 'deploy-2', state: 'ready' } },
    ]);
    const site = await publishToNetlify(ZIP, 'token-1', 'site-1');
    expect(site.siteId).toBe('site-1');
    expect(fetchStub.mock.calls[0]?.[0]).toBe(
      'https://api.netlify.com/api/v1/sites/site-1/deploys',
    );
  });

  it.each([
    [401, 'token'],
    [404, 'missing-site'],
    [429, 'limit'],
    [500, 'failed'],
  ])('explains a %i answer from Netlify', async (status, problem) => {
    stubNetlify([{ status, body: { message: 'no' } }]);
    expect(await problemOf(publishToNetlify(ZIP, 'token-1', 'site-1'))).toBe(problem);
  });

  it('reports a publish that Netlify could not finish', async () => {
    stubNetlify([
      {
        status: 200,
        body: { id: 'deploy-3', state: 'uploaded', ssl_url: 'https://one.netlify.app' },
      },
      { status: 200, body: { id: 'deploy-3', state: 'error', error_message: 'bad zip' } },
    ]);
    await expect(publishToNetlify(ZIP, 'token-1', 'site-1')).rejects.toThrow(/bad zip/);
  });

  it('reports a lost connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    expect(await problemOf(publishToNetlify(ZIP, 'token-1', 'site-1'))).toBe('failed');
  });
});
