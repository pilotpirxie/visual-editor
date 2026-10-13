import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGitHubRepository, publishToGitHubPages } from './github';
import { PublishError } from './netlify';

type Reply = { status: number; body: unknown };

type Call = { method: string; path: string; body: unknown };

const API = 'https://api.github.com';
const SITE = { siteId: 'Ada/fieldnote', url: 'https://ada.github.io/fieldnote/' };
const REPOSITORY: Reply = { status: 200, body: { default_branch: 'main' } };
const HEAD: Reply = { status: 200, body: { object: { sha: 'head-1' } } };
const TREE: Reply = { status: 201, body: { sha: 'tree-1' } };
const COMMIT: Reply = { status: 201, body: { sha: 'commit-1' } };
const MOVED: Reply = { status: 200, body: { ref: 'refs/heads/main' } };
const PAGES_ON: Reply = { status: 201, body: { html_url: 'https://ada.github.io/fieldnote/' } };

function stubGitHub(replies: Reply[]): ReturnType<typeof vi.fn> {
  const fetchStub = vi.fn(async () => {
    const reply = replies.shift();
    if (reply === undefined) throw new Error('GitHub was called more often than expected');
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

function callsOf(fetchStub: ReturnType<typeof vi.fn>): Call[] {
  const calls: Call[] = [];
  for (const [url, init] of fetchStub.mock.calls) {
    const text: unknown = init?.body;
    const body: unknown = typeof text === 'string' ? JSON.parse(text) : null;
    calls.push({ method: init?.method, path: String(url).replace(API, ''), body });
  }
  return calls;
}

async function problemOf(publishing: Promise<unknown>): Promise<string> {
  try {
    await publishing;
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

describe('createGitHubRepository', () => {
  it('makes a repository named after the site and works out its address', async () => {
    const fetchStub = stubGitHub([{ status: 201, body: { owner: { login: 'Ada' } } }]);
    expect(await createGitHubRepository('ghp_test', 'Field Note')).toEqual({
      siteId: 'Ada/field-note',
      url: 'https://ada.github.io/field-note/',
    });
    expect(callsOf(fetchStub)).toEqual([
      {
        method: 'POST',
        path: '/user/repos',
        body: { name: 'field-note', description: 'Field Note', auto_init: true },
      },
    ]);
    expect(fetchStub.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer ghp_test',
    });
  });

  it('never reuses a repository that already has the name', async () => {
    const fetchStub = stubGitHub([
      { status: 422, body: { message: 'name already exists on this account' } },
      { status: 422, body: { message: 'name already exists on this account' } },
      { status: 201, body: { owner: { login: 'ada' } } },
    ]);
    const site = await createGitHubRepository('ghp_test', 'Acme');
    expect(site.siteId).toBe('ada/acme-3');
    const names: unknown[] = [];
    for (const call of callsOf(fetchStub)) names.push(call.body);
    expect(names).toMatchObject([{ name: 'acme' }, { name: 'acme-2' }, { name: 'acme-3' }]);
  });

  it('gives up after five taken names and says which name is taken', async () => {
    const taken = { status: 422, body: {} };
    stubGitHub([taken, taken, taken, taken, taken]);
    await expect(createGitHubRepository('ghp_test', 'Acme')).rejects.toThrow(
      'You already have repositories named acme on GitHub.',
    );
  });

  it('reports a refused token', async () => {
    stubGitHub([{ status: 401, body: {} }]);
    expect(await problemOf(createGitHubRepository('bad', 'Acme'))).toBe('token');
  });
});

describe('publishToGitHubPages', () => {
  it('commits every file in one tree on the default branch and turns Pages on', async () => {
    const fetchStub = stubGitHub([
      REPOSITORY,
      HEAD,
      { status: 201, body: { sha: 'blob-1' } },
      TREE,
      COMMIT,
      MOVED,
      { status: 201, body: { html_url: 'https://fieldnote.example/' } },
    ]);
    const files = {
      'index.html': '<!doctype html>',
      'assets/images/photo.png': new Blob([new Uint8Array([1, 2, 3])]),
    };
    expect(await publishToGitHubPages(files, 'ghp_test', SITE)).toEqual({
      siteId: 'Ada/fieldnote',
      url: 'https://fieldnote.example/',
    });
    expect(callsOf(fetchStub)).toEqual([
      { method: 'GET', path: '/repos/Ada/fieldnote', body: null },
      { method: 'GET', path: '/repos/Ada/fieldnote/git/ref/heads/main', body: null },
      {
        method: 'POST',
        path: '/repos/Ada/fieldnote/git/blobs',
        body: { content: 'AQID', encoding: 'base64' },
      },
      {
        method: 'POST',
        path: '/repos/Ada/fieldnote/git/trees',
        body: {
          tree: [
            { path: '.nojekyll', mode: '100644', type: 'blob', content: '\n' },
            { path: 'index.html', mode: '100644', type: 'blob', content: '<!doctype html>' },
            { path: 'assets/images/photo.png', mode: '100644', type: 'blob', sha: 'blob-1' },
          ],
        },
      },
      {
        method: 'POST',
        path: '/repos/Ada/fieldnote/git/commits',
        body: { message: 'Publish site', tree: 'tree-1', parents: ['head-1'] },
      },
      {
        method: 'PATCH',
        path: '/repos/Ada/fieldnote/git/refs/heads/main',
        body: { sha: 'commit-1' },
      },
      {
        method: 'POST',
        path: '/repos/Ada/fieldnote/pages',
        body: { source: { branch: 'main', path: '/' } },
      },
    ]);
  });

  it('keeps the known address when Pages is already on', async () => {
    stubGitHub([REPOSITORY, HEAD, TREE, COMMIT, MOVED, { status: 409, body: {} }]);
    expect(await publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE)).toEqual(SITE);
  });

  it('waits for the first commit of a repository that was only just made', async () => {
    vi.useFakeTimers();
    const fetchStub = stubGitHub([
      REPOSITORY,
      { status: 409, body: { message: 'Git Repository is empty.' } },
      HEAD,
      TREE,
      COMMIT,
      MOVED,
      PAGES_ON,
    ]);
    const publishing = publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE);
    await vi.runAllTimersAsync();
    expect(await publishing).toEqual(SITE);
    expect(fetchStub).toHaveBeenCalledTimes(7);
  });

  it('stops when the repository never gets its first commit', async () => {
    vi.useFakeTimers();
    const empty = { status: 409, body: {} };
    stubGitHub([REPOSITORY, empty, empty, empty, empty, empty]);
    const failing = problemOf(publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE));
    await vi.runAllTimersAsync();
    expect(await failing).toBe('failed');
  });

  it('reports a repository that was deleted', async () => {
    stubGitHub([{ status: 404, body: {} }]);
    const publishing = publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE);
    expect(await problemOf(publishing)).toBe('missing-site');
  });

  it('reports a token without the needed scope', async () => {
    stubGitHub([REPOSITORY, HEAD, { status: 403, body: {} }]);
    const publishing = publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE);
    await expect(publishing).rejects.toThrow('Check that the token has the repo scope.');
  });

  it('reports a dropped connection and an answer it cannot read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const offline = publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE);
    await expect(offline).rejects.toThrow('GitHub could not be reached.');
    stubGitHub([{ status: 200, body: [] }]);
    const garbled = publishToGitHubPages({ 'index.html': 'x' }, 'ghp_test', SITE);
    await expect(garbled).rejects.toThrow('GitHub sent an answer we cannot read.');
  });
});
