import { describe, expect, it, vi } from 'vitest';
import { createPage, createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { registry } from '../components/registry';
import { buildExportFiles, buildSiteJs, dataUrlToBlob } from './exportSite';

const runtime = { core: '/* core */', behaviors: { menu: '/* menu */' } };

function homePage(project: Project) {
  return project.pages.entities[project.pages.homePageId];
}

function blockIdOf(project: Project, componentId: string): string {
  const blockIds = homePage(project).blockIds;
  const blockId = blockIds.find((id) => project.blocks.entities[id].componentId === componentId);
  if (blockId === undefined) throw new Error(`The sample page has no ${componentId} block`);
  return blockId;
}

describe('buildExportFiles', () => {
  it('writes one HTML file, one CSS file and site.js when a behavior is used', () => {
    const files = buildExportFiles(createSampleProject(), registry, runtime);
    expect(Object.keys(files).sort()).toEqual(['index.html', 'site.css', 'site.js']);
    expect(files['index.html']).toContain('<title>Home | Fieldnote</title>');
    expect(files['index.html']).toContain('<link rel="stylesheet" href="site.css">');
    expect(files['index.html']).toContain('<script src="site.js" defer></script>');
    expect(files['site.js']).toBe('/* core */\n/* menu */\nsiteRuntime.start(document);\n');
  });

  it('links the Google Fonts the design system uses, with preconnects', () => {
    const project = createSampleProject();
    project.designSystem.fonts = [{ role: 'body', family: 'DM Sans', weights: [400, 700] }];
    const html = buildExportFiles(project, registry, runtime)['index.html'];
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    expect(html).toContain(
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&amp;display=swap">',
    );
  });

  it('links no fonts when only system fonts are used', () => {
    const html = buildExportFiles(createSampleProject(), registry, runtime)['index.html'];
    expect(html).not.toContain('fonts.googleapis.com');
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
    const files = buildExportFiles(project, registry, runtime);
    expect(Object.keys(files).sort()).toEqual(['about.html', 'index.html', 'site.css', 'site.js']);
    expect(files['about.html']).toContain('<title>About | Fieldnote</title>');
    expect(files['about.html']).toContain('b-footer-simple');
    expect(files['index.html']).not.toContain('b-footer-simple');
    expect(files['site.css']).toContain('@scope (.b-footer-simple)');
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
    const files = buildExportFiles(project, registry, runtime);
    const home = files['index.html'];
    if (typeof home !== 'string') throw new Error('The home page was not written as text');
    expect(home.indexOf('b-nav-simple')).toBeLessThan(home.indexOf('<main>'));
    expect(home.indexOf('b-footer-simple')).toBeGreaterThan(home.indexOf('</main>'));
    expect(files['about.html']).toContain('b-nav-simple');
    expect(files['about.html']).not.toContain('b-footer-simple');
    expect(files['site.css']).toContain('@scope (.b-footer-simple)');
  });

  it('writes social images as files next to the pages that use them', async () => {
    const project = createSampleProject();
    project.assets.abcdef123456 = {
      id: 'abcdef123456',
      name: 'Launch card.PNG',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,aGk=',
    };
    homePage(project).seo.socialImageAssetId = 'abcdef123456';
    const files = buildExportFiles(project, registry, runtime);
    const image = files['launch-card-abcdef12.png'];
    if (!(image instanceof Blob)) throw new Error('The social image was not written as a file');
    expect(await image.text()).toBe('hi');
    expect(files['index.html']).toContain('content="launch-card-abcdef12.png"');
  });

  it('leaves editor attributes out of the HTML', () => {
    const html = buildExportFiles(createSampleProject(), registry, runtime)['index.html'];
    expect(html).not.toMatch(/data-block-id|data-field/);
  });

  it('ships CSS only for components placed on the page', () => {
    const css = buildExportFiles(createSampleProject(), registry, runtime)['site.css'];
    expect(css).toContain('@scope (.b-nav-simple)');
    expect(css).toContain('@scope (.b-footer-simple)');
    expect(css).not.toContain('@scope (.b-cta-centered)');
  });

  it('skips disabled blocks and their CSS', () => {
    const project = createSampleProject();
    project.blocks.entities[blockIdOf(project, 'hero-centered')].disabled = true;
    const files = buildExportFiles(project, registry, runtime);
    expect(files['index.html']).not.toContain('b-hero-centered');
    expect(files['site.css']).not.toContain('@scope (.b-hero-centered)');
  });

  it('skips blocks that are listed on the page but missing from the project', () => {
    const project = createSampleProject();
    homePage(project).blockIds.push('lost-block');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const files = buildExportFiles(project, registry, runtime);
    expect(files['index.html']).toContain('b-footer-simple');
    expect(warn).toHaveBeenCalledWith(
      'Export skipped block lost-block: it is missing from the project',
    );
  });

  it('ships no site.js and no script tag when no behavior is used', () => {
    const project = createSampleProject();
    const page = homePage(project);
    page.blockIds = page.blockIds.filter((id) => id !== blockIdOf(project, 'nav-simple'));
    const files = buildExportFiles(project, registry, runtime);
    expect(files['site.js']).toBeUndefined();
    expect(files['index.html']).not.toContain('<script');
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
