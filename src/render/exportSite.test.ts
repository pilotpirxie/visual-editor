import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/sampleProject';
import type { Project } from '../app/types';
import { registry } from '../components/registry';
import { buildExportFiles, buildSiteJs } from './exportSite';

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
