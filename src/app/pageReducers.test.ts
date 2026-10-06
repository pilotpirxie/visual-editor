import { describe, expect, it } from 'vitest';
import { createTestStore, homePage, type TestStore } from '../test/fixtures';
import { pageOpened } from './editorSlice';
import { undo } from './history';
import {
  homePageSet,
  pageAdded,
  pageDuplicated,
  pageMoved,
  pageRemoved,
  pageRenamed,
  pageSeoSet,
  pageSlugSet,
  pageSocialImageSet,
} from './projectSlice';

function pageNames(store: TestStore): string[] {
  const { ids, entities } = store.getState().project.pages;
  return ids.map((id) => entities[id]?.name ?? '');
}

function addAbout(store: TestStore, id = 'about'): void {
  store.dispatch(pageAdded({ id, name: 'About', slug: 'about' }));
}

describe('pageAdded', () => {
  it('adds a blank page at the end with default settings', () => {
    const store = createTestStore();
    store.dispatch(pageAdded({ id: 'about', name: '  About  ', slug: 'about' }));
    const about = store.getState().project.pages.entities.about;
    expect(pageNames(store)).toEqual(['Home', 'About']);
    expect(about).toEqual({
      id: 'about',
      name: 'About',
      slug: 'about',
      blockIds: [],
      seo: {},
      showSharedHeader: true,
      showSharedFooter: true,
    });
  });

  it.each([
    ['an empty name', { id: 'p', name: ' ', slug: 'p' }],
    ['a slug another page uses', { id: 'p', name: 'Home again', slug: 'home' }],
    ['an invalid slug', { id: 'p', name: 'About', slug: 'About Us' }],
  ])('ignores a page with %s', (_name, page) => {
    const store = createTestStore();
    store.dispatch(pageAdded(page));
    expect(pageNames(store)).toEqual(['Home']);
  });

  it('is one undo step', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(undo());
    expect(pageNames(store)).toEqual(['Home']);
  });
});

describe('pageDuplicated', () => {
  it('copies the page and its blocks with new ids, right after the source', () => {
    const store = createTestStore();
    addAbout(store);
    const home = homePage(store.getState().project);
    const blockIds: Record<string, string> = {};
    for (const blockId of home.blockIds) blockIds[blockId] = `copy-${blockId}`;
    store.dispatch(
      pageDuplicated({
        sourcePageId: home.id,
        page: { id: 'home-copy', name: 'Home copy', slug: 'home-copy' },
        blockIds,
      }),
    );
    const { pages, blocks } = store.getState().project;
    const copy = pages.entities['home-copy'];
    expect(pageNames(store)).toEqual(['Home', 'Home copy', 'About']);
    expect(copy?.blockIds).toEqual(home.blockIds.map((id) => `copy-${id}`));
    const firstCopy = blocks.entities[`copy-${home.blockIds[0]}`];
    expect(firstCopy?.values).toEqual(blocks.entities[home.blockIds[0]]?.values);
    expect(firstCopy?.values).not.toBe(blocks.entities[home.blockIds[0]]?.values);
  });
});

describe('pageRenamed', () => {
  it('changes the name and slug', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageRenamed({ pageId: 'about', name: 'Company', slug: 'company' }));
    expect(store.getState().project.pages.entities.about).toMatchObject({
      name: 'Company',
      slug: 'company',
    });
  });

  it('keeps its own slug valid and refuses a slug another page uses', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageRenamed({ pageId: 'about', name: 'About us', slug: 'about' }));
    store.dispatch(pageRenamed({ pageId: 'about', name: 'Home', slug: 'home' }));
    expect(store.getState().project.pages.entities.about).toMatchObject({
      name: 'About us',
      slug: 'about',
    });
  });
});

describe('pageMoved', () => {
  it('reorders the pages and clamps the target index', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageAdded({ id: 'team', name: 'Team', slug: 'team' }));
    store.dispatch(pageMoved({ pageId: 'team', toIndex: -5 }));
    expect(pageNames(store)).toEqual(['Team', 'Home', 'About']);
  });
});

describe('pageRemoved', () => {
  it('removes the page and its blocks', () => {
    const store = createTestStore();
    addAbout(store);
    const blockId = homePage(store.getState().project).blockIds[0];
    store.dispatch(homePageSet({ pageId: 'about' }));
    store.dispatch(pageRemoved({ pageId: store.getState().project.pages.ids[0] }));
    expect(pageNames(store)).toEqual(['About']);
    expect(store.getState().project.blocks.entities[blockId]).toBeUndefined();
  });

  it('never removes the home page or the last page', () => {
    const store = createTestStore();
    const homeId = store.getState().project.pages.homePageId;
    store.dispatch(pageRemoved({ pageId: homeId }));
    addAbout(store);
    store.dispatch(pageRemoved({ pageId: homeId }));
    expect(pageNames(store)).toEqual(['Home', 'About']);
  });

  it('shows the home page when the open page is removed', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageOpened({ pageId: 'about', fromPageId: 'x' }));
    store.dispatch(pageRemoved({ pageId: 'about' }));
    expect(store.getState().editor.currentPageId).toBeNull();
  });
});

describe('homePageSet', () => {
  it('makes another page the home page and ignores unknown pages', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(homePageSet({ pageId: 'about' }));
    store.dispatch(homePageSet({ pageId: 'missing' }));
    expect(store.getState().project.pages.homePageId).toBe('about');
  });
});

const PNG_UPLOAD = {
  name: 'Social card.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
};

describe('pageSlugSet', () => {
  it('changes the slug while typing and merges the edits', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSlugSet('about', 'company', 'continuous'));
    expect(store.getState().project.pages.entities.about?.slug).toBe('company');
    expect(pageSlugSet('about', 'x', 'continuous').meta.mergeKey).toBe('slug:about');
  });

  it('ignores a slug that is invalid or taken', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSlugSet('about', 'home', 'continuous'));
    store.dispatch(pageSlugSet('about', 'About', 'continuous'));
    expect(store.getState().project.pages.entities.about?.slug).toBe('about');
  });
});

describe('pageSeoSet', () => {
  it('stores SEO text and removes it when cleared so the default applies', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSeoSet('about', 'description', 'Who we are', 'continuous'));
    expect(store.getState().project.pages.entities.about?.seo).toEqual({
      description: 'Who we are',
    });
    store.dispatch(pageSeoSet('about', 'description', '  ', 'continuous'));
    expect(store.getState().project.pages.entities.about?.seo).toEqual({});
  });
});

describe('pageSocialImageSet', () => {
  it('stores the uploaded image as a project asset linked from the page', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSocialImageSet('about', PNG_UPLOAD));
    const { pages, assets } = store.getState().project;
    const assetId = pages.entities.about?.seo.socialImageAssetId ?? '';
    expect(assets[assetId]).toEqual({ ...PNG_UPLOAD, id: assetId });
  });

  it('drops the old image when it is replaced or removed, in one undo step each', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSocialImageSet('about', PNG_UPLOAD));
    store.dispatch(pageSocialImageSet('about', PNG_UPLOAD));
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
    store.dispatch(pageSocialImageSet('about', null));
    expect(store.getState().project.assets).toEqual({});
    store.dispatch(undo());
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
  });

  it('keeps an image another page still uses', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSocialImageSet('about', PNG_UPLOAD));
    store.dispatch(
      pageDuplicated({
        sourcePageId: 'about',
        page: { id: 'about-copy', name: 'About copy', slug: 'about-copy' },
        blockIds: {},
      }),
    );
    store.dispatch(pageSocialImageSet('about', null));
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
    store.dispatch(pageRemoved({ pageId: 'about-copy' }));
    expect(store.getState().project.assets).toEqual({});
  });

  it('refuses files that are not images in a supported format', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(
      pageSocialImageSet('about', {
        ...PNG_UPLOAD,
        mimeType: 'image/svg+xml',
        dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      }),
    );
    store.dispatch(
      pageSocialImageSet('about', { ...PNG_UPLOAD, dataUrl: 'https://example.com/a.png' }),
    );
    expect(store.getState().project.assets).toEqual({});
  });
});
