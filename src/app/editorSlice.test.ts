import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import { createTestStore, homePage } from '../test/fixtures';
import {
  blockSelected,
  compactTabSelected,
  designSheetToggled,
  propertiesOpened,
  deviceChanged,
  editorSlice,
  fieldFocusRequested,
  focusRequestHandled,
  libraryDrawerToggled,
  libraryOpened,
  libraryRailClicked,
  libraryTabChanged,
  pageAnchorRequested,
  pageOpened,
  pageSelectionForgotten,
  panelResized,
  panelToggled,
  previewToggled,
  propertiesTabChanged,
  reconcileEditor,
  responsiveWidthChanged,
  saveStatusChanged,
  sectionToggled,
  selectCompactTab,
  type EditorState,
} from './editorSlice';
import { blockInserted, projectLoaded } from './projectSlice';

function initialEditor(): EditorState {
  return editorSlice.reducer(undefined, { type: 'init' });
}

describe('editorSlice initial state', () => {
  it('opens in responsive mode with both panels at their default widths and the canvas view', () => {
    const editor = initialEditor();
    expect(editor.device).toBe('responsive');
    expect(editor.panels.left).toEqual({ width: 280, collapsed: false });
    expect(editor.panels.right).toEqual({ width: 320, collapsed: false });
    expect(editor.compactView).toBe('canvas');
    expect(editor.saveStatus).toBe('saved');
  });
});

describe('pageOpened', () => {
  it('remembers the selection of the page it leaves and restores the one it opens', () => {
    let editor = editorSlice.reducer(initialEditor(), blockSelected('hero'));
    editor = editorSlice.reducer(editor, pageOpened({ pageId: 'about', fromPageId: 'home' }));
    expect(editor.currentPageId).toBe('about');
    expect(editor.selectedBlockId).toBeNull();
    editor = editorSlice.reducer(editor, blockSelected('team'));
    editor = editorSlice.reducer(editor, pageOpened({ pageId: 'home', fromPageId: 'about' }));
    expect(editor.selectedBlockId).toBe('hero');
    expect(editor.pageSelections).toEqual({ home: 'hero', about: 'team' });
  });

  it('shows the canvas when a page is opened from the library on a phone', () => {
    let editor = editorSlice.reducer(initialEditor(), compactTabSelected('pages'));
    expect(editor.compactView).toBe('library');
    editor = editorSlice.reducer(editor, pageOpened({ pageId: 'about', fromPageId: 'home' }));
    expect(editor.compactView).toBe('canvas');
  });

  it('does nothing when the page is already open', () => {
    const editor = editorSlice.reducer(initialEditor(), blockSelected('hero'));
    expect(editorSlice.reducer(editor, pageOpened({ pageId: 'home', fromPageId: 'home' }))).toBe(
      editor,
    );
  });
});

describe('pageSelectionForgotten', () => {
  it('opens the page next time with nothing selected', () => {
    let editor = editorSlice.reducer(initialEditor(), blockSelected('hero'));
    editor = editorSlice.reducer(editor, pageOpened({ pageId: 'about', fromPageId: 'home' }));
    editor = editorSlice.reducer(editor, pageSelectionForgotten('home'));
    editor = editorSlice.reducer(editor, pageOpened({ pageId: 'home', fromPageId: 'about' }));
    expect(editor.selectedBlockId).toBeNull();
  });
});

describe('pageAnchorRequested', () => {
  it('keeps the section to scroll to once the page opens', () => {
    const editor = editorSlice.reducer(initialEditor(), pageAnchorRequested('pricing'));
    expect(editor.pendingAnchor).toBe('pricing');
  });
});

describe('responsiveWidthChanged', () => {
  it('stores a whole-pixel width of at least 320 px', () => {
    let editor = editorSlice.reducer(initialEditor(), responsiveWidthChanged(612.4));
    expect(editor.responsiveWidth).toBe(612);
    editor = editorSlice.reducer(editor, responsiveWidthChanged(100));
    expect(editor.responsiveWidth).toBe(320);
  });

  it('goes back to filling the canvas with null', () => {
    let editor = editorSlice.reducer(initialEditor(), responsiveWidthChanged(500));
    editor = editorSlice.reducer(editor, responsiveWidthChanged(null));
    expect(editor.responsiveWidth).toBeNull();
  });
});

describe('previewToggled', () => {
  it('starts Preview and closes the design system sheet', () => {
    let editor = editorSlice.reducer(initialEditor(), designSheetToggled(true));
    editor = editorSlice.reducer(editor, previewToggled(true));
    expect(editor.isPreview).toBe(true);
    expect(editor.isDesignSheetOpen).toBe(false);
  });

  it('ends Preview when another project opens', () => {
    const project = createSampleProject();
    let editor = editorSlice.reducer(initialEditor(), previewToggled(true));
    editor = editorSlice.reducer(
      editor,
      projectLoaded({ project, pageId: project.pages.homePageId }),
    );
    expect(editor.isPreview).toBe(false);
  });
});

describe('propertiesTabChanged', () => {
  it('switches the properties panel tab and keeps it while other blocks are selected', () => {
    let editor = editorSlice.reducer(initialEditor(), propertiesTabChanged('style'));
    editor = editorSlice.reducer(editor, blockSelected('b'));
    expect(editor.propertiesTab).toBe('style');
  });

  it('returns to the content tab when a field is focused from the canvas', () => {
    let editor = editorSlice.reducer(initialEditor(), propertiesTabChanged('style'));
    editor = editorSlice.reducer(editor, fieldFocusRequested({ blockId: 'a', path: 'title' }));
    expect(editor.propertiesTab).toBe('content');
  });
});

describe('blockSelected', () => {
  it('selects a block and drops any pending focus request', () => {
    let editor = editorSlice.reducer(
      initialEditor(),
      fieldFocusRequested({ blockId: 'a', path: 'title' }),
    );
    editor = editorSlice.reducer(editor, blockSelected('b'));
    expect(editor.selectedBlockId).toBe('b');
    expect(editor.focusRequest).toBeNull();
  });
});

describe('fieldFocusRequested', () => {
  it('selects the block and remembers which field to focus', () => {
    const editor = editorSlice.reducer(
      initialEditor(),
      fieldFocusRequested({ blockId: 'a', path: 'items.1' }),
    );
    expect(editor.selectedBlockId).toBe('a');
    expect(editor.focusRequest).toEqual({ blockId: 'a', path: 'items.1' });
  });
});

describe('focusRequestHandled', () => {
  it('clears the focus request but keeps the selection', () => {
    let editor = editorSlice.reducer(
      initialEditor(),
      fieldFocusRequested({ blockId: 'a', path: 'title' }),
    );
    editor = editorSlice.reducer(editor, focusRequestHandled());
    expect(editor.focusRequest).toBeNull();
    expect(editor.selectedBlockId).toBe('a');
  });
});

describe('deviceChanged', () => {
  it('switches the preview device', () => {
    const editor = editorSlice.reducer(initialEditor(), deviceChanged('phone'));
    expect(editor.device).toBe('phone');
  });
});

describe('panelResized', () => {
  it('rounds the width and clamps it to the panel limits', () => {
    let editor = editorSlice.reducer(initialEditor(), panelResized({ side: 'left', width: 300.6 }));
    expect(editor.panels.left.width).toBe(301);
    editor = editorSlice.reducer(editor, panelResized({ side: 'left', width: 1000 }));
    editor = editorSlice.reducer(editor, panelResized({ side: 'right', width: 10 }));
    expect(editor.panels.left.width).toBe(400);
    expect(editor.panels.right.width).toBe(280);
  });
});

describe('panelToggled', () => {
  it('collapses and expands one side without touching the other', () => {
    let editor = editorSlice.reducer(initialEditor(), panelToggled('right'));
    expect(editor.panels.right.collapsed).toBe(true);
    expect(editor.panels.left.collapsed).toBe(false);
    editor = editorSlice.reducer(editor, panelToggled('right'));
    expect(editor.panels.right.collapsed).toBe(false);
  });
});

describe('libraryRailClicked', () => {
  it('opens the drawer on the clicked tab and closes it when the open tab is clicked again', () => {
    let editor = editorSlice.reducer(
      initialEditor(),
      libraryRailClicked({ tab: 'layers', isDrawer: true }),
    );
    expect(editor.libraryTab).toBe('layers');
    expect(editor.isLibraryDrawerOpen).toBe(true);
    editor = editorSlice.reducer(editor, libraryRailClicked({ tab: 'pages', isDrawer: true }));
    expect(editor.libraryTab).toBe('pages');
    expect(editor.isLibraryDrawerOpen).toBe(true);
    editor = editorSlice.reducer(editor, libraryRailClicked({ tab: 'pages', isDrawer: true }));
    expect(editor.isLibraryDrawerOpen).toBe(false);
  });

  it('collapses and expands the docked panel the same way', () => {
    let editor = editorSlice.reducer(
      initialEditor(),
      libraryRailClicked({ tab: 'blocks', isDrawer: false }),
    );
    expect(editor.panels.left.collapsed).toBe(true);
    editor = editorSlice.reducer(editor, libraryRailClicked({ tab: 'layers', isDrawer: false }));
    expect(editor.libraryTab).toBe('layers');
    expect(editor.panels.left.collapsed).toBe(false);
    expect(editor.isLibraryDrawerOpen).toBe(false);
  });
});

describe('designSheetToggled', () => {
  it('opens a collapsed properties column so the design panel has room', () => {
    let editor = editorSlice.reducer(initialEditor(), panelToggled('right'));
    editor = editorSlice.reducer(editor, designSheetToggled(true));
    expect(editor.isDesignSheetOpen).toBe(true);
    expect(editor.panels.right.collapsed).toBe(false);
  });
});

describe('libraryTabChanged', () => {
  it('switches between blocks and layers', () => {
    const editor = editorSlice.reducer(initialEditor(), libraryTabChanged('layers'));
    expect(editor.libraryTab).toBe('layers');
  });
});

describe('compactTabSelected', () => {
  it('shows the library on the chosen tab for Blocks and Layers', () => {
    const editor = editorSlice.reducer(initialEditor(), compactTabSelected('layers'));
    expect(editor.compactView).toBe('library');
    expect(editor.libraryTab).toBe('layers');
  });

  it('returns to the canvas from the properties view', () => {
    let editor = editorSlice.reducer(initialEditor(), propertiesOpened());
    expect(editor.compactView).toBe('properties');
    editor = editorSlice.reducer(editor, compactTabSelected('canvas'));
    expect(editor.compactView).toBe('canvas');
  });

  it('opens project settings as a library tab', () => {
    const editor = editorSlice.reducer(initialEditor(), compactTabSelected('settings'));
    expect(editor.compactView).toBe('library');
    expect(editor.libraryTab).toBe('settings');
  });

  it('closes the design panel when another view is chosen', () => {
    let editor = editorSlice.reducer(initialEditor(), designSheetToggled(true));
    editor = editorSlice.reducer(editor, compactTabSelected('pages'));
    expect(editor.isDesignSheetOpen).toBe(false);
  });

  it('switches from the library to the canvas after a block is inserted', () => {
    const store = createTestStore();
    store.dispatch(compactTabSelected('blocks'));
    store.dispatch(blockInserted(store.getState().project.pages.homePageId, 0, 'cta-centered'));
    expect(store.getState().editor.compactView).toBe('canvas');
  });

  it('stays on properties when a block is inserted from elsewhere', () => {
    const store = createTestStore();
    store.dispatch(propertiesOpened());
    store.dispatch(blockInserted(store.getState().project.pages.homePageId, 0, 'cta-centered'));
    expect(store.getState().editor.compactView).toBe('properties');
  });
});

describe('selectCompactTab', () => {
  it('names the library tab when the library is shown', () => {
    const editor = editorSlice.reducer(initialEditor(), compactTabSelected('blocks'));
    expect(selectCompactTab(editor)).toBe('blocks');
  });

  it('names the canvas otherwise', () => {
    expect(selectCompactTab(initialEditor())).toBe('canvas');
  });

  it('names no tab while properties or design cover the view', () => {
    const properties = editorSlice.reducer(initialEditor(), propertiesOpened());
    expect(selectCompactTab(properties)).toBeNull();
    const design = editorSlice.reducer(initialEditor(), designSheetToggled(true));
    expect(selectCompactTab(design)).toBeNull();
  });
});

describe('saveStatusChanged', () => {
  it('stores the latest save status', () => {
    const editor = editorSlice.reducer(initialEditor(), saveStatusChanged('error'));
    expect(editor.saveStatus).toBe('error');
  });

  it('is reset when another project loads', () => {
    let editor = editorSlice.reducer(initialEditor(), saveStatusChanged('error'));
    const project = createSampleProject();
    editor = editorSlice.reducer(editor, projectLoaded({ project, pageId: null }));
    expect(editor.saveStatus).toBe('saved');
  });
});

describe('reconcileEditor', () => {
  it('returns the same state when the page and selection are still valid', () => {
    const project = createSampleProject();
    const blockId = homePage(project).blockIds[0];
    const editor = { ...initialEditor(), currentPageId: project.pages.homePageId };
    const selected = editorSlice.reducer(editor, blockSelected(blockId));
    expect(reconcileEditor(selected, project)).toBe(selected);
  });

  it('falls back to the home page when the open page was deleted', () => {
    const project = createSampleProject();
    const editor = { ...initialEditor(), currentPageId: 'deleted-page' };
    expect(reconcileEditor(editor, project).currentPageId).toBeNull();
  });

  it('drops a selection that is not on the open page along with its focus request', () => {
    const project = createSampleProject();
    const editor = editorSlice.reducer(
      initialEditor(),
      fieldFocusRequested({ blockId: 'gone', path: 'title' }),
    );
    const reconciled = reconcileEditor(editor, project);
    expect(reconciled.selectedBlockId).toBeNull();
    expect(reconciled.focusRequest).toBeNull();
  });
});

describe('sectionToggled', () => {
  it('remembers whether each section is open, starting with none remembered', () => {
    const store = createTestStore(createSampleProject());
    expect(store.getState().editor.sectionStates).toEqual({});
    store.dispatch(sectionToggled({ id: 'design:presets', isOpen: true }));
    store.dispatch(sectionToggled({ id: 'page:seo', isOpen: false }));
    expect(store.getState().editor.sectionStates).toEqual({
      'design:presets': true,
      'page:seo': false,
    });
  });

  it('is not an undo step', () => {
    const store = createTestStore(createSampleProject());
    store.dispatch(sectionToggled({ id: 'page:seo', isOpen: false }));
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('library drawer', () => {
  it('opens project settings in the library', () => {
    const store = createTestStore();
    store.dispatch(panelToggled('left'));
    store.dispatch(libraryOpened('settings'));
    const editor = store.getState().editor;
    expect(editor.libraryTab).toBe('settings');
    expect(editor.isLibraryDrawerOpen).toBe(true);
    expect(editor.panels.left.collapsed).toBe(false);
  });

  it('starts closed and opens on the Blocks tab when asked to add a block', () => {
    const store = createTestStore();
    store.dispatch(libraryTabChanged('layers'));
    store.dispatch(panelToggled('left'));
    expect(store.getState().editor.isLibraryDrawerOpen).toBe(false);
    store.dispatch(libraryOpened('blocks'));
    const editor = store.getState().editor;
    expect(editor.isLibraryDrawerOpen).toBe(true);
    expect(editor.libraryTab).toBe('blocks');
    expect(editor.compactView).toBe('library');
    expect(editor.panels.left.collapsed).toBe(false);
  });

  it('closes after a block is inserted, a page opens or Preview starts', () => {
    const store = createTestStore();
    const homeId = store.getState().project.pages.homePageId;
    store.dispatch(libraryDrawerToggled(true));
    store.dispatch(blockInserted(homeId, 0, 'cta-centered'));
    expect(store.getState().editor.isLibraryDrawerOpen).toBe(false);
    store.dispatch(libraryDrawerToggled(true));
    store.dispatch(previewToggled(true));
    expect(store.getState().editor.isLibraryDrawerOpen).toBe(false);
    store.dispatch(previewToggled(false));
    store.dispatch(libraryDrawerToggled(true));
    store.dispatch(pageOpened({ pageId: 'other', fromPageId: homeId }));
    expect(store.getState().editor.isLibraryDrawerOpen).toBe(false);
  });
});
