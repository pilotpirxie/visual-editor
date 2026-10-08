import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import { componentBlockOf, createTestStore, homePage, type TestStore } from '../test/fixtures';
import { blockSelected, readOnlyChanged } from './editorSlice';
import { MAX_HISTORY_STEPS, projectRefreshed, redo, undo } from './history';
import {
  blockInserted,
  blockRemoved,
  blockValueSet,
  projectLoaded,
  projectRestored,
  tokensSet,
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
    title: () => componentBlockOf(store.getState().project, heroId).values.title,
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
    expect(store.getState().history.past[0]?.patches).toHaveLength(1);
    store.dispatch(undo());
    expect(title()).toBe(original);
  });

  it('merges continuous edits that replace the same set of values into one step', () => {
    const { store } = setup();
    const tokens = () => store.getState().project.designSystem.tokens;
    const original = tokens()['--radius-md']?.value;
    for (const [at, value] of [
      [1000, '0.6rem'],
      [1100, '0.7rem'],
      [1200, '0.8rem'],
    ] as const) {
      const action = tokensSet(
        { values: { '--radius-md': value, '--radius-lg': value } },
        'continuous',
      );
      store.dispatch({ ...action, meta: { ...action.meta, at } });
    }
    const steps = store.getState().history.past;
    expect(steps).toHaveLength(1);
    expect(steps[0]?.patches).toHaveLength(2);
    store.dispatch(undo());
    expect(tokens()['--radius-md']?.value).toBe(original);
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
    store.dispatch(blockRemoved({ blockId: 'missing' }));
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

describe('read-only tabs', () => {
  it('ignores project edits, undo and redo while the project is open in another tab', () => {
    const { store, title, steps, edit } = setup();
    edit('Before', 1000);
    store.dispatch(readOnlyChanged(true));
    const project = store.getState().project;
    edit('Ignored', 5000);
    store.dispatch(undo());
    expect(store.getState().project).toBe(project);
    expect(title()).toBe('Before');
    expect(steps()).toBe(1);
  });

  it('replaces the project with the saved copy from another tab and clears history', () => {
    const { store, steps, edit } = setup();
    edit('Local', 1000);
    const saved = createSampleProject();
    saved.settings.title = 'Saved in the other tab';
    store.dispatch(readOnlyChanged(true));
    store.dispatch(projectRefreshed(saved));
    expect(store.getState().project.settings.title).toBe('Saved in the other tab');
    expect(steps()).toBe(0);
  });

  it('accepts edits again once the tab can edit', () => {
    const { store, title, edit } = setup();
    store.dispatch(readOnlyChanged(true));
    store.dispatch(readOnlyChanged(false));
    edit('Editable', 1000);
    expect(title()).toBe('Editable');
    expect(store.getState().editor.isPreview).toBe(false);
  });
});

describe('restoring a snapshot', () => {
  it('replaces the whole project in one step, keeps its id, and undoes back', () => {
    const { store, steps } = setup();
    const current = store.getState().project;
    const snapshot = createSampleProject();
    snapshot.settings.title = 'From the snapshot';
    store.dispatch(projectRestored(snapshot));
    expect(store.getState().project.settings.title).toBe('From the snapshot');
    expect(store.getState().project.id).toBe(current.id);
    expect(steps()).toBe(1);
    store.dispatch(undo());
    expect(store.getState().project).toEqual(current);
    store.dispatch(redo());
    expect(store.getState().project.settings.title).toBe('From the snapshot');
  });
});
