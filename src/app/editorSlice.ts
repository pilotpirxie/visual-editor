import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { blockDuplicated, blockInserted, blockRemoved, projectLoaded } from './projectSlice';
import type { SaveStatus } from '../persistence/autosave';
import type { Project } from './types';

export type Device = 'desktop' | 'tablet' | 'phone';
export type PanelSide = 'left' | 'right';
export type LibraryTab = 'blocks' | 'layers';
export type CompactView = 'library' | 'canvas' | 'properties';
export type CompactTab = LibraryTab | 'canvas' | 'properties';
export type DeviceViewport = { width: number; height: number | null };

export const DEVICE_VIEWPORTS: Record<Device, DeviceViewport> = {
  desktop: { width: 1440, height: null },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 812 },
};

export const PANEL_LIMITS: Record<PanelSide, { min: number; max: number; initial: number }> = {
  left: { min: 240, max: 400, initial: 280 },
  right: { min: 280, max: 480, initial: 320 },
};

export type FocusRequest = { blockId: string; path: string };

export type EditorState = {
  currentPageId: string | null;
  selectedBlockId: string | null;
  focusRequest: FocusRequest | null;
  device: Device;
  panels: Record<PanelSide, { width: number; collapsed: boolean }>;
  libraryTab: LibraryTab;
  compactView: CompactView;
  saveStatus: SaveStatus;
};

const initialState: EditorState = {
  currentPageId: null,
  selectedBlockId: null,
  focusRequest: null,
  device: 'desktop',
  panels: {
    left: { width: PANEL_LIMITS.left.initial, collapsed: false },
    right: { width: PANEL_LIMITS.right.initial, collapsed: false },
  },
  libraryTab: 'blocks',
  compactView: 'canvas',
  saveStatus: 'saved',
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    blockSelected(state, action: PayloadAction<string | null>) {
      state.selectedBlockId = action.payload;
      state.focusRequest = null;
    },
    fieldFocusRequested(state, action: PayloadAction<FocusRequest>) {
      state.selectedBlockId = action.payload.blockId;
      state.focusRequest = action.payload;
    },
    focusRequestHandled(state) {
      state.focusRequest = null;
    },
    deviceChanged(state, action: PayloadAction<Device>) {
      state.device = action.payload;
    },
    panelResized(state, action: PayloadAction<{ side: PanelSide; width: number }>) {
      const { side, width } = action.payload;
      const { min, max } = PANEL_LIMITS[side];
      state.panels[side].width = Math.min(Math.max(Math.round(width), min), max);
    },
    panelToggled(state, action: PayloadAction<PanelSide>) {
      state.panels[action.payload].collapsed = !state.panels[action.payload].collapsed;
    },
    libraryTabChanged(state, action: PayloadAction<LibraryTab>) {
      state.libraryTab = action.payload;
    },
    compactTabSelected(state, action: PayloadAction<CompactTab>) {
      const tab = action.payload;
      if (tab === 'blocks' || tab === 'layers') {
        state.libraryTab = tab;
        state.compactView = 'library';
      } else {
        state.compactView = tab;
      }
    },
    saveStatusChanged(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(blockInserted, (state, action) => {
        state.selectedBlockId = action.payload.block.id;
        if (state.compactView === 'library') state.compactView = 'canvas';
      })
      .addCase(blockDuplicated, (state, action) => {
        state.selectedBlockId = action.payload.newBlockId;
      })
      .addCase(blockRemoved, (state, action) => {
        if (state.selectedBlockId === action.payload.blockId) state.selectedBlockId = null;
      })
      .addCase(projectLoaded, (state, action) => {
        state.currentPageId = action.payload.pageId;
        state.selectedBlockId = null;
        state.focusRequest = null;
        state.saveStatus = 'saved';
      });
  },
});

export const {
  blockSelected,
  fieldFocusRequested,
  focusRequestHandled,
  deviceChanged,
  panelResized,
  panelToggled,
  libraryTabChanged,
  compactTabSelected,
  saveStatusChanged,
} = editorSlice.actions;

export function selectCompactTab(editor: EditorState): CompactTab {
  if (editor.compactView === 'library') return editor.libraryTab;
  return editor.compactView;
}

export function reconcileEditor(editor: EditorState, project: Project): EditorState {
  const { entities, homePageId } = project.pages;
  const hasCurrentPage =
    editor.currentPageId !== null && entities[editor.currentPageId] !== undefined;
  const currentPageId = hasCurrentPage ? editor.currentPageId : null;
  const page = entities[currentPageId ?? homePageId];
  const isSelectionOnPage =
    editor.selectedBlockId !== null &&
    page !== undefined &&
    page.blockIds.includes(editor.selectedBlockId);
  const selectedBlockId = isSelectionOnPage ? editor.selectedBlockId : null;
  const isUnchanged =
    currentPageId === editor.currentPageId && selectedBlockId === editor.selectedBlockId;
  if (isUnchanged) return editor;
  return { ...editor, currentPageId, selectedBlockId, focusRequest: null };
}
