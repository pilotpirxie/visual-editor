import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { blockDuplicated, blockInserted, blockRemoved, projectLoaded } from './projectSlice';
import type { SaveStatus } from '../persistence/autosave';
import type { Project } from './types';

export type Device = 'desktop' | 'tablet' | 'phone';
export type PanelSide = 'left' | 'right';
export type LibraryTab = 'blocks' | 'layers';

export const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1440, tablet: 768, phone: 375 };

export const PANEL_LIMITS: Record<PanelSide, { min: number; max: number }> = {
  left: { min: 240, max: 400 },
  right: { min: 280, max: 480 },
};

export type FocusRequest = { blockId: string; path: string };

export type EditorState = {
  currentPageId: string | null;
  selectedBlockId: string | null;
  focusRequest: FocusRequest | null;
  device: Device;
  panels: Record<PanelSide, { width: number; collapsed: boolean }>;
  libraryTab: LibraryTab;
  saveStatus: SaveStatus;
};

const initialState: EditorState = {
  currentPageId: null,
  selectedBlockId: null,
  focusRequest: null,
  device: 'desktop',
  panels: { left: { width: 280, collapsed: false }, right: { width: 320, collapsed: false } },
  libraryTab: 'blocks',
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
    saveStatusChanged(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(blockInserted, (state, action) => {
        state.selectedBlockId = action.payload.block.id;
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
      });
  },
});

export const {
  blockSelected,
  fieldFocusRequested,
  deviceChanged,
  panelResized,
  panelToggled,
  libraryTabChanged,
  saveStatusChanged,
} = editorSlice.actions;

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
