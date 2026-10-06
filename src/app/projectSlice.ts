import { createEntityAdapter, createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import { createBlock, registry } from '../components/registry';
import { createSampleProject } from './sampleProject';
import type { Block } from './types';

const blocksAdapter = createEntityAdapter<Block>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const projectSlice = createSlice({
  name: 'project',
  initialState: createSampleProject,
  reducers: {
    blockInserted: {
      reducer(state, action: PayloadAction<{ pageId: string; index: number; block: Block }>) {
        const { pageId, index, block } = action.payload;
        const page = state.pages.entities[pageId];
        if (!page) return;
        blocksAdapter.addOne(state.blocks, block);
        page.blockIds.splice(clamp(index, 0, page.blockIds.length), 0, block.id);
      },
      prepare(pageId: string, index: number, componentId: string) {
        const component = registry.get(componentId);
        if (!component) throw new Error(`Cannot insert unknown component "${componentId}"`);
        return { payload: { pageId, index, block: createBlock(component.definition) } };
      },
    },
    blockMoved(state, action: PayloadAction<{ pageId: string; blockId: string; toIndex: number }>) {
      const { pageId, blockId, toIndex } = action.payload;
      const page = state.pages.entities[pageId];
      const from = page?.blockIds.indexOf(blockId) ?? -1;
      if (!page || from === -1) return;
      page.blockIds.splice(from, 1);
      page.blockIds.splice(clamp(toIndex, 0, page.blockIds.length), 0, blockId);
    },
    blockDuplicated: {
      reducer(
        state,
        action: PayloadAction<{ pageId: string; blockId: string; newBlockId: string }>,
      ) {
        const { pageId, blockId, newBlockId } = action.payload;
        const page = state.pages.entities[pageId];
        const source = state.blocks.entities[blockId];
        const index = page?.blockIds.indexOf(blockId) ?? -1;
        if (!page || !source || index === -1) return;
        blocksAdapter.addOne(state.blocks, { ...structuredClone(current(source)), id: newBlockId });
        page.blockIds.splice(index + 1, 0, newBlockId);
      },
      prepare(pageId: string, blockId: string) {
        return { payload: { pageId, blockId, newBlockId: crypto.randomUUID() } };
      },
    },
    blockRemoved(state, action: PayloadAction<{ pageId: string; blockId: string }>) {
      const { pageId, blockId } = action.payload;
      const page = state.pages.entities[pageId];
      if (!page) return;
      page.blockIds = page.blockIds.filter((id) => id !== blockId);
      blocksAdapter.removeOne(state.blocks, blockId);
    },
    blockDisabledSet(state, action: PayloadAction<{ blockId: string; disabled: boolean }>) {
      const block = state.blocks.entities[action.payload.blockId];
      if (block) block.disabled = action.payload.disabled;
    },
    tokenSet(state, action: PayloadAction<{ name: string; value: string }>) {
      const token = state.designSystem.tokens[action.payload.name];
      if (token) token.value = action.payload.value;
    },
  },
});

export const {
  blockInserted,
  blockMoved,
  blockDuplicated,
  blockRemoved,
  blockDisabledSet,
  tokenSet,
} = projectSlice.actions;
