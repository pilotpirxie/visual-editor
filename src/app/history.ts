import { createAction, type Reducer, type UnknownAction } from '@reduxjs/toolkit';
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import { reconcileEditor, type EditorState } from './editorSlice';
import { projectLoaded, type EditMeta } from './projectSlice';
import type { Project } from './types';

enablePatches();

export const MAX_HISTORY_STEPS = 100;
const MERGE_WINDOW_MS = 500;

export type HistoryStep = { patches: Patch[]; inversePatches: Patch[] };

export type HistoryState = {
  past: HistoryStep[];
  future: HistoryStep[];
  lastMergeKey: string | null;
  lastEditAt: number;
};

export type RootState = { project: Project; editor: EditorState; history: HistoryState };

const EMPTY_HISTORY: HistoryState = {
  past: [],
  future: [],
  lastMergeKey: null,
  lastEditAt: 0,
};

export const undo = createAction('history/undo');
export const redo = createAction('history/redo');
export const projectRefreshed = createAction<Project>('session/projectRefreshed');

const PROJECT_ACTION_PREFIX = 'project/';

function editMetaOf(action: UnknownAction): EditMeta | null {
  if (!('meta' in action)) return null;
  const { meta } = action;
  if (typeof meta !== 'object' || meta === null) return null;
  if (!('mergeKey' in meta) || !('at' in meta)) return null;
  if (typeof meta.at !== 'number') return null;
  if (typeof meta.mergeKey === 'string') return { mergeKey: meta.mergeKey, at: meta.at };
  if (meta.mergeKey === null) return { mergeKey: null, at: meta.at };
  return null;
}

const PATH_SEPARATOR = '\u0000';

function replacedPaths(patches: Patch[]): Set<string> | null {
  const paths = new Set<string>();
  for (const patch of patches) {
    if (patch.op !== 'replace') return null;
    paths.add(patch.path.join(PATH_SEPARATOR));
  }
  return paths.size === patches.length ? paths : null;
}

function replacesSamePaths(earlier: Patch[], later: Patch[]): boolean {
  const earlierPaths = replacedPaths(earlier);
  const laterPaths = replacedPaths(later);
  if (earlierPaths === null || laterPaths === null) return false;
  if (earlierPaths.size === 0 || earlierPaths.size !== laterPaths.size) return false;
  for (const path of laterPaths) {
    if (!earlierPaths.has(path)) return false;
  }
  return true;
}

function mergeSteps(earlier: HistoryStep, later: HistoryStep): HistoryStep {
  if (replacesSamePaths(earlier.patches, later.patches)) {
    return { patches: later.patches, inversePatches: earlier.inversePatches };
  }
  return {
    patches: [...earlier.patches, ...later.patches],
    inversePatches: [...later.inversePatches, ...earlier.inversePatches],
  };
}

function recordStep(history: HistoryState, step: HistoryStep, meta: EditMeta | null): HistoryState {
  const last = history.past.at(-1);
  const canMerge =
    meta !== null &&
    meta.mergeKey !== null &&
    last !== undefined &&
    meta.mergeKey === history.lastMergeKey &&
    meta.at - history.lastEditAt <= MERGE_WINDOW_MS;

  if (canMerge) {
    const merged: HistoryStep = mergeSteps(last, step);
    return {
      past: [...history.past.slice(0, -1), merged],
      future: [],
      lastMergeKey: meta.mergeKey,
      lastEditAt: meta.at,
    };
  }

  return {
    past: [...history.past, step].slice(-MAX_HISTORY_STEPS),
    future: [],
    lastMergeKey: meta?.mergeKey ?? null,
    lastEditAt: meta?.at ?? 0,
  };
}

function undoStep(state: RootState): RootState {
  const step = state.history.past.at(-1);
  if (step === undefined) return state;
  const project = applyPatches(state.project, step.inversePatches);
  return {
    project,
    editor: reconcileEditor(state.editor, project),
    history: {
      past: state.history.past.slice(0, -1),
      future: [step, ...state.history.future],
      lastMergeKey: null,
      lastEditAt: 0,
    },
  };
}

function redoStep(state: RootState): RootState {
  const step = state.history.future.at(0);
  if (step === undefined) return state;
  const project = applyPatches(state.project, step.patches);
  return {
    project,
    editor: reconcileEditor(state.editor, project),
    history: {
      past: [...state.history.past, step],
      future: state.history.future.slice(1),
      lastMergeKey: null,
      lastEditAt: 0,
    },
  };
}

function isInitialized(state: Partial<RootState> | undefined): state is RootState {
  return state?.project !== undefined && state.editor !== undefined && state.history !== undefined;
}

export function createRootReducer(
  projectReducer: Reducer<Project>,
  editorReducer: Reducer<EditorState>,
): Reducer<RootState, UnknownAction, Partial<RootState>> {
  return function rootReducer(state, action) {
    if (!isInitialized(state)) {
      return {
        project: state?.project ?? projectReducer(undefined, action),
        editor: state?.editor ?? editorReducer(undefined, action),
        history: state?.history ?? EMPTY_HISTORY,
      };
    }

    if (projectLoaded.match(action)) {
      const { project } = action.payload;
      return {
        project,
        editor: reconcileEditor(editorReducer(state.editor, action), project),
        history: EMPTY_HISTORY,
      };
    }
    if (projectRefreshed.match(action)) {
      const project = action.payload;
      return { project, editor: reconcileEditor(state.editor, project), history: EMPTY_HISTORY };
    }
    const isProjectChange =
      undo.match(action) || redo.match(action) || action.type.startsWith(PROJECT_ACTION_PREFIX);
    if (state.editor.isReadOnly && isProjectChange) return state;
    if (undo.match(action)) return undoStep(state);
    if (redo.match(action)) return redoStep(state);

    const editor = editorReducer(state.editor, action);
    if (!action.type.startsWith(PROJECT_ACTION_PREFIX)) {
      const reconciledEditor = reconcileEditor(editor, state.project);
      return reconciledEditor === state.editor ? state : { ...state, editor: reconciledEditor };
    }

    const [project, patches, inversePatches] = produceWithPatches(state.project, (draft) =>
      projectReducer(draft, action),
    );
    if (project === state.project || patches.length === 0) {
      const reconciledEditor = reconcileEditor(editor, state.project);
      return reconciledEditor === state.editor ? state : { ...state, editor: reconciledEditor };
    }
    return {
      project,
      editor: reconcileEditor(editor, project),
      history: recordStep(state.history, { patches, inversePatches }, editMetaOf(action)),
    };
  };
}
