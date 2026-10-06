import type { Page, Project } from '../app/types';
import { escapeHtml } from './attributes';
import { googleFontsHref } from './fonts';

export const DEFAULT_TITLE_TEMPLATE = '{{page.title}} | {{site.title}}';

const PAGE_TITLE_PLACEHOLDER = '{{page.title}}';
const SITE_TITLE_PLACEHOLDER = '{{site.title}}';
const TRAILING_SLASHES = /\/+$/;
const HOME_FILE = 'index.html';

export type PageHeadInput = {
  project: Project;
  page: Page;
  fileName: string;
  assetFiles: Record<string, string>;
};

export function applyTitleTemplate(template: string, pageTitle: string, siteTitle: string): string {
  return template
    .replaceAll(PAGE_TITLE_PLACEHOLDER, pageTitle)
    .replaceAll(SITE_TITLE_PLACEHOLDER, siteTitle);
}

function absoluteUrl(baseUrl: string | undefined, path: string): string | null {
  const base = baseUrl?.trim().replace(TRAILING_SLASHES, '') ?? '';
  if (base === '') return null;
  return path === HOME_FILE ? `${base}/` : `${base}/${path}`;
}

function meta(attribute: 'name' | 'property', key: string, content: string): string {
  return `  <meta ${attribute}="${key}" content="${escapeHtml(content)}">`;
}

export function buildPageHead({ project, page, fileName, assetFiles }: PageHeadInput): string[] {
  const { settings, designSystem } = project;
  const pageTitle = page.seo.title?.trim() || page.name;
  const title = applyTitleTemplate(DEFAULT_TITLE_TEMPLATE, pageTitle, settings.title);
  const description = page.seo.description?.trim() ?? '';
  const socialTitle = page.seo.socialTitle?.trim() || title;
  const socialDescription = page.seo.socialDescription?.trim() || description;
  const imageAssetId = page.seo.socialImageAssetId;
  const imageFile = imageAssetId === undefined ? undefined : assetFiles[imageAssetId];
  const canonical = absoluteUrl(settings.baseUrl, fileName);

  const lines = [
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
  ];
  if (description !== '') lines.push(meta('name', 'description', description));
  if (canonical !== null) lines.push(`  <link rel="canonical" href="${escapeHtml(canonical)}">`);
  lines.push(meta('property', 'og:title', socialTitle));
  if (socialDescription !== '') lines.push(meta('property', 'og:description', socialDescription));
  if (imageFile !== undefined) {
    const imageUrl = absoluteUrl(settings.baseUrl, imageFile) ?? imageFile;
    lines.push(meta('property', 'og:image', imageUrl));
  }
  lines.push(
    meta('name', 'twitter:card', imageFile === undefined ? 'summary' : 'summary_large_image'),
  );

  const fontsHref = googleFontsHref(designSystem.fonts);
  if (fontsHref !== null) {
    lines.push(
      '  <link rel="preconnect" href="https://fonts.googleapis.com">',
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      `  <link rel="stylesheet" href="${escapeHtml(fontsHref)}">`,
    );
  }
  lines.push('  <link rel="stylesheet" href="site.css">');
  return lines;
}
