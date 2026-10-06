import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import { createTestStore, homePage } from '../test/fixtures';
import {
  blockSelected,
  compactTabSelected,
  deviceChanged,
  editorSlice,
  fieldFocusRequested,
  focusRequestHandled,
  libraryTabChanged,
  panelResized,
  panelToggled,
  reconcileEditor,
  saveStatusChanged,
  selectCompactTab,
  type EditorState,
} from './editorSlice';
import { blockInserted, projectLoaded } from './projectSlice';

function initialEditor(): EditorState {
  return editorSlice.reducer(undefined, { type: 'init' });
}

describe('editorSlice initial state', () => {
  it('opens on desktop with both panels at their default widths and the canvas view', () => {
    const editor = initialEditor();
    expect(editor.device).toBe('desktop');
    expect(editor.panels.left).toEqual({ width: 280, collapsed: false });
    expect(editor.panels.right).toEqual({ width: 320, collapsed: false });
    expect(editor.compactView).toBe('canvas');
    expect(editor.saveStatus).toBe('saved');
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

  it('shows the canvas or the properties view directly', () => {
    let editor = editorSlice.reducer(initialEditor(), compactTabSelected('properties'));
    expect(editor.compactView).toBe('properties');
    editor = editorSlice.reducer(editor, compactTabSelected('canvas'));
    expect(editor.compactView).toBe('canvas');
  });

  it('switches from the library to the canvas after a block is inserted', () => {
    const store = createTestStore();
    store.dispatch(compactTabSelected('blocks'));
    store.dispatch(blockInserted(store.getState().project.pages.homePageId, 0, 'cta-centered'));
    expect(store.getState().editor.compactView).toBe('canvas');
  });

  it('stays on properties when a block is inserted from elsewhere', () => {
    const store = createTestStore();
    store.dispatch(compactTabSelected('properties'));
    store.dispatch(blockInserted(store.getState().project.pages.homePageId, 0, 'cta-centered'));
    expect(store.getState().editor.compactView).toBe('properties');
  });
});

describe('selectCompactTab', () => {
  it('names the library tab when the library is shown', () => {
    const editor = editorSlice.reducer(initialEditor(), compactTabSelected('blocks'));
    expect(selectCompactTab(editor)).toBe('blocks');
  });

  it('names the view itself otherwise', () => {
    expect(selectCompactTab(initialEditor())).toBe('canvas');
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
