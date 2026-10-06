import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { blockDuplicated, blockInserted, blockRemoved } from './projectSlice';

export type Device = 'desktop' | 'tablet' | 'phone';
export type PanelSide = 'left' | 'right';
export type LibraryTab = 'blocks' | 'layers';

export const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1440, tablet: 768, phone: 375 };

export const PANEL_LIMITS: Record<PanelSide, { min: number; max: number }> = {
  left: { min: 240, max: 400 },
  right: { min: 280, max: 480 },
};

type EditorState = {
  currentPageId: string | null;
  selectedBlockId: string | null;
  device: Device;
  panels: Record<PanelSide, { width: number; collapsed: boolean }>;
  libraryTab: LibraryTab;
};

const initialState: EditorState = {
  currentPageId: null,
  selectedBlockId: null,
  device: 'desktop',
  panels: { left: { width: 280, collapsed: false }, right: { width: 320, collapsed: false } },
  libraryTab: 'blocks',
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    blockSelected(state, action: PayloadAction<string | null>) {
      state.selectedBlockId = action.payload;
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
      });
  },
});

export const { blockSelected, deviceChanged, panelResized, panelToggled, libraryTabChanged } =
  editorSlice.actions;
