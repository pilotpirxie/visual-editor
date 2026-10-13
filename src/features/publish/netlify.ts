import type { PublishedSite } from '../../app/appSettings';

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 80;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY = 429;

export type PublishProblem = 'token' | 'missing-site' | 'limit' | 'failed';

export class PublishError extends Error {
  readonly problem: PublishProblem;

  constructor(problem: PublishProblem, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PublishError';
    this.problem = problem;
  }
}

type NetlifyRequest = { path: string; token: string; method: 'GET' | 'POST'; zip?: Blob };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function textAt(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

function problemOf(status: number): PublishError {
  if (status === HTTP_UNAUTHORIZED) {
    return new PublishError('token', 'Netlify did not accept the access token.');
  } else if (status === HTTP_NOT_FOUND) {
    return new PublishError('missing-site', 'The site no longer exists on Netlify.');
  } else if (status === HTTP_TOO_MANY) {
    return new PublishError(
      'limit',
      'Netlify allows 3 publishes a minute and 100 a day. Try again in a moment.',
    );
  } else {
    return new PublishError('failed', `Netlify answered with an error (${status}).`);
  }
}

async function callNetlify(request: NetlifyRequest): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${request.token}` };
  if (request.zip !== undefined) headers['Content-Type'] = 'application/zip';
  let response: Response;
  try {
    response = await fetch(`${NETLIFY_API}${request.path}`, {
      method: request.method,
      headers,
      body: request.zip,
    });
  } catch (error) {
    throw new PublishError('failed', 'Netlify could not be reached. Check your connection.', {
      cause: error,
    });
  }
  if (!response.ok) throw problemOf(response.status);
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new PublishError('failed', 'Netlify sent an answer we cannot read.');
  return body;
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitUntilLive(deployId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const deploy = await callNetlify({ path: `/deploys/${deployId}`, token, method: 'GET' });
    const state = textAt(deploy, 'state');
    if (state === 'ready') return;
    if (state === 'error') {
      const reason = textAt(deploy, 'error_message') ?? 'no reason given';
      throw new PublishError('failed', `Netlify could not publish the site: ${reason}.`);
    }
    await wait(POLL_INTERVAL_MS);
  }
  throw new PublishError('failed', 'Netlify is taking too long. Check your Netlify dashboard.');
}

async function createSite(token: string): Promise<string> {
  const site = await callNetlify({ path: '/sites', token, method: 'POST' });
  const siteId = textAt(site, 'id');
  if (siteId === null) throw new PublishError('failed', 'Netlify did not create the site.');
  return siteId;
}

export async function publishToNetlify(
  zip: Blob,
  token: string,
  existingSiteId: string | null,
): Promise<PublishedSite> {
  const siteId = existingSiteId ?? (await createSite(token));
  const path = `/sites/${encodeURIComponent(siteId)}/deploys`;
  const deploy = await callNetlify({ path, token, method: 'POST', zip });
  const deployId = textAt(deploy, 'id');
  if (deployId === null) throw new PublishError('failed', 'Netlify did not start the publish.');
  await waitUntilLive(deployId, token);
  const url = textAt(deploy, 'ssl_url') ?? textAt(deploy, 'url');
  if (url === null) throw new PublishError('failed', 'Netlify did not say where the site is.');
  return { siteId, url };
}
