import { configureStore, createListenerMiddleware, createSelector } from '@reduxjs/toolkit';
import { useSyncExternalStore } from 'react';
import { createRenderContext } from '../render/renderBlock';
import { createAutosave } from '../persistence/autosave';
import { putProject } from '../persistence/db';
import { editorSlice, saveStatusChanged } from './editorSlice';
import { createRootReducer, type RootState } from './history';
import { projectLoaded, projectSlice } from './projectSlice';
import type { Page, Project } from './types';

export type { RootState };

type AppStoreOptions = {
  preloadedState?: Partial<RootState>;
  onProjectEdited?(project: Project): void;
};

const UNCHECKED_PATHS = ['history'];
const AUTOSAVE_DELAY_MS = 1000;

export function createAppStore({ preloadedState, onProjectEdited }: AppStoreOptions = {}) {
  const listener = createListenerMiddleware<RootState>();
  if (onProjectEdited) {
    listener.startListening({
      predicate: (action, current, previous) =>
        current.project !== previous.project && !projectLoaded.match(action),
      effect: (_action, api) => onProjectEdited(api.getState().project),
    });
  }
  return configureStore({
    reducer: createRootReducer(projectSlice.reducer, editorSlice.reducer),
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: { ignoredPaths: UNCHECKED_PATHS },
        immutableCheck: { ignoredPaths: UNCHECKED_PATHS },
      }).prepend(listener.middleware),
  });
}

export const store = createAppStore({
  onProjectEdited: (project) => autosave.schedule(project),
});

export const autosave = createAutosave({
  save: putProject,
  delayMs: AUTOSAVE_DELAY_MS,
  onStatus: (status) => store.dispatch(saveStatusChanged(status)),
});

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
