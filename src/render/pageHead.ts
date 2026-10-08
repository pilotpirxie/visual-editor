import { resolveColor } from '../features/design-system/colors';
import {
  VERIFICATION_SERVICES,
  type MetaAttribute,
  type MetaTag,
  type Page,
  type Project,
  type SharedMeta,
  type VerificationService,
} from '../app/types';
import { escapeHtml } from './attributes';
import { buildStructuredData } from './structuredData';
export const SITE_CSS_PATH = 'assets/css/site.css';
export const IMAGES_FOLDER = 'assets/images';
export const MANIFEST_PATH = 'site.webmanifest';

export const DEFAULT_TITLE_TEMPLATE = '{{page.title}} | {{site.title}}';

const PAGE_TITLE_PLACEHOLDER = '{{page.title}}';
const SITE_TITLE_PLACEHOLDER = '{{site.title}}';
const TRAILING_SLASHES = /\/+$/;
const LOCALE_WITH_REGION = /^(?<language>[a-z]{2,3})-(?<region>[A-Z]{2})$/;
export const HOME_FILE = 'index.html';

const VERIFICATION_META_NAMES: Record<VerificationService, string> = {
  google: 'google-site-verification',
  bing: 'msvalidate.01',
  yandex: 'yandex-verification',
  pinterest: 'p:domain_verify',
  facebook: 'facebook-domain-verification',
};

export type HeadSite = Pick<Project, 'settings' | 'assets' | 'designSystem'>;

export type PageHeadInput = {
  project: HeadSite;
  page: Page;
  fileName: string;
  assetFiles: Record<string, string>;
  fontsHref: string | null;
};

export function applyTitleTemplate(template: string, pageTitle: string, siteTitle: string): string {
  return template
    .replaceAll(PAGE_TITLE_PLACEHOLDER, pageTitle)
    .replaceAll(SITE_TITLE_PLACEHOLDER, siteTitle);
}

export function isPageIndexed(project: Pick<Project, 'settings'>, page: Page): boolean {
  return project.settings.indexable && !page.seo.noindex;
}

export function siteBaseUrl(baseUrl: string | undefined): string | null {
  const base = baseUrl?.trim().replace(TRAILING_SLASHES, '') ?? '';
  return base === '' ? null : base;
}

export function absoluteUrl(baseUrl: string | undefined, path: string): string | null {
  const base = siteBaseUrl(baseUrl);
  if (base === null) return null;
  return path === HOME_FILE ? `${base}/` : `${base}/${path}`;
}

export function canonicalUrlOf(
  project: Pick<Project, 'settings'>,
  page: Page,
  fileName: string,
): string | null {
  return page.seo.canonicalUrl ?? absoluteUrl(project.settings.baseUrl, fileName);
}

export type PageSeoDefaults = {
  title: string;
  description: string;
  socialTitle: string;
  socialDescription: string;
};

export function pageSeoDefaults(project: Pick<Project, 'settings'>, page: Page): PageSeoDefaults {
  const { settings } = project;
  const pageTitle = page.seo.title?.trim() || page.name;
  const title = applyTitleTemplate(settings.titleTemplate, pageTitle, settings.title);
  const description = page.seo.description?.trim() || settings.description.trim();
  return {
    title,
    description,
    socialTitle: page.seo.socialTitle?.trim() || title,
    socialDescription: page.seo.socialDescription?.trim() || description,
  };
}

function sameTag(left: MetaTag, right: MetaTag): boolean {
  return left.attribute === right.attribute && left.key === right.key;
}

export function mergeMetaTags(base: MetaTag[], overrides: MetaTag[]): MetaTag[] {
  const merged = [...base];
  for (const tag of overrides) {
    if (tag.key === '') continue;
    const index = merged.findIndex((existing) => sameTag(existing, tag));
    if (index === -1) {
      merged.push(tag);
    } else {
      merged[index] = tag;
    }
  }
  return merged;
}

export function resolvePageMeta(project: Pick<Project, 'settings'>, page: Page): SharedMeta {
  const site = project.settings;
  const own = page.seo;
  return {
    author: own.author ?? site.author,
    keywords: own.keywords ?? site.keywords,
    follow: own.follow ?? site.follow,
    snippets: own.snippets ?? site.snippets,
    imagePreview: own.imagePreview ?? site.imagePreview,
    translate: own.translate ?? site.translate,
    openGraphType: own.openGraphType ?? site.openGraphType,
    socialImageAlt: own.socialImageAlt ?? site.socialImageAlt,
    twitterCreator: own.twitterCreator ?? site.twitterCreator,
    themeColor: own.themeColor ?? site.themeColor,
    sitemapFrequency: own.sitemapFrequency ?? site.sitemapFrequency,
    sitemapPriority: own.sitemapPriority ?? site.sitemapPriority,
    metaTags: mergeMetaTags(site.metaTags ?? [], own.metaTags ?? []),
    jsonLd: own.jsonLd,
  };
}

export function robotsDirectives(isIndexed: boolean, meta: SharedMeta): string[] {
  const directives: string[] = [];
  if (!isIndexed) directives.push('noindex');
  if (meta.follow === false) directives.push('nofollow');
  if (meta.snippets === false) directives.push('nosnippet');
  if (meta.imagePreview !== undefined) directives.push(`max-image-preview:${meta.imagePreview}`);
  if (meta.translate === false) directives.push('notranslate');
  return directives;
}

export function openGraphLocale(language: string): string | null {
  const parts = LOCALE_WITH_REGION.exec(language)?.groups;
  if (parts?.language === undefined || parts.region === undefined) return null;
  return `${parts.language}_${parts.region}`;
}

function tag(attribute: MetaAttribute, key: string, content: string | undefined): MetaTag[] {
  const trimmed = content?.trim() ?? '';
  if (trimmed === '') return [];
  return [{ attribute, key, content: trimmed }];
}

function metaLine({ attribute, key, content }: MetaTag): string {
  return `  <meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
}

function linkLine(rel: string, href: string, type?: string): string {
  const typeAttribute = type === undefined ? '' : ` type="${escapeHtml(type)}"`;
  return `  <link rel="${rel}" href="${escapeHtml(href)}"${typeAttribute}>`;
}

function assetFile(input: PageHeadInput, assetId: string | undefined): string | undefined {
  if (assetId === undefined) return undefined;
  return input.assetFiles[assetId];
}

function verificationTags(input: PageHeadInput): MetaTag[] {
  const codes = input.project.settings.verification ?? {};
  const tags: MetaTag[] = [];
  for (const service of VERIFICATION_SERVICES) {
    tags.push(...tag('name', VERIFICATION_META_NAMES[service], codes[service]));
  }
  return tags;
}

type PageTexts = PageSeoDefaults & { canonical: string | null };

function generatedMetaTags(input: PageHeadInput, meta: SharedMeta, texts: PageTexts): MetaTag[] {
  const { project, page } = input;
  const { settings } = project;
  const { description, socialTitle, socialDescription, canonical } = texts;
  const imageFile = assetFile(input, page.seo.socialImageAssetId ?? settings.socialImageAssetId);
  const imageUrl =
    imageFile === undefined ? undefined : (absoluteUrl(settings.baseUrl, imageFile) ?? imageFile);
  const imageAlt = imageFile === undefined ? undefined : meta.socialImageAlt;
  const themeColor =
    meta.themeColor === undefined
      ? undefined
      : resolveColor(meta.themeColor, project.designSystem.tokens);
  const appName = settings.appName;

  return [
    ...tag('name', 'description', description),
    ...tag('name', 'author', meta.author),
    ...tag('name', 'keywords', meta.keywords),
    ...tag('name', 'robots', robotsDirectives(isPageIndexed(project, page), meta).join(', ')),
    ...tag('property', 'og:site_name', settings.title),
    ...tag('property', 'og:type', meta.openGraphType ?? 'website'),
    ...tag('property', 'og:title', socialTitle),
    ...tag('property', 'og:description', socialDescription),
    ...tag('property', 'og:url', canonical ?? undefined),
    ...tag('property', 'og:locale', openGraphLocale(settings.language) ?? undefined),
    ...tag('property', 'og:image', imageUrl),
    ...tag('property', 'og:image:alt', imageAlt),
    ...tag('name', 'twitter:card', imageUrl === undefined ? 'summary' : 'summary_large_image'),
    ...tag('name', 'twitter:site', settings.twitterSite),
    ...tag('name', 'twitter:creator', meta.twitterCreator),
    ...tag('name', 'twitter:image:alt', imageAlt),
    ...tag('name', 'theme-color', themeColor),
    ...tag('name', 'application-name', appName),
    ...tag('name', 'apple-mobile-web-app-title', appName),
    ...verificationTags(input),
  ];
}

function headMetaLines(input: PageHeadInput, meta: SharedMeta, texts: PageTexts): string[] {
  const lines: string[] = [];
  const tags = mergeMetaTags(generatedMetaTags(input, meta, texts), meta.metaTags ?? []);
  for (const metaTag of tags) {
    if (metaTag.content.trim() !== '') lines.push(metaLine(metaTag));
  }
  return lines;
}

function iconLines(input: PageHeadInput): string[] {
  const { settings, assets } = input.project;
  const lines: string[] = [];
  const favicon =
    settings.faviconAssetId === undefined ? undefined : assets[settings.faviconAssetId];
  const faviconFile = assetFile(input, settings.faviconAssetId);
  if (favicon !== undefined && faviconFile !== undefined) {
    lines.push(linkLine('icon', faviconFile, favicon.mimeType));
  }
  const appIconFile = assetFile(input, settings.appIconAssetId);
  if (appIconFile !== undefined) {
    lines.push(linkLine('apple-touch-icon', appIconFile), linkLine('manifest', MANIFEST_PATH));
  }
  return lines;
}

export function buildPageHead(input: PageHeadInput): string[] {
  const { project, page, fileName, fontsHref } = input;
  const meta = resolvePageMeta(project, page);
  const texts = {
    ...pageSeoDefaults(project, page),
    canonical: canonicalUrlOf(project, page, fileName),
  };
  const appIconFile = assetFile(input, project.settings.appIconAssetId);

  const lines = [
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(texts.title)}</title>`,
    ...headMetaLines(input, meta, texts),
  ];
  if (texts.canonical !== null) lines.push(linkLine('canonical', texts.canonical));
  lines.push(...iconLines(input));
  if (fontsHref !== null) {
    lines.push(
      '  <link rel="preconnect" href="https://fonts.googleapis.com">',
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      `  <link rel="stylesheet" href="${escapeHtml(fontsHref)}">`,
    );
  }
  lines.push(`  <link rel="stylesheet" href="${SITE_CSS_PATH}">`);
  const logoUrl =
    appIconFile === undefined ? null : absoluteUrl(project.settings.baseUrl, appIconFile);
  lines.push(
    ...buildStructuredData({
      settings: project.settings,
      page,
      base: siteBaseUrl(project.settings.baseUrl),
      isHome: fileName === HOME_FILE,
      canonical: texts.canonical,
      title: texts.title,
      description: texts.description,
      logoUrl,
    }),
  );
  return lines;
}
