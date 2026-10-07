import { describe, expect, it } from 'vitest';
import { blockSelected, previewToggled } from './editorSlice';
import { createSampleProject } from './projectFactory';
import {
  blockInserted,
  blockValueSet,
  pageAdded,
  pageSlugSet,
  projectLoaded,
  settingSet,
} from './projectSlice';
import { createAppStore, selectCanvasRenderContext, selectCurrentPage } from './store';
import type { Project } from './types';
import { componentBlockOf, homePage } from '../test/fixtures';

function storeWithEditCapture(): { store: ReturnType<typeof createAppStore>; edited: Project[] } {
  const edited: Project[] = [];
  const store = createAppStore({ onProjectEdited: (project) => edited.push(project) });
  return { store, edited };
}

describe('createAppStore', () => {
  it('reports project edits so they can be saved', () => {
    const { store, edited } = storeWithEditCapture();
    const project = createSampleProject();
    store.dispatch(projectLoaded({ project, pageId: null }));
    const heroId = homePage(project).blockIds[1];
    store.dispatch(blockValueSet(heroId, 'title', 'Saved title', 'continuous'));
    expect(edited).toHaveLength(1);
    expect(componentBlockOf(edited[0], heroId).values.title).toBe('Saved title');
  });

  it('does not report loading a project as an edit', () => {
    const { store, edited } = storeWithEditCapture();
    store.dispatch(projectLoaded({ project: createSampleProject(), pageId: null }));
    expect(edited).toHaveLength(0);
  });

  it('does not report editor-only changes', () => {
    const { store, edited } = storeWithEditCapture();
    store.dispatch(blockSelected('anything'));
    expect(edited).toHaveLength(0);
  });

  it('works without an edit listener', () => {
    const store = createAppStore();
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('selectCurrentPage', () => {
  it('returns the open page', () => {
    const store = createAppStore();
    const project = createSampleProject();
    store.dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
    expect(selectCurrentPage(store.getState())).toBe(homePage(store.getState().project));
  });

  it('falls back to the home page when no page is open', () => {
    const store = createAppStore();
    const project = createSampleProject();
    store.dispatch(projectLoaded({ project, pageId: null }));
    expect(selectCurrentPage(store.getState()).id).toBe(project.pages.homePageId);
  });
});

describe('selectCanvasRenderContext', () => {
  it('reuses the same context while settings and pages are unchanged', () => {
    const store = createAppStore();
    store.dispatch(projectLoaded({ project: createSampleProject(), pageId: null }));
    const first = selectCanvasRenderContext(store.getState());
    store.dispatch(blockSelected(null));
    expect(selectCanvasRenderContext(store.getState())).toBe(first);
    expect(first.mode).toBe('canvas');
    expect(first.site.title).toBe('Fieldnote');
  });

  it('keeps the same context when blocks are added, so other blocks do not re-render', () => {
    const store = createAppStore();
    const project = createSampleProject();
    store.dispatch(projectLoaded({ project, pageId: null }));
    const first = selectCanvasRenderContext(store.getState());
    store.dispatch(blockInserted(project.pages.homePageId, 0, 'cta-centered'));
    expect(selectCanvasRenderContext(store.getState())).toBe(first);
  });

  it('keeps the same context when settings other than the title change', () => {
    const store = createAppStore();
    store.dispatch(projectLoaded({ project: createSampleProject(), pageId: null }));
    const first = selectCanvasRenderContext(store.getState());
    store.dispatch(settingSet('description', 'Research, tagged.', 'continuous'));
    expect(selectCanvasRenderContext(store.getState())).toBe(first);
    store.dispatch(settingSet('title', 'Acme', 'continuous'));
    expect(selectCanvasRenderContext(store.getState()).site.title).toBe('Acme');
  });

  it('builds a new context when a slug changes, the preview starts or another page opens', () => {
    const store = createAppStore();
    const project = createSampleProject();
    store.dispatch(projectLoaded({ project, pageId: null }));
    store.dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' }));
    const first = selectCanvasRenderContext(store.getState());
    expect(first.currentPageId).toBe(project.pages.homePageId);
    store.dispatch(pageSlugSet('about', 'company', 'discrete'));
    const renamed = selectCanvasRenderContext(store.getState());
    expect(renamed.pageSlugs.about).toBe('company');
    store.dispatch(previewToggled(true));
    expect(selectCanvasRenderContext(store.getState()).mode).toBe('preview');
  });
});
