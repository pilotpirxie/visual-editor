import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import type { Project } from '../../app/types';
import { registry } from '../../components/registry';
import { placeholderImage } from '../../render/placeholder';
import { componentBlockOf, homePage } from '../../test/fixtures';
import { collectExportWarnings } from './exportWarnings';

function warningTexts(project: Project): string[] {
  const texts: string[] = [];
  for (const warning of collectExportWarnings(project, registry)) texts.push(warning.text);
  return texts;
}

function blockOf(project: Project, index: number) {
  return componentBlockOf(project, homePage(project).blockIds[index] ?? '');
}

describe('collectExportWarnings', () => {
  it('finds nothing to warn about on the sample page', () => {
    expect(warningTexts(createSampleProject())).toEqual([]);
  });

  it('warns about images without alt text, but not decorative ones', () => {
    const project = createSampleProject();
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
    const project = createSampleProject();
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
    const project = createSampleProject();
    const hero = blockOf(project, 1);
    hero.values.title = '';
    hero.disabled = true;
    expect(warningTexts(project)).toEqual([]);
  });
});
