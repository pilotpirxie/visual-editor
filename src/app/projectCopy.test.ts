import { describe, expect, it } from 'vitest';
import { componentBlockOf, homePage } from '../test/fixtures';
import { createSampleProject } from './projectFactory';
import { copyProjectWithNewIds } from './projectCopy';
import type { Project } from './types';

function allIds(project: Project): string[] {
  return [project.id, ...project.pages.ids, ...project.blocks.ids, ...Object.keys(project.assets)];
}

function withLinkedAbout(): Project {
  const project = createSampleProject();
  const home = homePage(project);
  project.pages.ids.push('about');
  project.pages.entities.about = {
    ...home,
    id: 'about',
    name: 'About',
    slug: 'about',
    blockIds: [],
  };
  const hero = componentBlockOf(project, home.blockIds[1] ?? '');
  hero.values.primaryButton = {
    label: 'About',
    link: { type: 'page', pageId: 'about', newTab: false },
    variant: 'primary',
  };
  project.sharedSlots.footer = [home.blockIds[3]];
  home.blockIds.pop();
  project.assets.a1 = {
    id: 'a1',
    name: 'icon.png',
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,aGk=',
  };
  project.settings.faviconAssetId = 'a1';
  project.settings.appIconAssetId = 'a1';
  return project;
}

describe('copyProjectWithNewIds', () => {
  it('shares no ids with the original and takes the new title', () => {
    const source = withLinkedAbout();
    const copy = copyProjectWithNewIds(source, 'My copy');
    const sourceIds = new Set(allIds(source));
    for (const id of allIds(copy)) expect(sourceIds.has(id)).toBe(false);
    expect(copy.settings.title).toBe('My copy');
  });

  it('keeps internal links, shared slots and image references pointing inside the copy', () => {
    const copy = copyProjectWithNewIds(withLinkedAbout(), 'My copy');
    const about = copy.pages.ids.find((id) => copy.pages.entities[id]?.slug === 'about');
    const hero = componentBlockOf(copy, homePage(copy).blockIds[1] ?? '');
    expect(hero.values.primaryButton).toMatchObject({ link: { type: 'page', pageId: about } });
    expect(componentBlockOf(copy, copy.sharedSlots.footer[0] ?? '').componentId).toBe(
      'footer-simple',
    );
    expect(copy.assets[copy.settings.faviconAssetId ?? '']?.name).toBe('icon.png');
    expect(copy.assets[copy.settings.appIconAssetId ?? '']?.name).toBe('icon.png');
  });

  it('leaves the original project untouched', () => {
    const source = withLinkedAbout();
    const before = structuredClone(source);
    copyProjectWithNewIds(source, 'My copy');
    expect(source).toEqual(before);
  });
});
