import { describe, expect, it, vi } from 'vitest';
import { componentBlockOf, createTestStore, homePage, type TestStore } from '../test/fixtures';
import { pageOpened } from './editorSlice';
import { undo } from './history';
import {
  homePageSet,
  pageAdded,
  pageDuplicated,
  pageMetaSet,
  pageMoved,
  pageRemoved,
  pageRenamed,
  pageSeoSet,
  pageSlugSet,
  pageSocialImageSet,
  projectImageSet,
  settingSet,
  siteMetaSet,
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
      seo: { noindex: false },
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
    const { pages } = store.getState().project;
    const copy = pages.entities['home-copy'];
    expect(pageNames(store)).toEqual(['Home', 'Home copy', 'About']);
    expect(copy?.blockIds).toEqual(home.blockIds.map((id) => `copy-${id}`));
    const project = store.getState().project;
    const firstCopy = componentBlockOf(project, `copy-${home.blockIds[0]}`);
    const original = componentBlockOf(project, home.blockIds[0] ?? '');
    expect(firstCopy.values).toEqual(original.values);
    expect(firstCopy.values).not.toBe(original.values);
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
      noindex: false,
      description: 'Who we are',
    });
    store.dispatch(pageSeoSet('about', 'description', '  ', 'continuous'));
    expect(store.getState().project.pages.entities.about?.seo).toEqual({ noindex: false });
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

const SVG_UPLOAD = {
  name: 'icon.svg',
  mimeType: 'image/svg+xml',
  dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
};

describe('settingSet', () => {
  it('changes the site settings and merges typing into one undo step per setting', () => {
    const store = createTestStore();
    store.dispatch(settingSet('description', 'Customer research', 'continuous'));
    store.dispatch(settingSet('description', 'Customer research, tagged', 'continuous'));
    store.dispatch(settingSet('titleTemplate', '{{site.title}}: {{page.title}}', 'continuous'));
    const { settings } = store.getState().project;
    expect(settings.description).toBe('Customer research, tagged');
    expect(settings.titleTemplate).toBe('{{site.title}}: {{page.title}}');
    store.dispatch(undo());
    store.dispatch(undo());
    expect(store.getState().project.settings.description).toBe('');
  });

  it('trims the title and the language and stores the base URL until it is cleared', () => {
    const store = createTestStore();
    store.dispatch(settingSet('title', '  Acme  ', 'continuous'));
    store.dispatch(settingSet('language', 'pl', 'discrete'));
    store.dispatch(settingSet('baseUrl', 'https://acme.example', 'continuous'));
    expect(store.getState().project.settings).toMatchObject({
      title: 'Acme',
      language: 'pl',
      baseUrl: 'https://acme.example',
    });
    store.dispatch(settingSet('baseUrl', ' ', 'continuous'));
    expect(store.getState().project.settings).not.toHaveProperty('baseUrl');
  });

  it.each([
    ['an empty title', 'title' as const, '   '],
    ['a language that is not a language code', 'language' as const, 'Polish'],
    ['a base URL without https', 'baseUrl' as const, 'acme.example'],
    ['a javascript base URL', 'baseUrl' as const, 'javascript:alert(1)'],
  ])('ignores %s', (_name, key, value) => {
    const store = createTestStore();
    const before = store.getState().project.settings;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.dispatch(settingSet(key, value, 'continuous'));
    expect(store.getState().project.settings).toBe(before);
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('projectImageSet', () => {
  it('stores the favicon and the default social image as project assets', () => {
    const store = createTestStore();
    store.dispatch(projectImageSet('favicon', SVG_UPLOAD));
    store.dispatch(projectImageSet('socialImage', PNG_UPLOAD));
    const { settings, assets } = store.getState().project;
    expect(assets[settings.faviconAssetId ?? '']?.mimeType).toBe('image/svg+xml');
    expect(assets[settings.socialImageAssetId ?? '']?.mimeType).toBe('image/png');
  });

  it('drops the old image when it is replaced or removed, in one undo step each', () => {
    const store = createTestStore();
    store.dispatch(projectImageSet('favicon', PNG_UPLOAD));
    store.dispatch(projectImageSet('favicon', SVG_UPLOAD));
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
    store.dispatch(projectImageSet('favicon', null));
    expect(store.getState().project.assets).toEqual({});
    expect(store.getState().project.settings).not.toHaveProperty('faviconAssetId');
    store.dispatch(undo());
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
  });

  it('refuses a social image in a format only favicons may use', () => {
    const store = createTestStore();
    store.dispatch(projectImageSet('socialImage', SVG_UPLOAD));
    expect(store.getState().project.assets).toEqual({});
  });

  it('keeps a page social image when a project image is removed', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageSocialImageSet('about', PNG_UPLOAD));
    store.dispatch(projectImageSet('socialImage', PNG_UPLOAD));
    store.dispatch(projectImageSet('socialImage', null));
    expect(Object.keys(store.getState().project.assets)).toHaveLength(1);
  });
});

describe('site and page meta', () => {
  it('stores site meta, normalizes it and clears it when emptied, undoably', () => {
    const store = createTestStore();
    store.dispatch(siteMetaSet('twitterSite', 'fieldnote', 'discrete'));
    store.dispatch(siteMetaSet('themeColor', ' #ABCDEF ', 'discrete'));
    expect(store.getState().project.settings).toMatchObject({
      twitterSite: '@fieldnote',
      themeColor: '#ABCDEF',
    });
    store.dispatch(siteMetaSet('twitterSite', '', 'discrete'));
    expect(store.getState().project.settings).not.toHaveProperty('twitterSite');
    store.dispatch(undo());
    expect(store.getState().project.settings.twitterSite).toBe('@fieldnote');
  });

  it('ignores invalid site meta', () => {
    const store = createTestStore();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before = store.getState().project.settings;
    store.dispatch(siteMetaSet('contactEmail', 'not an email', 'discrete'));
    store.dispatch(siteMetaSet('sitemapPriority', 2, 'discrete'));
    expect(store.getState().project.settings).toBe(before);
  });

  it('drops an empty verification record', () => {
    const store = createTestStore();
    store.dispatch(siteMetaSet('verification', { google: 'abc' }, 'discrete'));
    store.dispatch(siteMetaSet('verification', { google: '' }, 'discrete'));
    expect(store.getState().project.settings).not.toHaveProperty('verification');
  });

  it('stores page overrides and removes them to inherit again', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageMetaSet('about', 'follow', false, 'discrete'));
    store.dispatch(pageMetaSet('about', 'canonicalUrl', 'https://acme.com/about', 'continuous'));
    expect(store.getState().project.pages.entities.about?.seo).toMatchObject({
      follow: false,
      canonicalUrl: 'https://acme.com/about',
    });
    store.dispatch(pageMetaSet('about', 'follow', undefined, 'discrete'));
    expect(store.getState().project.pages.entities.about?.seo).not.toHaveProperty('follow');
  });

  it('merges continuous typing in one page field into one undo step', () => {
    const store = createTestStore();
    addAbout(store);
    store.dispatch(pageMetaSet('about', 'keywords', 'a', 'continuous'));
    store.dispatch(pageMetaSet('about', 'keywords', 'ab', 'continuous'));
    store.dispatch(undo());
    expect(store.getState().project.pages.entities.about?.seo).not.toHaveProperty('keywords');
  });

  it('stores the app icon as a PNG asset only', () => {
    const store = createTestStore();
    store.dispatch(projectImageSet('appIcon', SVG_UPLOAD));
    expect(store.getState().project.assets).toEqual({});
    store.dispatch(projectImageSet('appIcon', PNG_UPLOAD));
    const { settings, assets } = store.getState().project;
    expect(assets[settings.appIconAssetId ?? '']?.mimeType).toBe('image/png');
  });
});
