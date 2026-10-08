import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import type { Project } from '../../app/types';
import { builtInComponents } from '../../components/registry';
import { placeholderImage } from '../../render/placeholder';
import { componentBlockOf, homePage, withSearchDetails } from '../../test/fixtures';
import { createPage } from '../../app/projectFactory';
import { collectExportWarnings, searchEngineWarnings } from './exportWarnings';

function sampleProject(): Project {
  return withSearchDetails(createSampleProject());
}

function warningTexts(project: Project): string[] {
  const texts: string[] = [];
  for (const warning of collectExportWarnings(project, builtInComponents)) texts.push(warning.text);
  return texts;
}

function blockOf(project: Project, index: number) {
  return componentBlockOf(project, homePage(project).blockIds[index] ?? '');
}

describe('collectExportWarnings', () => {
  it('finds nothing to warn about on the sample page', () => {
    expect(warningTexts(sampleProject())).toEqual([]);
  });

  it('warns when design system colors are too close to read', () => {
    const project = sampleProject();
    const muted = project.designSystem.tokens['--color-text-muted'];
    if (muted === undefined) throw new Error('No muted text token');
    muted.value = '#eeeeee';
    expect(warningTexts(project)).toContainEqual(
      expect.stringMatching(
        /^Muted text on Background has a contrast of 1\.\d:1\. Aim for at least 4\.5:1\.$/,
      ),
    );
  });

  it('warns about a custom block background that makes its text hard to read', () => {
    const project = sampleProject();
    const hero = blockOf(project, 1);
    hero.overrides = { '--color-background': '#111111' };
    expect(warningTexts(project)).toContainEqual(
      expect.stringContaining('text on its custom background has a contrast of'),
    );
    hero.overrides = { '--color-background': '#111111', '--color-text': '#ffffff' };
    expect(warningTexts(project)).toEqual([]);
  });

  it('keeps the anchor id main for the page content', () => {
    const project = sampleProject();
    blockOf(project, 1).anchor = 'main';
    expect(warningTexts(project)).toEqual([
      'The anchor id “main” is kept for the page’s main content. Pick another one.',
    ]);
  });

  it('warns about images without alt text, but not decorative ones', () => {
    const project = sampleProject();
    const hero = blockOf(project, 1);
    hero.componentId = 'content-text-image';
    hero.values.image = placeholderImage({ ratio: '3:2', subject: 'photo' }, '');
    expect(warningTexts(project)).toEqual([
      'Content, text and image: an image in “Image” has no alt text.',
    ]);
    hero.values.image = placeholderImage({ ratio: '3:2', subject: 'photo' }, '', true);
    expect(warningTexts(project)).toEqual([]);
  });

  it('warns about links to deleted pages, empty required fields and repeated anchors', () => {
    const project = sampleProject();
    const hero = blockOf(project, 1);
    hero.values.title = '';
    hero.values.primaryButton = {
      label: 'About',
      link: { type: 'page', pageId: 'deleted', newTab: false },
      variant: 'primary',
    };
    hero.anchor = 'top';
    blockOf(project, 2).anchor = 'top';
    expect(warningTexts(project)).toEqual([
      'Hero, centered text: “Title” is required but empty.',
      'Hero, centered text: “Primary button” links to a page that was deleted.',
      'The anchor id “top” is used twice.',
    ]);
  });

  it('skips disabled blocks', () => {
    const project = sampleProject();
    const hero = blockOf(project, 1);
    hero.values.title = '';
    hero.disabled = true;
    expect(warningTexts(project)).toEqual([]);
  });
});

describe('modal warnings', () => {
  it('warns about a modal with no anchor, because no link can open it', () => {
    const project = sampleProject();
    const modal = blockOf(project, 2);
    modal.componentId = 'modal-simple';
    modal.values = { title: 'Hello', closeLabel: 'Close', showButton: false };
    expect(warningTexts(project)).toEqual([
      'Modal, simple dialog: nothing can open this modal. Give it an anchor id in the Advanced tab.',
    ]);
    modal.anchor = 'modal';
    expect(warningTexts(project)).toEqual([]);
  });
});

describe('searchEngineWarnings', () => {
  it('lists the indexed pages that have no description or social image', () => {
    const project = createSampleProject();
    const about = createPage('about', 'About', 'about');
    about.seo.description = 'Who we are';
    const thanks = createPage('thanks', 'Thanks', 'thanks');
    thanks.seo.noindex = true;
    for (const page of [about, thanks]) {
      project.pages.ids.push(page.id);
      project.pages.entities[page.id] = page;
    }
    expect(searchEngineWarnings(project)).toEqual([
      {
        pageId: null,
        blockId: null,
        text: 'No meta description on Home. Add one in Project settings or in each page’s settings.',
      },
      {
        pageId: null,
        blockId: null,
        text: 'No social image on Home and About. Add a default one in Project settings or one per page.',
      },
    ]);
  });

  it('checks nothing when search engines may not index the site', () => {
    const project = createSampleProject();
    project.settings.indexable = false;
    expect(searchEngineWarnings(project)).toEqual([]);
  });

  it('is satisfied by the project description and default social image', () => {
    expect(searchEngineWarnings(sampleProject())).toEqual([]);
  });
});
