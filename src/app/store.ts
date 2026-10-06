import { configureStore, createSelector } from '@reduxjs/toolkit';
import { useSyncExternalStore } from 'react';
import { createRenderContext } from '../render/renderBlock';
import { editorSlice } from './editorSlice';
import { projectSlice } from './projectSlice';
import type { Page } from './types';

export const store = configureStore({
  reducer: { project: projectSlice.reducer, editor: editorSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;

export const dispatch = store.dispatch;

export function useStore<T>(selector: (state: RootState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function selectCurrentPageId(state: RootState): string {
  return state.editor.currentPageId ?? state.project.pages.homePageId;
}

export function selectCurrentPage(state: RootState): Page {
  return state.project.pages.entities[selectCurrentPageId(state)];
}

export const selectCanvasRenderContext = createSelector(
  [(state: RootState) => state.project.settings, (state: RootState) => state.project.pages],
  (settings, pages) => createRenderContext({ settings, pages }, 'canvas'),
);
