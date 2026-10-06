import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { editorSlice, panelResized } from './editorSlice';
import {
  blockDisabledSet,
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockRemoved,
  projectSlice,
  tokenSet,
} from './projectSlice';

function setup() {
  const store = configureStore({
    reducer: { project: projectSlice.reducer, editor: editorSlice.reducer },
  });
  const pageId = store.getState().project.pages.homePageId;
  const blockIds = () => store.getState().project.pages.entities[pageId].blockIds;
  const componentIds = () =>
    blockIds().map((id) => store.getState().project.blocks.entities[id].componentId);
  return { store, pageId, blockIds, componentIds };
}

describe('project and editor slices', () => {
  it('starts with the sample page', () => {
    const { componentIds } = setup();
    expect(componentIds()).toEqual([
      'nav-simple',
      'hero-centered',
      'features-grid-3',
      'footer-simple',
    ]);
  });

  it('inserts a block at an index with its defaults and selects it', () => {
    const { store, pageId, blockIds, componentIds } = setup();
    store.dispatch(blockInserted(pageId, 2, 'cta-centered'));
    expect(componentIds()[2]).toBe('cta-centered');
    const inserted = store.getState().project.blocks.entities[blockIds()[2]];
    expect(inserted.values.title).toBe('Your next customer call could be your best roadmap input');
    expect(store.getState().editor.selectedBlockId).toBe(inserted.id);
  });

  it('moves a block and clamps out-of-range indexes', () => {
    const { store, pageId, blockIds, componentIds } = setup();
    const footer = blockIds()[3];
    store.dispatch(blockMoved({ pageId, blockId: footer, toIndex: 0 }));
    expect(componentIds()[0]).toBe('footer-simple');
    store.dispatch(blockMoved({ pageId, blockId: footer, toIndex: 99 }));
    expect(componentIds()[3]).toBe('footer-simple');
  });

  it('duplicates a block right after the source with a deep copy of its values', () => {
    const { store, pageId, blockIds } = setup();
    const source = blockIds()[2];
    store.dispatch(blockDuplicated(pageId, source));
    const copyId = blockIds()[3];
    const { entities } = store.getState().project.blocks;
    expect(copyId).not.toBe(source);
    expect(entities[copyId].values).toEqual(entities[source].values);
    expect(entities[copyId].values.items).not.toBe(entities[source].values.items);
    expect(store.getState().editor.selectedBlockId).toBe(copyId);
  });

  it('removes a block and clears the selection when it was selected', () => {
    const { store, pageId, blockIds } = setup();
    store.dispatch(blockInserted(pageId, 0, 'cta-centered'));
    const inserted = blockIds()[0];
    store.dispatch(blockRemoved({ pageId, blockId: inserted }));
    expect(blockIds()).not.toContain(inserted);
    expect(store.getState().project.blocks.entities[inserted]).toBeUndefined();
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('disables and re-enables a block without removing it', () => {
    const { store, blockIds } = setup();
    const blockId = blockIds()[1];
    store.dispatch(blockDisabledSet({ blockId, disabled: true }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(true);
    expect(blockIds()).toContain(blockId);
    store.dispatch(blockDisabledSet({ blockId, disabled: false }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(false);
  });

  it('changes a design token and ignores unknown tokens', () => {
    const { store } = setup();
    store.dispatch(tokenSet({ name: '--color-primary', value: '#0f766e' }));
    store.dispatch(tokenSet({ name: '--color-unknown', value: 'red' }));
    const { tokens } = store.getState().project.designSystem;
    expect(tokens['--color-primary'].value).toBe('#0f766e');
    expect(tokens['--color-unknown']).toBeUndefined();
  });

  it('clamps panel widths to their limits', () => {
    const { store } = setup();
    store.dispatch(panelResized({ side: 'left', width: 1000 }));
    store.dispatch(panelResized({ side: 'right', width: 10 }));
    expect(store.getState().editor.panels.left.width).toBe(400);
    expect(store.getState().editor.panels.right.width).toBe(280);
  });
});
