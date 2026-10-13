import {
  readAppSettings,
  updateAppSettings,
  type AppSettings,
  type PublishedSite,
} from '../../app/appSettings';
import { store } from '../../app/store';
import type { AssembledExport } from '../export/exportJob';
import { createGitHubRepository, publishToGitHubPages } from './github';
import { PublishError, publishToNetlify } from './netlify';

export type PublishHost = 'netlify' | 'github';

export function publishTokenOf(host: PublishHost, settings: AppSettings): string {
  return host === 'netlify' ? settings.netlifyToken : settings.githubToken;
}

export function publishTokenChange(host: PublishHost, token: string): Partial<AppSettings> {
  return host === 'netlify' ? { netlifyToken: token } : { githubToken: token };
}

function sitesOf(host: PublishHost, settings: AppSettings): Record<string, PublishedSite> {
  return host === 'netlify' ? settings.publishedSites : settings.githubSites;
}

function rememberSites(host: PublishHost, sites: Record<string, PublishedSite>): void {
  updateAppSettings(host === 'netlify' ? { publishedSites: sites } : { githubSites: sites });
}

export function publishedSiteOf(
  host: PublishHost,
  settings: AppSettings,
  projectId: string,
): PublishedSite | null {
  return sitesOf(host, settings)[projectId] ?? null;
}

function rememberSite(host: PublishHost, projectId: string, site: PublishedSite): void {
  rememberSites(host, { ...sitesOf(host, readAppSettings()), [projectId]: site });
}

function forgetSite(host: PublishHost, projectId: string): void {
  const { [projectId]: forgotten, ...others } = sitesOf(host, readAppSettings());
  if (forgotten !== undefined) rememberSites(host, others);
}

async function publishToHost(
  host: PublishHost,
  { zip, result }: AssembledExport,
): Promise<PublishedSite> {
  const { id: projectId, settings: siteSettings } = store.getState().project;
  const settings = readAppSettings();
  const token = publishTokenOf(host, settings).trim();
  const existing = publishedSiteOf(host, settings, projectId);
  if (host === 'netlify') return publishToNetlify(zip, token, existing?.siteId ?? null);
  const repository = existing ?? (await createGitHubRepository(token, siteSettings.title));
  rememberSite(host, projectId, repository);
  return publishToGitHubPages(result.files, token, repository);
}

export async function publishSite(
  host: PublishHost,
  assembled: AssembledExport,
): Promise<PublishedSite> {
  const projectId = store.getState().project.id;
  try {
    const site = await publishToHost(host, assembled);
    rememberSite(host, projectId, site);
    return site;
  } catch (error) {
    const isSiteGone = error instanceof PublishError && error.problem === 'missing-site';
    if (!isSiteGone) throw error;
    forgetSite(host, projectId);
    throw new PublishError('missing-site', `${error.message} Publish again to make a new site.`, {
      cause: error,
    });
  }
}
