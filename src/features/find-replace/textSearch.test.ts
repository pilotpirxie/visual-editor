import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { textReplaced } from '../../app/projectSlice';
import type { Project } from '../../app/types';
import { componentBlockOf, createTestStore, homePage } from '../../test/fixtures';
import { buildPattern, findMatches, planReplacement, replacementCount } from './textSearch';

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
});
