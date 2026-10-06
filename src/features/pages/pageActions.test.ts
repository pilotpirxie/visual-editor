import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageAdded } from '../../app/projectSlice';
import { createTestStore, homePage, type TestStore } from '../../test/fixtures';
import { addPage, duplicatePage, openPage, projectSlugs } from './pageActions';

vi.mock('../../app/router', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../app/router')>();
  return { ...original, navigate: vi.fn() };
});

const { navigate } = await import('../../app/router');

function pageNames(store: TestStore): string[] {
  const { ids, entities } = store.getState().project.pages;
  return ids.map((id) => entities[id]?.name ?? '');
}

beforeEach(() => {
  vi.mocked(navigate).mockClear();
});

describe('projectSlugs', () => {
  it('lists the slug of every page', () => {
    const store = createTestStore();
    store.dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' }));
    expect(projectSlugs(store.getState())).toEqual(['home', 'about']);
  });
});

describe('openPage', () => {
  it('moves the address to the page and remembers the section to scroll to', () => {
    const store = createTestStore();
    store.dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' }));
    store.dispatch(openPage('about', 'team'));
    const projectId = store.getState().project.id;
    expect(navigate).toHaveBeenCalledWith(`/p/${projectId}/about`);
    expect(store.getState().editor.pendingAnchor).toBe('team');
  });

  it('does nothing for the open page or an unknown page', () => {
    const store = createTestStore();
    store.dispatch(openPage(store.getState().project.pages.homePageId));
    store.dispatch(openPage('missing'));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('addPage', () => {
  it('adds a blank page and opens it', () => {
    const store = createTestStore();
    const id = store.dispatch(addPage({ name: 'Pricing', slug: 'pricing', sourcePageId: null }));
    expect(pageNames(store)).toEqual(['Home', 'Pricing']);
    expect(store.getState().project.pages.entities[id ?? '']?.blockIds).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(`/p/${store.getState().project.id}/${id}`);
  });

  it('adds a copy of another page', () => {
    const store = createTestStore();
    const home = homePage(store.getState().project);
    const id = store.dispatch(addPage({ name: 'Landing', slug: 'landing', sourcePageId: home.id }));
    const copy = store.getState().project.pages.entities[id ?? ''];
    expect(copy?.blockIds).toHaveLength(home.blockIds.length);
    expect(copy?.blockIds).not.toEqual(home.blockIds);
  });

  it('returns null and opens nothing when the page is not valid', () => {
    const store = createTestStore();
    expect(store.dispatch(addPage({ name: 'Home', slug: 'home', sourcePageId: null }))).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('duplicatePage', () => {
  it('names the copy after the page with a free slug', () => {
    const store = createTestStore();
    const homeId = store.getState().project.pages.homePageId;
    store.dispatch(duplicatePage(homeId));
    store.dispatch(duplicatePage(homeId));
    const { ids, entities } = store.getState().project.pages;
    expect(ids.map((id) => entities[id]?.slug)).toEqual(['home', 'home-copy-2', 'home-copy']);
    expect(pageNames(store)).toEqual(['Home', 'Home copy', 'Home copy']);
  });
});
