import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { blockInserted, textReplaced } from '../../app/projectSlice';
import type { Project } from '../../app/types';
import { isImageValue } from '../../components/fields';
import { componentBlockOf, createTestStore, homePage } from '../../test/fixtures';
import {
  buildPattern,
  findMatches,
  planReplacement,
  replacementCount,
  type FindMatch,
} from './textSearch';

const ANY_CASE = { isCaseSensitive: false, isWholeWord: false };

function blockIdOf(project: Project, componentId: string): string {
  for (const blockId of homePage(project).blockIds) {
    if (componentBlockOf(project, blockId).componentId === componentId) return blockId;
  }
  throw new Error(`The sample page has no ${componentId} block`);
}

function sampleWithAcme(): Project {
  const project = createSampleProject();
  const heroId = blockIdOf(project, 'hero-centered');
  const featuresId = blockIdOf(project, 'features-grid-3');
  const hero = componentBlockOf(project, heroId);
  hero.values.title = 'Acme makes acme tools';
  hero.values.primaryButton = {
    label: 'Try Acme',
    link: { type: 'url', url: 'https://acme.test', newTab: false },
    variant: 'primary',
  };
  const features = componentBlockOf(project, featuresId);
  features.values.intro = '<p>Built by <strong>Acme</strong> &amp; friends.</p>';
  features.values.items = [
    { icon: 'zap', title: 'Acme speed', text: 'Fast.' },
    { icon: 'shield', title: 'Secure', text: 'Acmes everywhere.' },
  ];
  homePage(project).seo.description = 'Acme for everyone';
  project.settings.title = 'Acme';
  return project;
}

describe('buildPattern', () => {
  it('escapes the query so it is matched literally', () => {
    expect(buildPattern('a.b', ANY_CASE)?.test('axb')).toBe(false);
    expect(buildPattern('a.b', ANY_CASE)?.test('a.b')).toBe(true);
  });

  it('returns null for an empty query', () => {
    expect(buildPattern('  ', ANY_CASE)).toBeNull();
  });

  it('matches whole words only when asked, also next to accented letters', () => {
    const pattern = buildPattern('acme', { isCaseSensitive: false, isWholeWord: true });
    expect('Acmes acme éacme'.match(pattern ?? /$^/)).toEqual(['acme']);
  });
});

describe('findMatches', () => {
  it('finds text in fields, nested list items, rich text, buttons, links, SEO and settings', () => {
    const matches = findMatches(sampleWithAcme(), 'acme', ANY_CASE);
    const labels = matches.map((match) => match.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Title',
        'Primary button',
        'Primary button link',
        'Intro',
        'Meta description',
        'Site title',
      ]),
    );
    const heroTitle = matches.find(
      (match) => match.location.kind === 'block' && match.location.path === 'title',
    );
    expect(heroTitle?.count).toBe(2);
    const listItem = matches.find(
      (match) => match.location.kind === 'block' && match.location.path === 'items.1.text',
    );
    expect(listItem?.preview).toEqual({ before: '', match: 'Acme', after: 's everywhere.' });
  });

  it('respects case and whole-word options', () => {
    const project = sampleWithAcme();
    const caseSensitive = findMatches(project, 'acme', {
      isCaseSensitive: true,
      isWholeWord: false,
    });
    expect(replacementCount(caseSensitive)).toBe(2);
    const wholeWords = findMatches(project, 'acme', { isCaseSensitive: false, isWholeWord: true });
    expect(wholeWords.some((match) => match.preview.after.startsWith('s everywhere'))).toBe(false);
  });
});

describe('planReplacement', () => {
  it('replaces selected matches in one undo step without touching rich text markup', () => {
    const project = sampleWithAcme();
    const store = createTestStore(project);
    const matches = findMatches(project, 'acme', ANY_CASE);
    const edits = planReplacement(project, matches, 'acme', 'Fieldnote', ANY_CASE);
    store.dispatch(textReplaced(edits));
    const state = store.getState();
    const hero = componentBlockOf(state.project, blockIdOf(project, 'hero-centered'));
    const features = componentBlockOf(state.project, blockIdOf(project, 'features-grid-3'));
    expect(hero.values.title).toBe('Fieldnote makes Fieldnote tools');
    expect(hero.values.primaryButton).toMatchObject({
      label: 'Try Fieldnote',
      link: { url: 'https://Fieldnote.test' },
    });
    expect(features.values.intro).toBe('<p>Built by <strong>Fieldnote</strong> &amp; friends.</p>');
    expect(homePage(state.project).seo.description).toBe('Fieldnote for everyone');
    expect(state.project.settings.title).toBe('Fieldnote');
    expect(state.history.past).toHaveLength(1);
    expect(findMatches(state.project, 'acme', ANY_CASE)).toEqual([]);
  });

  it('leaves unselected matches alone', () => {
    const project = sampleWithAcme();
    const store = createTestStore(project);
    const matches = findMatches(project, 'acme', ANY_CASE);
    const onlySettings = matches.filter((match) => match.location.kind === 'setting');
    store.dispatch(textReplaced(planReplacement(project, onlySettings, 'acme', 'Z', ANY_CASE)));
    const hero = componentBlockOf(store.getState().project, blockIdOf(project, 'hero-centered'));
    expect(store.getState().project.settings.title).toBe('Z');
    expect(hero.values.title).toBe('Acme makes acme tools');
  });

  it('never empties the required site title', () => {
    const project = sampleWithAcme();
    const store = createTestStore(project);
    const matches = findMatches(project, 'acme', ANY_CASE);
    store.dispatch(textReplaced(planReplacement(project, matches, 'acme', '', ANY_CASE)));
    expect(store.getState().project.settings.title).toBe('Acme');
  });

  function blockMatches(project: Project, path: string, part: string): FindMatch[] {
    const matches: FindMatch[] = [];
    for (const match of findMatches(project, 'acme', ANY_CASE)) {
      const { location } = match;
      if (location.kind !== 'block') continue;
      if (location.path === path && location.part === part) matches.push(match);
    }
    return matches;
  }

  function afterReplacing(project: Project, matches: FindMatch[]): Project {
    const store = createTestStore(project);
    store.dispatch(textReplaced(planReplacement(project, matches, 'acme', 'Zed', ANY_CASE)));
    return store.getState().project;
  }

  it('replaces only the label or only the address of a button', () => {
    const project = sampleWithAcme();
    const heroId = blockIdOf(project, 'hero-centered');
    const labelOnly = afterReplacing(project, blockMatches(project, 'primaryButton', 'label'));
    expect(componentBlockOf(labelOnly, heroId).values.primaryButton).toMatchObject({
      label: 'Try Zed',
      link: { url: 'https://acme.test' },
    });
    const urlOnly = afterReplacing(project, blockMatches(project, 'primaryButton', 'url'));
    expect(componentBlockOf(urlOnly, heroId).values.primaryButton).toMatchObject({
      label: 'Try Acme',
      link: { type: 'url', url: 'https://Zed.test', newTab: false },
      variant: 'primary',
    });
  });

  it('replaces inside one list item and keeps the other items and their fields', () => {
    const project = sampleWithAcme();
    const featuresId = blockIdOf(project, 'features-grid-3');
    const replaced = afterReplacing(project, blockMatches(project, 'items.1.text', 'text'));
    expect(componentBlockOf(replaced, featuresId).values.items).toEqual([
      { icon: 'zap', title: 'Acme speed', text: 'Fast.' },
      { icon: 'shield', title: 'Secure', text: 'Zeds everywhere.' },
    ]);
  });

  it('replaces the address of a link in a list, and leaves links to pages alone', () => {
    const project = sampleWithAcme();
    const navId = blockIdOf(project, 'nav-simple');
    const pageLink = { type: 'page', pageId: homePage(project).id, newTab: false };
    componentBlockOf(project, navId).values.links = [
      { label: 'Docs', link: { type: 'url', url: 'https://docs.acme.test', newTab: true } },
      { label: 'Home', link: pageLink },
    ];
    const replaced = afterReplacing(project, blockMatches(project, 'links.0.link', 'url'));
    expect(componentBlockOf(replaced, navId).values.links).toEqual([
      { label: 'Docs', link: { type: 'url', url: 'https://docs.Zed.test', newTab: true } },
      { label: 'Home', link: pageLink },
    ]);
  });

  it('replaces the alt text of an image and keeps the image', () => {
    const store = createTestStore(sampleWithAcme());
    const homeId = homePage(store.getState().project).id;
    store.dispatch(blockInserted(homeId, 0, 'hero-image'));
    const project = structuredClone(store.getState().project);
    const imageHeroId = homePage(project).blockIds[0];
    const imageHero = componentBlockOf(project, imageHeroId);
    const placeholder = imageHero.values.image;
    if (!isImageValue(placeholder)) throw new Error('The image hero has no image');
    const image = { ...placeholder, alt: 'The Acme office', decorative: false };
    imageHero.values.image = image;
    const replaced = afterReplacing(project, blockMatches(project, 'image', 'alt'));
    expect(componentBlockOf(replaced, imageHeroId).values.image).toEqual({
      ...image,
      alt: 'The Zed office',
    });
  });

  it('plans no edit for a block whose matches are not selected', () => {
    const project = sampleWithAcme();
    const heroId = blockIdOf(project, 'hero-centered');
    const edits = planReplacement(
      project,
      blockMatches(project, 'items.1.text', 'text'),
      'acme',
      'Zed',
      ANY_CASE,
    );
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ kind: 'block-value', name: 'items' });
    expect(edits.some((edit) => edit.kind === 'block-value' && edit.blockId === heroId)).toBe(
      false,
    );
  });

  it('plans nothing without matches or without a query', () => {
    const project = sampleWithAcme();
    expect(planReplacement(project, [], 'acme', 'Zed', ANY_CASE)).toEqual([]);
    const matches = findMatches(project, 'acme', ANY_CASE);
    expect(planReplacement(project, matches, '  ', 'Zed', ANY_CASE)).toEqual([]);
  });
});
