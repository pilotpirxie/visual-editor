import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import { createTestStore, homePage, type TestStore } from '../test/fixtures';
import { blockSelected } from './editorSlice';
import { MAX_HISTORY_STEPS, redo, undo } from './history';
import {
  blockInserted,
  blockRemoved,
  blockValueSet,
  projectLoaded,
  type EditKind,
} from './projectSlice';

type HistoryFixture = {
  store: TestStore;
  heroId: string;
  title(): unknown;
  steps(): number;
  edit(value: unknown, at: number, name?: string, kind?: EditKind): void;
};

function setup(): HistoryFixture {
  const store = createTestStore();
  const heroId = homePage(store.getState().project).blockIds[1];

  function edit(value: unknown, at: number, name = 'title', kind: EditKind = 'continuous'): void {
    const action = blockValueSet(heroId, name, value, kind);
    store.dispatch({ ...action, meta: { ...action.meta, at } });
  }

  return {
    store,
    heroId,
    title: () => store.getState().project.blocks.entities[heroId].values.title,
    steps: () => store.getState().history.past.length,
    edit,
  };
}

describe('undo', () => {
  it('records nothing for a freshly loaded project', () => {
    const { store, steps } = setup();
    expect(steps()).toBe(0);
    expect(store.getState().history.future).toHaveLength(0);
  });

  it('merges typing in the same field with pauses under 500 ms into one step', () => {
    const { store, title, steps, edit } = setup();
    const original = title();
    edit('S', 1000);
    edit('Sh', 1400);
    edit('Shi', 1800);
    expect(steps()).toBe(1);
    store.dispatch(undo());
    expect(title()).toBe(original);
  });

  it('starts a new step after a longer pause or in another field', () => {
    const { steps, edit } = setup();
    edit('First', 1000);
    edit('Second', 1600);
    edit('Eyebrow', 1700, 'eyebrow');
    expect(steps()).toBe(3);
  });

  it('never merges discrete edits even when they come quickly', () => {
    const { steps, edit } = setup();
    edit('Picked', 1000, 'title', 'discrete');
    edit('Picked again', 1100, 'title', 'discrete');
    expect(steps()).toBe(2);
  });

  it('does not merge typing into a discrete edit made just before', () => {
    const { steps, edit } = setup();
    edit('Picked', 1000, 'title', 'discrete');
    edit('Typed', 1100, 'title', 'continuous');
    expect(steps()).toBe(2);
  });

  it('keeps only the last 100 steps', () => {
    const { steps, edit } = setup();
    for (let step = 0; step <= MAX_HISTORY_STEPS; step += 1) edit(`Title ${step}`, step * 1000);
    expect(steps()).toBe(MAX_HISTORY_STEPS);
  });

  it('records no step for actions that change nothing', () => {
    const { store, title, steps, edit } = setup();
    edit(title(), 1000);
    store.dispatch(blockRemoved({ pageId: 'missing', blockId: 'missing' }));
    store.dispatch(blockSelected(null));
    expect(steps()).toBe(0);
  });

  it('does nothing when there is nothing to undo', () => {
    const { store } = setup();
    const before = store.getState();
    store.dispatch(undo());
    expect(store.getState()).toBe(before);
  });

  it('clears the selection when undo removes the selected block', () => {
    const { store } = setup();
    store.dispatch(blockInserted(store.getState().project.pages.homePageId, 0, 'cta-centered'));
    expect(store.getState().editor.selectedBlockId).not.toBeNull();
    store.dispatch(undo());
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('never merges into an older step after an undo', () => {
    const { store, title, steps, edit } = setup();
    edit('One', 1000);
    edit('Two', 2000);
    store.dispatch(undo());
    edit('Three', 2100);
    expect(steps()).toBe(2);
    store.dispatch(undo());
    expect(title()).toBe('One');
  });
});

describe('redo', () => {
  it('reapplies an undone step', () => {
    const { store, title, edit } = setup();
    edit('Changed', 1000);
    store.dispatch(undo());
    store.dispatch(redo());
    expect(title()).toBe('Changed');
  });

  it('forgets undone steps once a new edit is made', () => {
    const { store, edit } = setup();
    edit('Changed', 1000);
    store.dispatch(undo());
    edit('Branch', 5000);
    expect(store.getState().history.future).toHaveLength(0);
  });

  it('does nothing when there is nothing to redo', () => {
    const { store } = setup();
    const before = store.getState();
    store.dispatch(redo());
    expect(store.getState()).toBe(before);
  });
});

describe('createRootReducer', () => {
  it('resets history and the open page when a project loads', () => {
    const { store, steps, edit } = setup();
    edit('Changed', 1000);
    const next = createSampleProject();
    store.dispatch(projectLoaded({ project: next, pageId: 'missing-page' }));
    expect(steps()).toBe(0);
    expect(store.getState().project).toBe(next);
    expect(store.getState().editor.currentPageId).toBeNull();
  });

  it('never leaves a selection pointing at a block that is not on the page', () => {
    const { store } = setup();
    store.dispatch(blockInserted('missing-page', 0, 'cta-centered'));
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});
