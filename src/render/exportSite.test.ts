import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createPage, createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { registry } from '../components/registry';
import { loadIconSet } from '../features/icons/loadIconSet';
import { placeholderImage } from './placeholder';
import { buildExportFiles, buildLicensesText, buildSiteJs, dataUrlToBlob } from './exportSite';
import { componentBlockOf, withSystemFonts } from '../test/fixtures';

const runtime = { core: '/* core */', behaviors: { menu: '/* menu */' } };

beforeAll(async () => {
  await loadIconSet('lucide');
});

function homePage(project: Project) {
  return project.pages.entities[project.pages.homePageId];
}

function blockIdOf(project: Project, componentId: string): string {
  const blockIds = homePage(project).blockIds;
  const blockId = blockIds.find((id) => componentBlockOf(project, id).componentId === componentId);
  if (blockId === undefined) throw new Error(`The sample page has no ${componentId} block`);
  return blockId;
}

function filesOf(project: Project) {
  return buildExportFiles(project, registry, runtime).files;
}

function text(files: Record<string, string | Blob>, path: string): string {
  const file = files[path];
  if (typeof file !== 'string') throw new Error(`${path} was not written as text`);
  return file;
}

describe('buildExportFiles', () => {
  it('writes pages at the top and CSS, JS and images under assets', () => {
    const files = filesOf(createSampleProject());
    expect(Object.keys(files).sort()).toEqual([
      'assets/css/site.css',
      'assets/js/site.js',
      'index.html',
      'licenses.txt',
    ]);
    const html = text(files, 'index.html');
    expect(html).toContain('<title>Home | Fieldnote</title>');
    expect(html).toContain('<link rel="stylesheet" href="assets/css/site.css">');
    expect(html).toContain('<script src="assets/js/site.js" defer></script>');
    expect(files['assets/js/site.js']).toBe(
      '/* core */\n/* menu */\nsiteRuntime.start(document);\n',
    );
  });

  it('pretty-prints the page with blocks indented inside the body', () => {
    const html = text(filesOf(createSampleProject()), 'index.html');
    expect(html).toContain('\n<body>\n  <svg hidden');
    expect(html).toContain('\n  <main>\n    <nav data-component="nav-simple"');
    expect(html).toContain('\n  </main>\n');
  });

  it('puts the icons of each page in one sprite and refers to them with use', () => {
    const html = text(filesOf(createSampleProject()), 'index.html');
    expect(html).toMatch(/<body>\n {2}<svg hidden aria-hidden="true"><symbol id="icon-lucide-/);
    expect(html).toContain('<use href="#icon-lucide-zap"></use>');
    expect(html.match(/<symbol id="icon-lucide-zap"/g)).toHaveLength(1);
  });

  it('writes placeholder images as files and links them from the page', () => {
    const project = createSampleProject();
    const hero = componentBlockOf(project, blockIdOf(project, 'hero-centered'));
    hero.componentId = 'content-text-image';
    hero.values = {
      ...registry
        .get('content-text-image')
        ?.definition.fields.reduce<Record<string, unknown>>(
          (values, field) => ({ ...values, [field.name]: field.default }),
          {},
        ),
      image: placeholderImage({ ratio: '3:2', subject: 'photo' }, 'A team at work'),
    };
    const files = filesOf(project);
    expect(files['assets/images/placeholder-photo-1200x800.svg']).toContain('<svg');
    expect(text(files, 'index.html')).toContain(
      'src="assets/images/placeholder-photo-1200x800.svg"',
    );
  });

  it('links the Google Fonts the shipped CSS uses, with preconnects', () => {
    const project = createSampleProject();
    project.designSystem.fonts = [{ role: 'body', family: 'DM Sans', weights: [400, 700] }];
    const files = filesOf(project);
    const html = text(files, 'index.html');
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    expect(html).toContain(
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&amp;display=swap">',
    );
    expect(files['licenses.txt']).toContain('- DM Sans');
  });

  it('links no fonts when only system fonts are used', () => {
    const project = withSystemFonts(createSampleProject());
    expect(text(filesOf(project), 'index.html')).not.toContain('fonts.googleapis.com');
  });

  it('writes one HTML file per page, named after its slug, with the home page as index', () => {
    const project = createSampleProject();
    const about = createPage('about', 'About', 'about');
    about.blockIds = [blockIdOf(project, 'footer-simple')];
    homePage(project).blockIds = homePage(project).blockIds.filter(
      (id) => id !== about.blockIds[0],
    );
    project.pages.ids.push(about.id);
    project.pages.entities[about.id] = about;
    const files = filesOf(project);
    expect(text(files, 'about.html')).toContain('<title>About | Fieldnote</title>');
    expect(text(files, 'about.html')).toContain('b-footer-simple');
    expect(text(files, 'index.html')).not.toContain('b-footer-simple');
    expect(text(files, 'assets/css/site.css')).toContain('@scope (.b-footer-simple)');
  });

  it('renders the shared header before main and the shared footer after it', () => {
    const project = createSampleProject();
    const navId = blockIdOf(project, 'nav-simple');
    const footerId = blockIdOf(project, 'footer-simple');
    homePage(project).blockIds = homePage(project).blockIds.filter(
      (id) => id !== navId && id !== footerId,
    );
    project.sharedSlots = { header: [navId], footer: [footerId] };
    const about = createPage('about', 'About', 'about');
    about.showSharedFooter = false;
    project.pages.ids.push(about.id);
    project.pages.entities[about.id] = about;
    const files = filesOf(project);
    const home = text(files, 'index.html');
    expect(home.indexOf('b-nav-simple')).toBeLessThan(home.indexOf('<main>'));
    expect(home.indexOf('b-footer-simple')).toBeGreaterThan(home.indexOf('</main>'));
    expect(text(files, 'about.html')).toContain('b-nav-simple');
    expect(text(files, 'about.html')).not.toContain('b-footer-simple');
  });

  it('writes social images and the favicon under assets/images', async () => {
    const project = createSampleProject();
    project.assets.abcdef123456 = {
      id: 'abcdef123456',
      name: 'Launch card.PNG',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,aGk=',
    };
    project.assets.fav12345678 = {
      id: 'fav12345678',
      name: 'icon.svg',
      mimeType: 'image/svg+xml',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
    };
    homePage(project).seo.socialImageAssetId = 'abcdef123456';
    project.settings.faviconAssetId = 'fav12345678';
    const files = filesOf(project);
    const image = files['assets/images/launch-card-abcdef12.png'];
    if (!(image instanceof Blob)) throw new Error('The social image was not written as a file');
    expect(await image.text()).toBe('hi');
    const html = text(files, 'index.html');
    expect(html).toContain('content="assets/images/launch-card-abcdef12.png"');
    expect(html).toContain('<link rel="icon" href="assets/images/icon-fav12345.svg"');
  });

  it('leaves editor attributes out of the HTML', () => {
    expect(text(filesOf(createSampleProject()), 'index.html')).not.toMatch(
      /data-block-id|data-field/,
    );
  });

  it('ships CSS only for the components, primitives and tokens the site uses', () => {
    const result = buildExportFiles(createSampleProject(), registry, runtime);
    const css = text(result.files, 'assets/css/site.css');
    expect(css).toContain('@scope (.b-nav-simple)');
    expect(css).not.toContain('@scope (.b-cta-centered)');
    expect(css).not.toContain('.media {');
    expect(result.omitted.primitives).toContain('media');
    expect(result.omitted.components).toBe(registry.size - 4);
  });

  it('writes HTML blocks as they are and still ships their source CSS and behaviors', () => {
    const project = createSampleProject();
    const navId = blockIdOf(project, 'nav-simple');
    project.blocks.entities[navId] = {
      id: navId,
      kind: 'html',
      html: '<nav class="b-nav-simple" data-behavior="menu"><a href="index.html">Home</a></nav>',
      disabled: false,
      extraClasses: [],
      hideOn: [],
      sourceComponentId: 'nav-simple',
    };
    const files = filesOf(project);
    expect(text(files, 'index.html')).toContain(
      '<nav class="b-nav-simple" data-behavior="menu"><a href="index.html">Home</a></nav>',
    );
    expect(text(files, 'assets/css/site.css')).toContain('@scope (.b-nav-simple)');
    expect(files['assets/js/site.js']).toContain('/* menu */');
  });

  it('skips disabled blocks and their CSS', () => {
    const project = createSampleProject();
    project.blocks.entities[blockIdOf(project, 'hero-centered')].disabled = true;
    const files = filesOf(project);
    expect(text(files, 'index.html')).not.toContain('b-hero-centered');
    expect(text(files, 'assets/css/site.css')).not.toContain('@scope (.b-hero-centered)');
  });

  it('skips blocks that are listed on the page but missing from the project', () => {
    const project = createSampleProject();
    homePage(project).blockIds.push('lost-block');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(text(filesOf(project), 'index.html')).toContain('b-footer-simple');
    expect(warn).toHaveBeenCalledWith(
      'Export skipped block lost-block: it is missing from the project',
    );
  });

  it('writes a sitemap of indexed pages and a robots file only when a base URL is set', () => {
    const project = createSampleProject();
    const about = createPage('about', 'About', 'about');
    const hidden = createPage('thanks', 'Thanks', 'thanks');
    hidden.seo.noindex = true;
    for (const page of [about, hidden]) {
      project.pages.ids.push(page.id);
      project.pages.entities[page.id] = page;
    }
    expect(Object.keys(filesOf(project))).not.toContain('sitemap.xml');
    expect(Object.keys(filesOf(project))).not.toContain('robots.txt');
    project.settings.baseUrl = 'https://fieldnote.app/';
    const files = filesOf(project);
    expect(text(files, 'sitemap.xml')).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://fieldnote.app/</loc></url>',
        '  <url><loc>https://fieldnote.app/about.html</loc></url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
    expect(text(files, 'robots.txt')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://fieldnote.app/sitemap.xml\n',
    );
    expect(text(files, 'thanks.html')).toContain('<meta name="robots" content="noindex">');
    expect(text(files, 'about.html')).not.toContain('name="robots"');
  });

  it('writes no sitemap when search engines may not index the site', () => {
    const project = createSampleProject();
    project.settings.baseUrl = 'https://fieldnote.app';
    project.settings.indexable = false;
    const files = filesOf(project);
    expect(Object.keys(files)).not.toContain('sitemap.xml');
    expect(text(files, 'robots.txt')).toBe('User-agent: *\nAllow: /\n');
    expect(text(files, 'index.html')).toContain('<meta name="robots" content="noindex">');
  });

  it('ships no site.js and no script tag when no behavior is used', () => {
    const project = createSampleProject();
    const page = homePage(project);
    page.blockIds = page.blockIds.filter((id) => id !== blockIdOf(project, 'nav-simple'));
    const files = filesOf(project);
    expect(files['assets/js/site.js']).toBeUndefined();
    expect(text(files, 'index.html')).not.toContain('<script');
  });
});

describe('buildLicensesText', () => {
  it('names the icon sets and fonts the site uses', () => {
    const textFile = buildLicensesText(
      ['lucide'],
      [{ role: 'heading', family: 'Inter', weights: [700] }],
    );
    expect(textFile).toContain('- Lucide: ISC');
    expect(textFile).toContain('- Inter');
  });
});

describe('buildSiteJs', () => {
  it('rejects a behavior the runtime does not have', () => {
    expect(() => buildSiteJs(['carousel'], runtime)).toThrow(
      'Unknown site runtime behavior "carousel"',
    );
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a base64 data URL with its type', async () => {
    const blob = dataUrlToBlob('data:image/gif;base64,R0lG');
    expect(blob.type).toBe('image/gif');
    expect(await blob.text()).toBe('GIF');
  });

  it('rejects data that is not a base64 data URL', () => {
    expect(() => dataUrlToBlob('data:text/plain,hello')).toThrow(
      'Only base64 data URLs can be exported as files',
    );
  });
});
