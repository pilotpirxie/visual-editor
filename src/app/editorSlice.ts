import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { isBlockShown } from './blockLists';
import {
  blockConvertedToHtml,
  blockDuplicated,
  blockInserted,
  blockPasted,
  blockRemoved,
  projectLoaded,
} from './projectSlice';
import type { SaveStatus } from '../persistence/autosave';
import type { Device, Project } from './types';

export type DeviceMode = 'responsive' | Device;
export type PanelSide = 'left' | 'right';
export type LibraryTab = 'blocks' | 'layers' | 'pages';
export type PropertiesTab = 'content' | 'style' | 'advanced' | 'code';
export type CompactView = 'library' | 'canvas' | 'properties';
export type CompactTab = LibraryTab | 'canvas' | 'properties';
export type DeviceViewport = { width: number; height: number | null };

export const DEVICE_VIEWPORTS: Record<Device, DeviceViewport> = {
  desktop: { width: 1440, height: null },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 812 },
};

export const MIN_RESPONSIVE_WIDTH = 320;

export const PANEL_LIMITS: Record<PanelSide, { min: number; max: number; initial: number }> = {
  left: { min: 240, max: 400, initial: 280 },
  right: { min: 280, max: 480, initial: 320 },
};

export type FocusRequest = { blockId: string; path: string };

export type NoticeTone = 'info' | 'warning' | 'error';

export type Notice = { id: string; tone: NoticeTone; text: string };

export type LinkedFile = {
  name: string;
  savedAt: string | null;
  kind: 'file' | 'download';
  isAutoSaving: boolean;
};

const MAX_NOTICES = 3;

export type EditorState = {
  currentPageId: string | null;
  selectedBlockId: string | null;
  pageSelections: Record<string, string | null>;
  pendingAnchor: string | null;
  focusRequest: FocusRequest | null;
  device: DeviceMode;
  responsiveWidth: number | null;
  isPreview: boolean;
  panels: Record<PanelSide, { width: number; collapsed: boolean }>;
  libraryTab: LibraryTab;
  propertiesTab: PropertiesTab;
  isDesignSheetOpen: boolean;
  compactView: CompactView;
  saveStatus: SaveStatus;
  notices: Notice[];
  clipboardText: string | null;
  linkedFile: LinkedFile | null;
  isLinkedFileStale: boolean;
  conversionBlockId: string | null;
  iconSetsVersion: number;
  sectionStates: Record<string, boolean>;
};

const initialState: EditorState = {
  currentPageId: null,
  selectedBlockId: null,
  pageSelections: {},
  pendingAnchor: null,
  focusRequest: null,
  device: 'desktop',
  responsiveWidth: null,
  isPreview: false,
  panels: {
    left: { width: PANEL_LIMITS.left.initial, collapsed: false },
    right: { width: PANEL_LIMITS.right.initial, collapsed: false },
  },
  libraryTab: 'blocks',
  propertiesTab: 'content',
  isDesignSheetOpen: false,
  compactView: 'canvas',
  saveStatus: 'saved',
  notices: [],
  clipboardText: null,
  linkedFile: null,
  isLinkedFileStale: false,
  conversionBlockId: null,
  iconSetsVersion: 0,
  sectionStates: {},
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    blockSelected(state, action: PayloadAction<string | null>) {
      state.selectedBlockId = action.payload;
      state.focusRequest = null;
    },
    pageOpened(state, action: PayloadAction<{ pageId: string; fromPageId: string }>) {
      const { pageId, fromPageId } = action.payload;
      if (pageId === fromPageId) return;
      state.pageSelections[fromPageId] = state.selectedBlockId;
      state.currentPageId = pageId;
      state.selectedBlockId = state.pageSelections[pageId] ?? null;
      state.focusRequest = null;
      if (state.compactView === 'library') state.compactView = 'canvas';
    },
    pageSelectionForgotten(state, action: PayloadAction<string>) {
      state.pageSelections[action.payload] = null;
    },
    pageAnchorRequested(state, action: PayloadAction<string | null>) {
      state.pendingAnchor = action.payload;
    },
    fieldFocusRequested(state, action: PayloadAction<FocusRequest>) {
      state.selectedBlockId = action.payload.blockId;
      state.focusRequest = action.payload;
      state.propertiesTab = 'content';
    },
    focusRequestHandled(state) {
      state.focusRequest = null;
    },
    deviceChanged(state, action: PayloadAction<DeviceMode>) {
      state.device = action.payload;
    },
    responsiveWidthChanged(state, action: PayloadAction<number | null>) {
      const width = action.payload;
      state.responsiveWidth =
        width === null ? null : Math.max(MIN_RESPONSIVE_WIDTH, Math.round(width));
    },
    previewToggled(state, action: PayloadAction<boolean>) {
      state.isPreview = action.payload;
      if (action.payload) state.isDesignSheetOpen = false;
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
    propertiesTabChanged(state, action: PayloadAction<PropertiesTab>) {
      state.propertiesTab = action.payload;
    },
    designSheetToggled(state, action: PayloadAction<boolean>) {
      state.isDesignSheetOpen = action.payload;
    },
    sectionToggled(state, action: PayloadAction<{ id: string; isOpen: boolean }>) {
      state.sectionStates[action.payload.id] = action.payload.isOpen;
    },
    iconSetsLoaded(state) {
      state.iconSetsVersion += 1;
    },
    compactTabSelected(state, action: PayloadAction<CompactTab>) {
      const tab = action.payload;
      if (tab === 'blocks' || tab === 'layers' || tab === 'pages') {
        state.libraryTab = tab;
        state.compactView = 'library';
      } else {
        state.compactView = tab;
      }
    },
    saveStatusChanged(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
    noticeShown: {
      reducer(state, action: PayloadAction<Notice>) {
        state.notices.push(action.payload);
        if (state.notices.length > MAX_NOTICES) state.notices.shift();
      },
      prepare(tone: NoticeTone, text: string) {
        return { payload: { id: crypto.randomUUID(), tone, text } };
      },
    },
    noticeDismissed(state, action: PayloadAction<string>) {
      state.notices = state.notices.filter((notice) => notice.id !== action.payload);
    },
    clipboardTextStored(state, action: PayloadAction<string>) {
      state.clipboardText = action.payload;
    },
    linkedFileChanged(state, action: PayloadAction<LinkedFile | null>) {
      state.linkedFile = action.payload;
      state.isLinkedFileStale = false;
    },
    linkedFileOutdated(state) {
      state.isLinkedFileStale = true;
    },
    conversionRequested(state, action: PayloadAction<string | null>) {
      state.conversionBlockId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(blockInserted, (state, action) => {
        state.selectedBlockId = action.payload.block.id;
        state.propertiesTab = 'content';
        if (state.compactView === 'library') state.compactView = 'canvas';
      })
      .addCase(blockPasted, (state, action) => {
        state.selectedBlockId = action.payload.block.id;
        state.propertiesTab = 'content';
        if (state.compactView === 'library') state.compactView = 'canvas';
      })
      .addCase(blockConvertedToHtml, (state) => {
        state.propertiesTab = 'code';
        state.conversionBlockId = null;
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
        state.pageSelections = {};
        state.pendingAnchor = null;
        state.focusRequest = null;
        state.propertiesTab = 'content';
        state.isPreview = false;
        state.isDesignSheetOpen = false;
        state.saveStatus = 'saved';
        state.linkedFile = null;
        state.isLinkedFileStale = false;
      });
  },
});

export const {
  pageOpened,
  pageSelectionForgotten,
  pageAnchorRequested,
  blockSelected,
  fieldFocusRequested,
  focusRequestHandled,
  deviceChanged,
  responsiveWidthChanged,
  previewToggled,
  panelResized,
  panelToggled,
  libraryTabChanged,
  propertiesTabChanged,
  designSheetToggled,
  compactTabSelected,
  saveStatusChanged,
  noticeShown,
  noticeDismissed,
  clipboardTextStored,
  linkedFileChanged,
  linkedFileOutdated,
  conversionRequested,
  sectionToggled,
  iconSetsLoaded,
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
    isBlockShown(project, page, editor.selectedBlockId);
  const selectedBlockId = isSelectionOnPage ? editor.selectedBlockId : null;
  const isUnchanged =
    currentPageId === editor.currentPageId && selectedBlockId === editor.selectedBlockId;
  if (isUnchanged) return editor;
  return { ...editor, currentPageId, selectedBlockId, focusRequest: null };
}
