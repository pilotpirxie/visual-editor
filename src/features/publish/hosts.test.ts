import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APP_SETTINGS_STORAGE_KEY,
  readAppSettings,
  updateAppSettings,
} from '../../app/appSettings';
import { store } from '../../app/store';
import type { AssembledExport } from '../export/exportJob';
import { createGitHubRepository, publishToGitHubPages } from './github';
import { publishSite } from './hosts';
import { PublishError, publishToNetlify } from './netlify';

vi.mock(import('./netlify'), async (importOriginal) => ({
  ...(await importOriginal()),
  publishToNetlify: vi.fn(),
}));

vi.mock(import('./github'), () => ({
  createGitHubRepository: vi.fn(),
  publishToGitHubPages: vi.fn(),
}));

const ZIP = new Blob(['zip']);
const FILES = { 'index.html': '<!doctype html>' };
const ASSEMBLED: AssembledExport = {
  zip: ZIP,
  result: { files: FILES, notes: [], omitted: { components: 0, primitives: [], tokens: 0 } },
};
const NETLIFY_SITE = { siteId: 'site-1', url: 'https://one.netlify.app' };
const REPOSITORY = { siteId: 'ada/fieldnote', url: 'https://ada.github.io/fieldnote/' };

function projectId(): string {
  return store.getState().project.id;
}

async function messageOf(publishing: Promise<unknown>): Promise<string> {
  try {
    await publishing;
  } catch (error) {
    if (error instanceof PublishError) return error.message;
    throw error;
  }
  throw new Error('Publishing was expected to fail');
}

beforeEach(() => {
  localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
});

afterEach(() => {
  vi.mocked(publishToNetlify).mockReset();
  vi.mocked(createGitHubRepository).mockReset();
  vi.mocked(publishToGitHubPages).mockReset();
});

describe('publishSite on Netlify', () => {
  it('uploads the zip with the trimmed token, remembers the site and reuses it next time', async () => {
    updateAppSettings({ netlifyToken: ' token-1 ' });
    vi.mocked(publishToNetlify).mockResolvedValue(NETLIFY_SITE);
    expect(await publishSite('netlify', ASSEMBLED)).toEqual(NETLIFY_SITE);
    expect(publishToNetlify).toHaveBeenCalledWith(ZIP, 'token-1', null);
    expect(readAppSettings().publishedSites[projectId()]).toEqual(NETLIFY_SITE);
    expect(readAppSettings().githubSites).toEqual({});
    await publishSite('netlify', ASSEMBLED);
    expect(publishToNetlify).toHaveBeenLastCalledWith(ZIP, 'token-1', 'site-1');
  });

  it('forgets a site that was deleted on Netlify and says to publish again', async () => {
    updateAppSettings({
      netlifyToken: 'token-1',
      publishedSites: { [projectId()]: NETLIFY_SITE, other: NETLIFY_SITE },
    });
    vi.mocked(publishToNetlify).mockRejectedValue(
      new PublishError('missing-site', 'The site no longer exists on Netlify.'),
    );
    expect(await messageOf(publishSite('netlify', ASSEMBLED))).toBe(
      'The site no longer exists on Netlify. Publish again to make a new site.',
    );
    expect(readAppSettings().publishedSites).toEqual({ other: NETLIFY_SITE });
  });

  it('keeps the site when publishing fails for another reason', async () => {
    updateAppSettings({ netlifyToken: 'bad', publishedSites: { [projectId()]: NETLIFY_SITE } });
    const refused = new PublishError('token', 'Netlify did not accept the access token.');
    vi.mocked(publishToNetlify).mockRejectedValue(refused);
    await expect(publishSite('netlify', ASSEMBLED)).rejects.toBe(refused);
    expect(readAppSettings().publishedSites[projectId()]).toEqual(NETLIFY_SITE);
  });
});

describe('publishSite on GitHub Pages', () => {
  it('makes a repository named after the site, then commits the files into it', async () => {
    updateAppSettings({ githubToken: 'ghp_test' });
    const live = { ...REPOSITORY, url: 'https://ada.example/' };
    vi.mocked(createGitHubRepository).mockResolvedValue(REPOSITORY);
    vi.mocked(publishToGitHubPages).mockResolvedValue(live);
    expect(await publishSite('github', ASSEMBLED)).toEqual(live);
    const { title } = store.getState().project.settings;
    expect(createGitHubRepository).toHaveBeenCalledWith('ghp_test', title);
    expect(publishToGitHubPages).toHaveBeenCalledWith(FILES, 'ghp_test', REPOSITORY);
    expect(readAppSettings().githubSites[projectId()]).toEqual(live);
    expect(readAppSettings().publishedSites).toEqual({});
  });

  it('remembers a new repository even when the first upload fails, and reuses it', async () => {
    updateAppSettings({ githubToken: 'ghp_test' });
    vi.mocked(createGitHubRepository).mockResolvedValue(REPOSITORY);
    vi.mocked(publishToGitHubPages).mockRejectedValueOnce(
      new PublishError('failed', 'GitHub answered with an error (500).'),
    );
    await expect(publishSite('github', ASSEMBLED)).rejects.toThrow('(500)');
    expect(readAppSettings().githubSites[projectId()]).toEqual(REPOSITORY);
    vi.mocked(publishToGitHubPages).mockResolvedValue(REPOSITORY);
    await publishSite('github', ASSEMBLED);
    expect(createGitHubRepository).toHaveBeenCalledTimes(1);
  });

  it('forgets a repository that was deleted on GitHub', async () => {
    updateAppSettings({ githubToken: 'ghp_test', githubSites: { [projectId()]: REPOSITORY } });
    vi.mocked(publishToGitHubPages).mockRejectedValue(
      new PublishError('missing-site', 'The repository no longer exists on GitHub.'),
    );
    expect(await messageOf(publishSite('github', ASSEMBLED))).toBe(
      'The repository no longer exists on GitHub. Publish again to make a new site.',
    );
    expect(readAppSettings().githubSites).toEqual({});
    expect(createGitHubRepository).not.toHaveBeenCalled();
  });
});
