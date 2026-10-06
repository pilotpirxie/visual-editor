import { describe, expect, it } from 'vitest';
import { createPage, createSampleProject } from '../../app/projectFactory';
import type { Project } from '../../app/types';
import { linksToPage } from './linkUsage';

function projectWithAbout(): { project: Project; homeId: string } {
  const project = createSampleProject();
  const about = createPage('about', 'About', 'about');
  project.pages.ids.push(about.id);
  project.pages.entities[about.id] = about;
  return { project, homeId: project.pages.homePageId };
}

function blockOf(project: Project, componentId: string) {
  for (const block of Object.values(project.blocks.entities)) {
    if (block.componentId === componentId) return block;
  }
  throw new Error(`No ${componentId} block`);
}

describe('linksToPage', () => {
  it('finds button and list item links that point to the page', () => {
    const { project } = projectWithAbout();
    const hero = blockOf(project, 'hero-centered');
    hero.values.primaryButton = {
      label: 'About us',
      link: { type: 'page', pageId: 'about', newTab: false },
      variant: 'primary',
    };
    const footer = blockOf(project, 'footer-simple');
    footer.values.links = [
      { label: 'Team', link: { type: 'section', pageId: 'about', anchor: 'team', newTab: false } },
    ];
    expect(linksToPage(project, 'about')).toEqual([
      {
        blockId: hero.id,
        place: 'Home',
        blockName: 'Hero, centered text',
        fieldLabel: 'Primary button',
      },
      {
        blockId: footer.id,
        place: 'Home',
        blockName: 'Footer, simple',
        fieldLabel: 'Links: Team (Link)',
      },
    ]);
  });

  it('reports shared blocks by their slot', () => {
    const { project, homeId } = projectWithAbout();
    const nav = blockOf(project, 'nav-simple');
    project.pages.entities[homeId].blockIds = project.pages.entities[homeId].blockIds.filter(
      (id) => id !== nav.id,
    );
    project.sharedSlots.header = [nav.id];
    nav.values.cta = {
      label: 'About',
      link: { type: 'page', pageId: 'about', newTab: false },
      variant: 'primary',
    };
    expect(linksToPage(project, 'about')).toEqual([
      {
        blockId: nav.id,
        place: 'Shared header',
        blockName: 'Navigation, logo left',
        fieldLabel: 'Button',
      },
    ]);
  });

  it('ignores links on the page that is being deleted', () => {
    const { project, homeId } = projectWithAbout();
    const hero = blockOf(project, 'hero-centered');
    hero.values.primaryButton = {
      label: 'Home',
      link: { type: 'page', pageId: homeId, newTab: false },
      variant: 'primary',
    };
    expect(linksToPage(project, homeId)).toEqual([]);
  });
});
