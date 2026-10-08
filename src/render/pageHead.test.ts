import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Page, Project } from '../app/types';
import {
  applyTitleTemplate,
  buildPageHead,
  openGraphLocale,
  resolvePageMeta,
  robotsDirectives,
} from './pageHead';

function setup(
  changes: Partial<Page['seo']> = {},
  baseUrl?: string,
): { project: Project; page: Page } {
  const project = createSampleProject();
  if (baseUrl !== undefined) project.settings.baseUrl = baseUrl;
  const page = { ...project.pages.entities[project.pages.homePageId], name: 'About' };
  page.seo = { noindex: false, ...changes };
  return { project, page };
}

function head(project: Project, page: Page, fileName = 'about.html', assetFiles = {}): string {
  return buildPageHead({ project, page, fileName, assetFiles, fontsHref: null }).join('\n');
}

describe('applyTitleTemplate', () => {
  it('fills in the page and site title', () => {
    expect(applyTitleTemplate('{{page.title}} | {{site.title}}', 'About', 'Acme')).toBe(
      'About | Acme',
    );
  });
});

describe('buildPageHead', () => {
  it('uses the page name in the title and for sharing when nothing else is set', () => {
    const { project, page } = setup();
    const html = head(project, page);
    expect(html).toContain('<title>About | Fieldnote</title>');
    expect(html).toContain('<meta property="og:title" content="About | Fieldnote">');
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html).not.toContain('name="description"');
    expect(html).not.toContain('rel="canonical"');
  });

  it('uses the SEO title, description and social texts the user set', () => {
    const { project, page } = setup({
      title: 'Our story',
      description: 'Who we are & why',
      socialTitle: 'Meet the team',
    });
    const html = head(project, page);
    expect(html).toContain('<title>Our story | Fieldnote</title>');
    expect(html).toContain('<meta name="description" content="Who we are &amp; why">');
    expect(html).toContain('<meta property="og:title" content="Meet the team">');
    expect(html).toContain('<meta property="og:description" content="Who we are &amp; why">');
  });

  it('links the social image file and switches to a large card', () => {
    const { project, page } = setup({ socialImageAssetId: 'a1' });
    const html = head(project, page, 'about.html', { a1: 'card-a1.png' });
    expect(html).toContain('<meta property="og:image" content="card-a1.png">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('writes absolute canonical and image URLs when the site has a base URL', () => {
    const { project, page } = setup({ socialImageAssetId: 'a1' }, 'https://acme.com/');
    const html = head(project, page, 'about.html', { a1: 'card-a1.png' });
    expect(html).toContain('<link rel="canonical" href="https://acme.com/about.html">');
    expect(html).toContain('content="https://acme.com/card-a1.png"');
    expect(head(project, page, 'index.html')).toContain('href="https://acme.com/"');
  });

  it('fills the project title template', () => {
    const { project, page } = setup({ title: 'Pricing' });
    project.settings.titleTemplate = '{{site.title}} · {{page.title}}';
    expect(head(project, page)).toContain('<title>Fieldnote · Pricing</title>');
  });

  it('falls back to the project description and default social image', () => {
    const { project, page } = setup();
    project.settings.description = 'Research, tagged.';
    project.settings.socialImageAssetId = 'p1';
    const html = head(project, page, 'about.html', { p1: 'default-p1.png' });
    expect(html).toContain('<meta name="description" content="Research, tagged.">');
    expect(html).toContain('<meta property="og:image" content="default-p1.png">');
  });

  it('prefers the page description and social image over the project defaults', () => {
    const { project, page } = setup({ description: 'About us', socialImageAssetId: 'a1' });
    project.settings.description = 'Research, tagged.';
    project.settings.socialImageAssetId = 'p1';
    const html = head(project, page, 'about.html', { a1: 'card-a1.png', p1: 'default-p1.png' });
    expect(html).toContain('content="About us"');
    expect(html).toContain('content="card-a1.png"');
    expect(html).not.toContain('default-p1.png');
  });

  it('links the favicon with its type', () => {
    const { project, page } = setup();
    project.assets.f1 = {
      id: 'f1',
      name: 'icon.svg',
      mimeType: 'image/svg+xml',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
    };
    project.settings.faviconAssetId = 'f1';
    const html = head(project, page, 'about.html', { f1: 'icon-f1.svg' });
    expect(html).toContain('<link rel="icon" href="icon-f1.svg" type="image/svg+xml">');
  });

  it('escapes text so it cannot end the tag', () => {
    const { project, page } = setup({ title: '"><script>' });
    expect(head(project, page)).toContain('<title>&quot;&gt;&lt;script&gt; | Fieldnote</title>');
  });

  it('combines the robots directives of the site and the page', () => {
    const { project, page } = setup({ snippets: false });
    project.settings.follow = false;
    project.settings.imagePreview = 'large';
    expect(head(project, page)).toContain(
      '<meta name="robots" content="nofollow, nosnippet, max-image-preview:large">',
    );
    page.seo.follow = true;
    page.seo.noindex = true;
    expect(head(project, page)).toContain(
      '<meta name="robots" content="noindex, nosnippet, max-image-preview:large">',
    );
  });

  it('describes the site for sharing with its name, type, locale and URL', () => {
    const { project, page } = setup({}, 'https://acme.com');
    project.settings.language = 'en-GB';
    page.seo.openGraphType = 'article';
    const html = head(project, page);
    expect(html).toContain('<meta property="og:site_name" content="Fieldnote">');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta property="og:locale" content="en_GB">');
    expect(html).toContain('<meta property="og:url" content="https://acme.com/about.html">');
  });

  it('uses a page canonical URL for the canonical link and sharing', () => {
    const { project, page } = setup({ canonicalUrl: 'https://blog.acme.com/about' });
    const html = head(project, page);
    expect(html).toContain('<link rel="canonical" href="https://blog.acme.com/about">');
    expect(html).toContain('<meta property="og:url" content="https://blog.acme.com/about">');
  });

  it('writes the X accounts and the image description', () => {
    const { project, page } = setup({ socialImageAssetId: 'a1', twitterCreator: '@jane' });
    project.settings.twitterSite = '@acme';
    project.settings.socialImageAlt = 'The Fieldnote app';
    const html = head(project, page, 'about.html', { a1: 'card-a1.png' });
    expect(html).toContain('<meta name="twitter:site" content="@acme">');
    expect(html).toContain('<meta name="twitter:creator" content="@jane">');
    expect(html).toContain('<meta property="og:image:alt" content="The Fieldnote app">');
    expect(html).toContain('<meta name="twitter:image:alt" content="The Fieldnote app">');
  });

  it('resolves a theme color token and lets the page override it', () => {
    const { project, page } = setup();
    project.settings.themeColor = 'var(--color-primary)';
    const primary = project.designSystem.tokens['--color-primary']?.value ?? '';
    expect(head(project, page)).toContain(`<meta name="theme-color" content="${primary}">`);
    page.seo.themeColor = '#123456';
    expect(head(project, page)).toContain('<meta name="theme-color" content="#123456">');
  });

  it('writes verification codes, author and keywords', () => {
    const { project, page } = setup({ keywords: 'about, team' });
    project.settings.verification = { google: 'g-123', bing: 'B456' };
    project.settings.author = 'Fieldnote team';
    project.settings.keywords = 'research';
    const html = head(project, page);
    expect(html).toContain('<meta name="google-site-verification" content="g-123">');
    expect(html).toContain('<meta name="msvalidate.01" content="B456">');
    expect(html).toContain('<meta name="author" content="Fieldnote team">');
    expect(html).toContain('<meta name="keywords" content="about, team">');
    expect(html).not.toContain('content="research"');
  });

  it('adds custom meta tags, lets the page replace them and replaces generated ones', () => {
    const { project, page } = setup({
      metaTags: [
        { attribute: 'name', key: 'format-detection', content: 'telephone=yes' },
        { attribute: 'name', key: 'description', content: 'Custom description' },
      ],
    });
    project.settings.metaTags = [
      { attribute: 'name', key: 'format-detection', content: 'telephone=no' },
      { attribute: 'name', key: 'referrer', content: 'no-referrer' },
      { attribute: 'name', key: '', content: 'unfinished' },
    ];
    const html = head(project, page);
    expect(html).toContain('<meta name="format-detection" content="telephone=yes">');
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<meta name="description" content="Custom description">');
    expect(html).not.toContain('telephone=no');
    expect(html).not.toContain('unfinished');
  });

  it('links the app icon as the Apple touch icon and the web manifest', () => {
    const { project, page } = setup();
    project.settings.appIconAssetId = 'i1';
    project.settings.appName = 'Fieldnote';
    const html = head(project, page, 'about.html', { i1: 'icon-i1.png' });
    expect(html).toContain('<link rel="apple-touch-icon" href="icon-i1.png">');
    expect(html).toContain('<link rel="manifest" href="site.webmanifest">');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Fieldnote">');
  });

  it('adds structured data unless the site turns it off', () => {
    const { project, page } = setup();
    expect(head(project, page)).toContain('<script type="application/ld+json">');
    project.settings.schemaMarkup = false;
    expect(head(project, page)).not.toContain('application/ld+json');
  });
});

describe('robotsDirectives', () => {
  it('is empty for an indexed page with default settings', () => {
    expect(robotsDirectives(true, {})).toEqual([]);
  });

  it('lists every directive that differs from the default', () => {
    expect(
      robotsDirectives(false, {
        follow: false,
        snippets: false,
        imagePreview: 'none',
        translate: false,
      }),
    ).toEqual(['noindex', 'nofollow', 'nosnippet', 'max-image-preview:none', 'notranslate']);
  });
});

describe('openGraphLocale', () => {
  it('writes a language with a region in Open Graph form', () => {
    expect(openGraphLocale('pt-BR')).toBe('pt_BR');
  });

  it('skips a language without a region', () => {
    expect(openGraphLocale('en')).toBeNull();
  });
});

describe('resolvePageMeta', () => {
  it('prefers page values and merges meta tags by name', () => {
    const { project, page } = setup({
      author: 'Jane',
      metaTags: [{ attribute: 'property', key: 'fb:app_id', content: '2' }],
    });
    project.settings.author = 'Team';
    project.settings.keywords = 'research';
    project.settings.metaTags = [{ attribute: 'property', key: 'fb:app_id', content: '1' }];
    const meta = resolvePageMeta(project, page);
    expect(meta.author).toBe('Jane');
    expect(meta.keywords).toBe('research');
    expect(meta.metaTags).toEqual([{ attribute: 'property', key: 'fb:app_id', content: '2' }]);
  });
});
