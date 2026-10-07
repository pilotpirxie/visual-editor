import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Page, Project } from '../app/types';
import { applyTitleTemplate, buildPageHead } from './pageHead';

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
});
