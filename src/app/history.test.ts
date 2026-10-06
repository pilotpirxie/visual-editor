import { describe, expect, it } from 'vitest';
import { blockSelected } from './editorSlice';
import { MAX_HISTORY_STEPS, redo, undo } from './history';
import { blockInserted, blockRemoved, blockValueSet, projectLoaded } from './projectSlice';
import { createSampleProject } from './projectFactory';
import { createAppStore } from './store';

function setup() {
  const store = createAppStore({ preloadedState: { project: createSampleProject() } });
  const pageId = store.getState().project.pages.homePageId;
  const heroId = store.getState().project.pages.entities[pageId].blockIds[1];
  const title = () => store.getState().project.blocks.entities[heroId].values.title;
  const history = () => store.getState().history;
  function edit(value: string, at: number, name = 'title') {
    const action = blockValueSet(heroId, name, value);
    store.dispatch({ ...action, meta: { ...action.meta, at } });
  }
  return { store, pageId, heroId, title, history, edit };
}

describe('undo history', () => {
  it('records nothing on start', () => {
    const { history } = setup();
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(0);
  });

  it('merges edits to the same field within 500 ms into one step', () => {
    const { store, title, history, edit } = setup();
    const original = title();
    edit('S', 1000);
    edit('Sh', 1400);
    edit('Shi', 1800);
    expect(history().past).toHaveLength(1);
    store.dispatch(undo());
    expect(title()).toBe(original);
  });

  it('starts a new step after a 600 ms pause or on another field', () => {
    const { history, edit } = setup();
    edit('First', 1000);
    edit('Second', 1600);
    edit('Eyebrow', 1700, 'eyebrow');
    expect(history().past).toHaveLength(3);
  });

  it('keeps only the last 100 steps', () => {
    const { history, edit } = setup();
    for (let step = 0; step <= MAX_HISTORY_STEPS; step += 1) edit(`Title ${step}`, step * 1000);
    expect(history().past).toHaveLength(MAX_HISTORY_STEPS);
  });

  it('ignores actions that change nothing', () => {
    const { store, pageId, title, history, edit } = setup();
    edit(String(title()), 1000);
    store.dispatch(blockRemoved({ pageId, blockId: 'missing' }));
    store.dispatch(blockSelected(null));
    expect(history().past).toHaveLength(0);
  });

  it('undoes and redoes a step, and a new edit clears the redo stack', () => {
    const { store, title, history, edit } = setup();
    const original = title();
    edit('Changed', 1000);
    store.dispatch(undo());
    expect(title()).toBe(original);
    store.dispatch(redo());
    expect(title()).toBe('Changed');
    store.dispatch(undo());
    edit('Branch', 5000);
    expect(history().future).toHaveLength(0);
  });

  it('never merges into an older step after an undo', () => {
    const { store, title, history, edit } = setup();
    edit('One', 1000);
    edit('Two', 2000);
    store.dispatch(undo());
    edit('Three', 2100);
    expect(history().past).toHaveLength(2);
    store.dispatch(undo());
    expect(title()).toBe('One');
  });

  it('clears the selection when undo removes the selected block', () => {
    const { store, pageId } = setup();
    store.dispatch(blockInserted(pageId, 0, 'cta-centered'));
    expect(store.getState().editor.selectedBlockId).not.toBeNull();
    store.dispatch(undo());
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('resets history and editor state when a project loads', () => {
    const { store, history, edit } = setup();
    edit('Changed', 1000);
    const next = createSampleProject();
    store.dispatch(projectLoaded({ project: next, pageId: 'missing-page' }));
    expect(history().past).toHaveLength(0);
    expect(store.getState().project).toBe(next);
    expect(store.getState().editor.currentPageId).toBeNull();
  });
});
