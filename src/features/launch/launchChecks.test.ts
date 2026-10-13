import { describe, expect, it } from 'vitest';
import { createPage, createSampleProject } from '../../app/projectFactory';
import type { Project } from '../../app/types';
import { builtInComponents } from '../../components/registry';
import { addBlock, withSearchDetails } from '../../test/fixtures';
import { launchChecks } from './launchChecks';

function stateOf(project: Project, isPublished = false): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const check of launchChecks(project, builtInComponents, isPublished)) {
    state[check.id] = check.isDone;
  }
  return state;
}

function addPage(project: Project, name: string, slug: string): void {
  const page = createPage(`page-${slug}`, name, slug);
  project.pages.ids.push(page.id);
  project.pages.entities[page.id] = page;
}

describe('launchChecks', () => {
  it('lists what a new site still needs before it goes live', () => {
    const project = createSampleProject();
    project.settings.description = '';
    expect(stateOf(project)).toEqual({
      description: false,
      favicon: false,
      'social-image': false,
      'base-url': false,
      indexing: true,
      privacy: false,
      'not-found': false,
      problems: false,
      published: false,
    });
  });

  it('ticks items off as the site is filled in', () => {
    const project = withSearchDetails(createSampleProject());
    project.settings.baseUrl = 'https://example.com';
    addPage(project, 'Privacy policy', 'privacy-policy');
    addPage(project, 'Not found', '404');
    const state = stateOf(project, true);
    expect(state).toMatchObject({
      description: true,
      'social-image': true,
      'base-url': true,
      privacy: true,
      'not-found': true,
      published: true,
    });
  });

  it('asks about forms only when the site has one, until it can send', () => {
    const project = createSampleProject();
    expect(stateOf(project)).not.toHaveProperty('forms');
    addBlock(project, 'contact-form');
    expect(stateOf(project).forms).toBe(false);
    project.settings.formService = 'formspree';
    project.settings.formTarget = 'abcdwxyz';
    expect(stateOf(project).forms).toBe(true);
  });

  it('counts the open problems from the export check in its advice', () => {
    const project = withSearchDetails(createSampleProject());
    addBlock(project, 'contact-form');
    const problems = launchChecks(project, builtInComponents, false).find(
      (check) => check.id === 'problems',
    );
    expect(problems).toMatchObject({ isDone: false, fix: 'export' });
    expect(problems?.advice).toContain('Export lists 1 thing to fix');
  });
});
