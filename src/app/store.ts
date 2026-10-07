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
import { createRootReducer, projectRefreshed, type RootState } from './history';
import { projectLoaded, projectSlice } from './projectSlice';
import { visibleBlockLists } from './blockLists';
import { projectRegistry } from '../features/block-packs/customComponents';
import { announcementFor } from '../features/editor/announcements';
import { announce } from '../features/editor/LiveAnnouncer';
import type { Page, Project, SharedSlot } from './types';

export type { RootState };

export type AppThunk<Result = void> = ThunkAction<Result, RootState, unknown, UnknownAction>;

type AppStoreOptions = {
  preloadedState?: Partial<RootState>;
  onProjectEdited?(project: Project): void;
  onAnnouncement?(text: string): void;
};

const UNCHECKED_PATHS = ['history'];
const AUTOSAVE_DELAY_MS = 1000;

function isProjectReplacement(action: UnknownAction): boolean {
  return projectLoaded.match(action) || projectRefreshed.match(action);
}

export function createAppStore({
  preloadedState,
  onProjectEdited,
  onAnnouncement,
}: AppStoreOptions = {}) {
  const listener = createListenerMiddleware<RootState>();
  listener.startListening({
    predicate: (action, current, previous) => {
      const { linkedFile, isLinkedFileStale } = current.editor;
      const isEdit = current.project !== previous.project && !isProjectReplacement(action);
      return isEdit && linkedFile !== null && !isLinkedFileStale;
    },
    effect: (_action, api) => {
      api.dispatch(linkedFileOutdated());
    },
  });
  if (onProjectEdited !== undefined) {
    listener.startListening({
      predicate: (action, current, previous) =>
        current.project !== previous.project && !isProjectReplacement(action),
      effect: (_action, api) => onProjectEdited(api.getState().project),
    });
  }
  if (onAnnouncement !== undefined) {
    listener.startListening({
      predicate: () => true,
      effect: (action, api) => {
        const text = announcementFor(action, api.getOriginalState(), api.getState());
        if (text !== null) onAnnouncement(text);
      },
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
  onAnnouncement: announce,
});

function reportSaveStatus(): (status: SaveStatus) => void {
  let hasReportedFailure = false;
  return (status) => {
    if (store.getState().editor.saveStatus !== status) store.dispatch(saveStatusChanged(status));
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

export const selectComponents = createSelector(
  [
    (state: RootState) => state.project.customDefinitions,
    (state: RootState) => state.editor.customComponentsVersion,
  ],
  (customDefinitions) => projectRegistry({ customDefinitions }),
);

export const selectCanvasRenderContext = createSelector(
  [
    (state: RootState) => state.project.settings.title,
    (state: RootState) => state.project.designSystem.iconSet,
    (state: RootState) => state.project.settings.language,
    selectPageSlugs,
    (state: RootState) => state.editor.isPreview,
    (state: RootState) => selectCurrentPage(state).id,
    (state: RootState) => state.editor.iconSetsVersion,
  ],
  (siteTitle, iconSet, language, pageSlugs, isPreview, currentPageId) =>
    renderContextFor(
      { siteTitle, iconSet, language },
      pageSlugs,
      isPreview ? 'preview' : 'canvas',
      currentPageId,
    ),
);
