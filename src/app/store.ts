import {
  configureStore,
  createListenerMiddleware,
  createSelector,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import { useSyncExternalStore } from 'react';
import { pageSlugsOf, renderContextFor } from '../render/renderBlock';
import { createAutosave, type SaveStatus } from '../persistence/autosave';
import { putProject } from '../persistence/db';
import { editorSlice, linkedFileOutdated, noticeShown, saveStatusChanged } from './editorSlice';
import { createRootReducer, type RootState } from './history';
import { projectLoaded, projectSlice } from './projectSlice';
import { visibleBlockLists } from './blockLists';
import type { Page, Project, SharedSlot } from './types';

export type { RootState };

export type AppThunk<Result = void> = ThunkAction<Result, RootState, unknown, UnknownAction>;

type AppStoreOptions = {
  preloadedState?: Partial<RootState>;
  onProjectEdited?(project: Project): void;
};

const UNCHECKED_PATHS = ['history'];
const AUTOSAVE_DELAY_MS = 1000;

export function createAppStore({ preloadedState, onProjectEdited }: AppStoreOptions = {}) {
  const listener = createListenerMiddleware<RootState>();
  listener.startListening({
    predicate: (action, current, previous) => {
      const { linkedFile, isLinkedFileStale } = current.editor;
      const isEdit = current.project !== previous.project && !projectLoaded.match(action);
      return isEdit && linkedFile !== null && !isLinkedFileStale;
    },
    effect: (_action, api) => {
      api.dispatch(linkedFileOutdated());
    },
  });
  if (onProjectEdited !== undefined) {
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

function reportSaveStatus(): (status: SaveStatus) => void {
  let hasReportedFailure = false;
  return (status) => {
    store.dispatch(saveStatusChanged(status));
    if (status === 'saved') hasReportedFailure = false;
    if (status !== 'error' || hasReportedFailure) return;
    hasReportedFailure = true;
    store.dispatch(noticeShown('error', 'Your changes could not be saved in this browser.'));
  };
}

export const autosave = createAutosave({
  save: putProject,
  delayMs: AUTOSAVE_DELAY_MS,
  onStatus: reportSaveStatus(),
});

export const dispatch = store.dispatch;

export function useStore<T>(selector: (state: RootState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function selectCurrentPage(state: RootState): Page {
  const pageId = state.editor.currentPageId ?? state.project.pages.homePageId;
  return state.project.pages.entities[pageId];
}

export function selectShownSlot(state: RootState, slot: SharedSlot): string[] {
  return visibleBlockLists(state.project, selectCurrentPage(state))[slot];
}

function hasSameSlugs(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftIds = Object.keys(left);
  if (leftIds.length !== Object.keys(right).length) return false;
  return leftIds.every((id) => left[id] === right[id]);
}

const selectPageSlugs = createSelector(
  [(state: RootState) => state.project.pages],
  (pages) => pageSlugsOf(pages),
  { memoizeOptions: { resultEqualityCheck: hasSameSlugs } },
);

export const selectCanvasRenderContext = createSelector(
  [
    (state: RootState) => state.project.settings.title,
    (state: RootState) => state.project.designSystem.iconSet,
    selectPageSlugs,
    (state: RootState) => state.editor.isPreview,
    (state: RootState) => selectCurrentPage(state).id,
    (state: RootState) => state.editor.iconSetsVersion,
  ],
  (siteTitle, iconSet, pageSlugs, isPreview, currentPageId) =>
    renderContextFor(
      { siteTitle, iconSet },
      pageSlugs,
      isPreview ? 'preview' : 'canvas',
      currentPageId,
    ),
);
