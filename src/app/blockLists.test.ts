import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import {
  findBlockList,
  isBlockShown,
  sharedSlotOf,
  slotForCategory,
  visibleBlockLists,
} from './blockLists';
import type { Project } from './types';

function projectWithSharedNav(): { project: Project; navId: string; heroId: string } {
  const sample = createSampleProject();
  const home = sample.pages.entities[sample.pages.homePageId];
  const [navId, heroId, ...rest] = home.blockIds;
  const project: Project = {
    ...sample,
    pages: {
      ...sample.pages,
      entities: { [home.id]: { ...home, blockIds: [heroId, ...rest] } },
    },
    sharedSlots: { header: [navId], footer: [] },
  };
  return { project, navId, heroId };
}

describe('sharedSlotOf', () => {
  it('names the slot a shared block lives in', () => {
    const { project, navId } = projectWithSharedNav();
    expect(sharedSlotOf(project, navId)).toBe('header');
  });

  it('returns null for a page block', () => {
    const { project, heroId } = projectWithSharedNav();
    expect(sharedSlotOf(project, heroId)).toBeNull();
  });
});

describe('findBlockList', () => {
  it('finds the shared slot that holds a block', () => {
    const { project, navId } = projectWithSharedNav();
    expect(findBlockList(project, navId)).toBe(project.sharedSlots.header);
  });

  it('finds the page that holds a block', () => {
    const { project, heroId } = projectWithSharedNav();
    const home = project.pages.entities[project.pages.homePageId];
    expect(findBlockList(project, heroId)).toBe(home.blockIds);
  });

  it('returns null for a block that is in no list', () => {
    const { project } = projectWithSharedNav();
    expect(findBlockList(project, 'missing')).toBeNull();
  });
});

describe('visibleBlockLists', () => {
  it('returns the shared slots and the page blocks the page shows', () => {
    const { project, navId } = projectWithSharedNav();
    const home = project.pages.entities[project.pages.homePageId];
    const lists = visibleBlockLists(project, home);
    expect(lists.header).toEqual([navId]);
    expect(lists.page).toBe(home.blockIds);
    expect(lists.footer).toEqual([]);
  });

  it('leaves out a shared slot the page hides', () => {
    const { project } = projectWithSharedNav();
    const home = project.pages.entities[project.pages.homePageId];
    expect(visibleBlockLists(project, { ...home, showSharedHeader: false }).header).toEqual([]);
  });
});

describe('isBlockShown', () => {
  it('is true for page blocks and for shared blocks the page shows', () => {
    const { project, navId, heroId } = projectWithSharedNav();
    const home = project.pages.entities[project.pages.homePageId];
    expect(isBlockShown(project, home, heroId)).toBe(true);
    expect(isBlockShown(project, home, navId)).toBe(true);
  });

  it('is false for shared blocks the page hides and for unknown blocks', () => {
    const { project, navId } = projectWithSharedNav();
    const home = project.pages.entities[project.pages.homePageId];
    expect(isBlockShown(project, { ...home, showSharedHeader: false }, navId)).toBe(false);
    expect(isBlockShown(project, home, 'missing')).toBe(false);
  });
});

describe('slotForCategory', () => {
  it.each([
    ['navigations', 'header'],
    ['banners', 'header'],
    ['footers', 'footer'],
    ['cookies', 'footer'],
    ['modals', 'footer'],
    ['headers', null],
    ['features', null],
  ] as const)('puts %s blocks in %s', (category, slot) => {
    expect(slotForCategory(category)).toBe(slot);
  });
});
