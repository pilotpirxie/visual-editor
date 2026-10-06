import { describe, expect, it } from 'vitest';
import { createTestStore, homePage, type TestStore } from '../test/fixtures';
import {
  blockDisabledSet,
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockRemoved,
  blockValueSet,
  tokenSet,
} from './projectSlice';

function pageBlockIds(store: TestStore): string[] {
  return homePage(store.getState().project).blockIds;
}

function componentIds(store: TestStore): string[] {
  const { entities } = store.getState().project.blocks;
  const ids: string[] = [];
  for (const blockId of pageBlockIds(store)) ids.push(entities[blockId].componentId);
  return ids;
}

function homePageId(store: TestStore): string {
  return store.getState().project.pages.homePageId;
}

describe('blockInserted', () => {
  it('inserts a block with its default values at the given index and selects it', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 2, 'cta-centered'));
    const inserted = store.getState().project.blocks.entities[pageBlockIds(store)[2]];
    expect(componentIds(store)[2]).toBe('cta-centered');
    expect(inserted.values.title).toBe('Your next customer call could be your best roadmap input');
    expect(store.getState().editor.selectedBlockId).toBe(inserted.id);
  });

  it('clamps an index past the end to the end of the page', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 99, 'cta-centered'));
    expect(componentIds(store).at(-1)).toBe('cta-centered');
  });

  it('throws for a component that is not in the library', () => {
    const store = createTestStore();
    expect(() => blockInserted(homePageId(store), 0, 'no-such-block')).toThrow(
      'Cannot insert unknown component "no-such-block"',
    );
  });

  it('changes nothing and selects nothing when the page does not exist', () => {
    const store = createTestStore();
    const before = store.getState().project;
    store.dispatch(blockInserted('missing-page', 0, 'cta-centered'));
    expect(store.getState().project).toBe(before);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});

describe('blockMoved', () => {
  it('moves a block to a new index', () => {
    const store = createTestStore();
    const footer = pageBlockIds(store)[3];
    store.dispatch(blockMoved({ pageId: homePageId(store), blockId: footer, toIndex: 0 }));
    expect(componentIds(store)[0]).toBe('footer-simple');
  });

  it('clamps an out-of-range index to the last position', () => {
    const store = createTestStore();
    const nav = pageBlockIds(store)[0];
    store.dispatch(blockMoved({ pageId: homePageId(store), blockId: nav, toIndex: 99 }));
    expect(componentIds(store).at(-1)).toBe('nav-simple');
  });

  it('records no undo step for a move to the same index or of an unknown block', () => {
    const store = createTestStore();
    const hero = pageBlockIds(store)[1];
    store.dispatch(blockMoved({ pageId: homePageId(store), blockId: hero, toIndex: 1 }));
    store.dispatch(blockMoved({ pageId: homePageId(store), blockId: 'missing', toIndex: 0 }));
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('blockDuplicated', () => {
  it('places a deep copy right after the source and selects it', () => {
    const store = createTestStore();
    const source = pageBlockIds(store)[2];
    store.dispatch(blockDuplicated(homePageId(store), source));
    const copyId = pageBlockIds(store)[3];
    const { entities } = store.getState().project.blocks;
    expect(copyId).not.toBe(source);
    expect(entities[copyId].values).toEqual(entities[source].values);
    expect(entities[copyId].values.items).not.toBe(entities[source].values.items);
    expect(store.getState().editor.selectedBlockId).toBe(copyId);
  });

  it('selects nothing when the source block does not exist', () => {
    const store = createTestStore();
    store.dispatch(blockDuplicated(homePageId(store), 'missing'));
    expect(pageBlockIds(store)).toHaveLength(4);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});

describe('blockRemoved', () => {
  it('removes the block from the page and the project and clears its selection', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 0, 'cta-centered'));
    const inserted = pageBlockIds(store)[0];
    store.dispatch(blockRemoved({ pageId: homePageId(store), blockId: inserted }));
    expect(pageBlockIds(store)).not.toContain(inserted);
    expect(store.getState().project.blocks.entities[inserted]).toBeUndefined();
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('keeps the selection when another block is removed', () => {
    const store = createTestStore();
    const [nav, hero] = pageBlockIds(store);
    store.dispatch(blockDuplicated(homePageId(store), hero));
    const selected = store.getState().editor.selectedBlockId;
    store.dispatch(blockRemoved({ pageId: homePageId(store), blockId: nav }));
    expect(store.getState().editor.selectedBlockId).toBe(selected);
  });
});

describe('blockDisabledSet', () => {
  it('disables and re-enables a block without removing it from the page', () => {
    const store = createTestStore();
    const blockId = pageBlockIds(store)[1];
    store.dispatch(blockDisabledSet({ blockId, disabled: true }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(true);
    expect(pageBlockIds(store)).toContain(blockId);
    store.dispatch(blockDisabledSet({ blockId, disabled: false }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(false);
  });
});

describe('blockValueSet', () => {
  it('sets a field value on the block', () => {
    const store = createTestStore();
    const blockId = pageBlockIds(store)[1];
    store.dispatch(blockValueSet(blockId, 'title', 'Ship what customers asked for', 'continuous'));
    expect(store.getState().project.blocks.entities[blockId].values.title).toBe(
      'Ship what customers asked for',
    );
  });

  it('ignores blocks that do not exist', () => {
    const store = createTestStore();
    const before = store.getState().project;
    store.dispatch(blockValueSet('missing', 'title', 'Nothing', 'continuous'));
    expect(store.getState().project).toBe(before);
  });

  it('asks to merge typing into one undo step per block field', () => {
    const action = blockValueSet('block-1', 'title', 'Hello', 'continuous');
    expect(action.meta.mergeKey).toBe('value:block-1:title');
    expect(action.meta.at).toBeTypeOf('number');
  });

  it('never asks to merge discrete edits such as toggles and list changes', () => {
    const action = blockValueSet('block-1', 'featured', true, 'discrete');
    expect(action.meta.mergeKey).toBeNull();
  });
});

describe('tokenSet', () => {
  it('changes a design token value', () => {
    const store = createTestStore();
    store.dispatch(tokenSet({ name: '--color-primary', value: '#0f766e' }, 'continuous'));
    expect(store.getState().project.designSystem.tokens['--color-primary'].value).toBe('#0f766e');
  });

  it('ignores tokens that do not exist', () => {
    const store = createTestStore();
    store.dispatch(tokenSet({ name: '--color-unknown', value: 'red' }, 'discrete'));
    expect(store.getState().project.designSystem.tokens['--color-unknown']).toBeUndefined();
  });

  it('merges only continuous token edits', () => {
    const picked = tokenSet({ name: '--font-heading', value: 'serif' }, 'discrete');
    const dragged = tokenSet({ name: '--color-primary', value: '#000000' }, 'continuous');
    expect(picked.meta.mergeKey).toBeNull();
    expect(dragged.meta.mergeKey).toBe('token:--color-primary');
  });
});
