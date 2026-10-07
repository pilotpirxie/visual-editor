import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { componentBlockOf, homePage } from '../test/fixtures';
import { parseProjectDocument, ProjectFormatError } from './validateProject';

function sample(): Project {
  return createSampleProject();
}

function asJson(project: Project): unknown {
  return JSON.parse(JSON.stringify(project));
}

function expectInvalid(value: unknown, message: string): void {
  expect(() => parseProjectDocument(value)).toThrow(ProjectFormatError);
  expect(() => parseProjectDocument(value)).toThrow(message);
}

describe('parseProjectDocument', () => {
  it('accepts a project and returns an equal copy', () => {
    const project = sample();
    const parsed = parseProjectDocument(asJson(project));
    expect(parsed).toEqual(project);
    expect(parsed).not.toBe(project);
  });

  it('keeps blocks whose component is unknown so they can show a missing card', () => {
    const project = sample();
    const block = componentBlockOf(project, homePage(project).blockIds[1] ?? '');
    block.componentId = 'retired-hero';
    expect(componentBlockOf(parseProjectDocument(asJson(project)), block.id).componentId).toBe(
      'retired-hero',
    );
  });

  it('drops unsafe overrides instead of failing', () => {
    const project = sample();
    const block = componentBlockOf(project, homePage(project).blockIds[1] ?? '');
    block.overrides['--color-text'] = 'red; } body { display: none';
    const parsed = parseProjectDocument(asJson(project));
    expect(componentBlockOf(parsed, block.id).overrides).toEqual({});
  });

  it('rejects other formats and versions', () => {
    expectInvalid('nope', 'project is missing');
    expectInvalid({ ...sample(), schemaVersion: 2 }, 'unsupported format');
  });

  it('names the part of the file that is wrong', () => {
    const missingHome = sample();
    missingHome.pages.homePageId = 'gone';
    expectInvalid(asJson(missingHome), 'pages.homePageId');

    const project = sample();
    homePage(project).blockIds.push('ghost');
    expectInvalid(asJson(project), 'points to a missing block ghost');

    const unsafeToken = sample();
    const primary = unsafeToken.designSystem.tokens['--color-primary'];
    if (primary !== undefined) primary.value = 'red; } * { display: none';
    expectInvalid(asJson(unsafeToken), 'designSystem.tokens.--color-primary.value');
  });

  it('rejects duplicate slugs and images that are not images', () => {
    const project = sample();
    const home = homePage(project);
    project.pages.ids.push('copy');
    project.pages.entities.copy = { ...home, id: 'copy', blockIds: [] };
    expectInvalid(asJson(project), 'pages.entities.copy.slug');

    const withAsset = sample();
    withAsset.assets.a1 = {
      id: 'a1',
      name: 'page.html',
      mimeType: 'text/html',
      dataUrl: 'data:text/html;base64,PHNjcmlwdD4=',
    };
    expectInvalid(asJson(withAsset), 'assets.a1.mimeType');
  });

  it('rejects settings that point to a missing image', () => {
    const project = sample();
    project.settings.faviconAssetId = 'missing';
    expectInvalid(asJson(project), 'settings.faviconAssetId');
  });
});
