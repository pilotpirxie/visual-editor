import type { PublishedSite } from '../../app/appSettings';
import { slugify } from '../../app/slugs';
import { isRecord } from '../../components/fields';
import { base64Of } from '../../components/packFormat';
import type { ExportFiles } from '../../render/assembleSite';
import { PublishError, textAt, wait } from './netlify';

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const MAX_NAME_LENGTH = 80;
const MAX_NAME_ATTEMPTS = 5;
const MAX_BRANCH_ATTEMPTS = 5;
const BRANCH_WAIT_MS = 1000;
const FILE_MODE = '100644';
const SKIP_JEKYLL_FILE = '.nojekyll';
const UNREADABLE_ANSWER = 'GitHub sent an answer we cannot read.';

type GitHubRequest = {
  path: string;
  token: string;
  method: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
};

type TreeEntry = { path: string; mode: string; type: 'blob'; content?: string; sha?: string };

type Branch = { repositoryPath: string; name: string; token: string };

function problemOf(status: number): PublishError {
  if (status === HTTP_UNAUTHORIZED) {
    return new PublishError('token', 'GitHub did not accept the access token.');
  } else if (status === HTTP_FORBIDDEN) {
    return new PublishError(
      'token',
      'GitHub refused the request. Check that the token has the repo scope.',
    );
  } else if (status === HTTP_NOT_FOUND) {
    return new PublishError('missing-site', 'The repository no longer exists on GitHub.');
  } else {
    return new PublishError('failed', `GitHub answered with an error (${status}).`);
  }
}

async function requestGitHub(request: GitHubRequest): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${request.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  };
  const init: RequestInit = { method: request.method, headers };
  if (request.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(request.body);
  }
  try {
    return await fetch(`${GITHUB_API}${request.path}`, init);
  } catch (error) {
    throw new PublishError('failed', 'GitHub could not be reached. Check your connection.', {
      cause: error,
    });
  }
}

async function answerOf(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw problemOf(response.status);
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new PublishError('failed', UNREADABLE_ANSWER);
  return body;
}

async function callGitHub(request: GitHubRequest): Promise<Record<string, unknown>> {
  return answerOf(await requestGitHub(request));
}

function shaOf(record: Record<string, unknown>): string {
  const sha = textAt(record, 'sha');
  if (sha === null) throw new PublishError('failed', UNREADABLE_ANSWER);
  return sha;
}

export async function createGitHubRepository(
  token: string,
  siteTitle: string,
): Promise<PublishedSite> {
  const baseName = slugify(siteTitle).slice(0, MAX_NAME_LENGTH);
  for (let attempt = 1; attempt <= MAX_NAME_ATTEMPTS; attempt += 1) {
    const name = attempt === 1 ? baseName : `${baseName}-${attempt}`;
    const response = await requestGitHub({
      path: '/user/repos',
      token,
      method: 'POST',
      body: { name, description: siteTitle, auto_init: true },
    });
    if (response.status === HTTP_UNPROCESSABLE) continue;
    const repository = await answerOf(response);
    const owner = isRecord(repository.owner) ? textAt(repository.owner, 'login') : null;
    if (owner === null) throw new PublishError('failed', 'GitHub did not create the repository.');
    return { siteId: `${owner}/${name}`, url: `https://${owner.toLowerCase()}.github.io/${name}/` };
  }
  throw new PublishError(
    'failed',
    `You already have repositories named ${baseName} on GitHub. Rename or delete one and try again.`,
  );
}

async function headCommitOf(branch: Branch): Promise<string> {
  const path = `${branch.repositoryPath}/git/ref/heads/${branch.name}`;
  for (let attempt = 0; attempt < MAX_BRANCH_ATTEMPTS; attempt += 1) {
    const response = await requestGitHub({ path, token: branch.token, method: 'GET' });
    const isStillEmpty = response.status === HTTP_NOT_FOUND || response.status === HTTP_CONFLICT;
    if (!isStillEmpty) {
      const ref = await answerOf(response);
      if (!isRecord(ref.object)) throw new PublishError('failed', UNREADABLE_ANSWER);
      return shaOf(ref.object);
    }
    await wait(BRANCH_WAIT_MS);
  }
  throw new PublishError(
    'failed',
    'GitHub has not finished making the repository. Try again in a moment.',
  );
}

async function treeEntriesOf(files: ExportFiles, branch: Branch): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [
    { path: SKIP_JEKYLL_FILE, mode: FILE_MODE, type: 'blob', content: '\n' },
  ];
  for (const [path, content] of Object.entries(files)) {
    if (typeof content === 'string') {
      entries.push({ path, mode: FILE_MODE, type: 'blob', content });
      continue;
    }
    const bytes = new Uint8Array(await content.arrayBuffer());
    const blob = await callGitHub({
      path: `${branch.repositoryPath}/git/blobs`,
      token: branch.token,
      method: 'POST',
      body: { content: base64Of(bytes), encoding: 'base64' },
    });
    entries.push({ path, mode: FILE_MODE, type: 'blob', sha: shaOf(blob) });
  }
  return entries;
}

async function commitFiles(files: ExportFiles, branch: Branch): Promise<void> {
  const { repositoryPath, token } = branch;
  const headCommit = await headCommitOf(branch);
  const entries = await treeEntriesOf(files, branch);
  const tree = await callGitHub({
    path: `${repositoryPath}/git/trees`,
    token,
    method: 'POST',
    body: { tree: entries },
  });
  const commit = await callGitHub({
    path: `${repositoryPath}/git/commits`,
    token,
    method: 'POST',
    body: { message: 'Publish site', tree: shaOf(tree), parents: [headCommit] },
  });
  await callGitHub({
    path: `${repositoryPath}/git/refs/heads/${branch.name}`,
    token,
    method: 'PATCH',
    body: { sha: shaOf(commit) },
  });
}

export async function publishToGitHubPages(
  files: ExportFiles,
  token: string,
  site: PublishedSite,
): Promise<PublishedSite> {
  const repositoryPath = `/repos/${site.siteId}`;
  const repository = await callGitHub({ path: repositoryPath, token, method: 'GET' });
  const branchName = textAt(repository, 'default_branch');
  if (branchName === null) throw new PublishError('failed', UNREADABLE_ANSWER);
  await commitFiles(files, { repositoryPath, name: branchName, token });
  const response = await requestGitHub({
    path: `${repositoryPath}/pages`,
    token,
    method: 'POST',
    body: { source: { branch: branchName, path: '/' } },
  });
  if (response.status === HTTP_CONFLICT) return site;
  const pages = await answerOf(response);
  return { siteId: site.siteId, url: textAt(pages, 'html_url') ?? site.url };
}
