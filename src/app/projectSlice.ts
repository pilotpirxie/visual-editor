import {
  createAction,
  createEntityAdapter,
  createSlice,
  current,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { createBlock, registry } from '../components/registry';
import { createBlankProject, UNTITLED_PROJECT_TITLE } from './projectFactory';
import type { Block, Project } from './types';

const blocksAdapter = createEntityAdapter<Block>();

export type EditKind = 'continuous' | 'discrete';

export type EditMeta = { mergeKey: string | null; at: number };

function editMeta(kind: EditKind, mergeKey: string): EditMeta {
  if (kind === 'continuous') return { mergeKey, at: Date.now() };
  return { mergeKey: null, at: Date.now() };
}

export const projectLoaded = createAction<{ project: Project; pageId: string | null }>(
  'project/loaded',
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const projectSlice = createSlice({
  name: 'project',
  initialState: () => createBlankProject(UNTITLED_PROJECT_TITLE),
  reducers: {
    blockInserted: {
      reducer(state, action: PayloadAction<{ pageId: string; index: number; block: Block }>) {
        const { pageId, index, block } = action.payload;
        const page = state.pages.entities[pageId];
        if (page === undefined) return;
        blocksAdapter.addOne(state.blocks, block);
        page.blockIds.splice(clamp(index, 0, page.blockIds.length), 0, block.id);
      },
      prepare(pageId: string, index: number, componentId: string) {
        const component = registry.get(componentId);
        if (component === undefined) {
          throw new Error(`Cannot insert unknown component "${componentId}"`);
        }
        return { payload: { pageId, index, block: createBlock(component.definition) } };
      },
    },
    blockMoved(state, action: PayloadAction<{ pageId: string; blockId: string; toIndex: number }>) {
      const { pageId, blockId, toIndex } = action.payload;
      const page = state.pages.entities[pageId];
      if (page === undefined) return;
      const from = page.blockIds.indexOf(blockId);
      if (from === -1) return;
      const to = clamp(toIndex, 0, page.blockIds.length - 1);
      if (to === from) return;
      page.blockIds.splice(from, 1);
      page.blockIds.splice(to, 0, blockId);
    },
    blockDuplicated: {
      reducer(
        state,
        action: PayloadAction<{ pageId: string; blockId: string; newBlockId: string }>,
      ) {
        const { pageId, blockId, newBlockId } = action.payload;
        const page = state.pages.entities[pageId];
        const source = state.blocks.entities[blockId];
        if (page === undefined || source === undefined) return;
        const index = page.blockIds.indexOf(blockId);
        if (index === -1) return;
        const copy = structuredClone(current(source));
        blocksAdapter.addOne(state.blocks, { ...copy, id: newBlockId });
        page.blockIds.splice(index + 1, 0, newBlockId);
      },
      prepare(pageId: string, blockId: string) {
        return { payload: { pageId, blockId, newBlockId: crypto.randomUUID() } };
      },
    },
    blockRemoved(state, action: PayloadAction<{ pageId: string; blockId: string }>) {
      const { pageId, blockId } = action.payload;
      const page = state.pages.entities[pageId];
      if (page === undefined) return;
      const index = page.blockIds.indexOf(blockId);
      if (index === -1) return;
      page.blockIds.splice(index, 1);
      blocksAdapter.removeOne(state.blocks, blockId);
    },
    blockDisabledSet(state, action: PayloadAction<{ blockId: string; disabled: boolean }>) {
      const block = state.blocks.entities[action.payload.blockId];
      if (block !== undefined) block.disabled = action.payload.disabled;
    },
    blockValueSet: {
      reducer(
        state,
        action: PayloadAction<{ blockId: string; name: string; value: unknown }, string, EditMeta>,
      ) {
        const { blockId, name, value } = action.payload;
        const block = state.blocks.entities[blockId];
        if (block === undefined || Object.is(block.values[name], value)) return;
        block.values[name] = value;
      },
      prepare(blockId: string, name: string, value: unknown, kind: EditKind) {
        return {
          payload: { blockId, name, value },
          meta: editMeta(kind, `value:${blockId}:${name}`),
        };
      },
    },
    tokenSet: {
      reducer(state, action: PayloadAction<{ name: string; value: string }, string, EditMeta>) {
        const token = state.designSystem.tokens[action.payload.name];
        if (token !== undefined) token.value = action.payload.value;
      },
      prepare(payload: { name: string; value: string }, kind: EditKind) {
        return { payload, meta: editMeta(kind, `token:${payload.name}`) };
      },
    },
  },
});

export const {
  blockInserted,
  blockMoved,
  blockDuplicated,
  blockRemoved,
  blockDisabledSet,
  blockValueSet,
  tokenSet,
} = projectSlice.actions;
