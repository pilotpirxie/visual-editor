import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blockSelected,
  deviceChanged,
  panelToggled,
  previewToggled,
  saveStatusChanged,
} from '../../app/editorSlice';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { deviceReadout, linkedFileStatus, Toolbar } from './Toolbar';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

beforeEach(() => {
  loadIntoAppStore();
  dispatch(deviceChanged('desktop'));
  dispatch(previewToggled(false));
  if (store.getState().editor.panels.left.collapsed) dispatch(panelToggled('left'));
});

describe('linkedFileStatus', () => {
  it('says where the project file lives and whether it has unsaved changes', () => {
    const file = { name: 'site.json', savedAt: null, kind: 'file' as const, isAutoSaving: false };
    expect(linkedFileStatus(file, false)).toBe('site.json');
    expect(linkedFileStatus({ ...file, kind: 'download' }, true)).toBe(
      'Downloaded site.json · changes not saved to file',
    );
    expect(linkedFileStatus({ ...file, savedAt: '2026-10-07T10:42:00.000Z' }, false)).toMatch(
      /^site\.json · saved /,
    );
  });
});

describe('deviceReadout', () => {
  it('shows the desktop width and the full phone and tablet screens', () => {
    expect(deviceReadout('desktop')).toBe('1440 px');
    expect(deviceReadout('tablet')).toBe('768 × 1024');
    expect(deviceReadout('phone')).toBe('375 × 812');
  });
});

describe('Toolbar', () => {
  it('switches the preview device and shows its size', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Phone'));
    expect(store.getState().editor.device).toBe('phone');
    expect(getButton(container, 'Phone').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.ve-readout')?.textContent).toBe('375 × 812');
  });

  it('switches to responsive mode, which hides the fixed size readout', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Responsive'));
    expect(store.getState().editor.device).toBe('responsive');
    expect(container.querySelector('.ve-readout')).toBeNull();
  });

  it('opens the project settings from the project title', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Fieldnote'));
    expect(container.querySelector('dialog')?.open).toBe(true);
    expect(container.querySelector('#ve-project-settings-title')?.textContent).toBe(
      'Project settings',
    );
  });

  it('offers block actions in the Edit menu only when a block is selected', () => {
    const { container } = render(<Toolbar />);
    const editMenu = container.querySelector('[role="menu"][aria-label="Edit"]');
    if (editMenu === null) throw new Error('Expected the Edit menu');
    expect(getButton(editMenu, 'Duplicate').hasAttribute('disabled')).toBe(true);
    runInAct(() => dispatch(blockSelected(homePage(store.getState().project).blockIds[1])));
    click(getButton(editMenu, 'Duplicate'));
    expect(homePage(store.getState().project).blockIds).toHaveLength(5);
  });

  it('starts and ends Preview', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Preview'));
    expect(store.getState().editor.isPreview).toBe(true);
    click(getButton(container, 'Exit preview'));
    expect(store.getState().editor.isPreview).toBe(false);
  });

  it('enables undo only when there is something to undo, and undoes on click', () => {
    const { container } = render(<Toolbar />);
    expect(getButton(container, 'Undo').disabled).toBe(true);
    const heroId = homePage(store.getState().project).blockIds[1];
    runInAct(() => dispatch(blockValueSet(heroId, 'title', 'Edited', 'discrete')));
    expect(getButton(container, 'Undo').disabled).toBe(false);
    click(getButton(container, 'Undo'));
    expect(store.getState().history.past).toHaveLength(0);
    expect(getButton(container, 'Redo').disabled).toBe(false);
  });

  it('toggles a side panel and updates its label', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Hide library panel'));
    expect(store.getState().editor.panels.left.collapsed).toBe(true);
    expect(getButton(container, 'Show library panel').getAttribute('aria-pressed')).toBe('false');
  });

  it('opens and closes the design system sheet', () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Design system'));
    expect(store.getState().editor.isDesignSheetOpen).toBe(true);
    expect(getButton(container, 'Design system').getAttribute('aria-pressed')).toBe('true');
    click(getButton(container, 'Design system'));
    expect(store.getState().editor.isDesignSheetOpen).toBe(false);
  });

  it('shows the save status', () => {
    const { container } = render(<Toolbar />);
    runInAct(() => dispatch(saveStatusChanged('error')));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Not saved');
  });

  it('opens the export dialog with the files the site needs', async () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Export'));
    expect(container.querySelector('#ve-export-title')?.textContent).toBe('Export site');
    await vi.waitFor(() => expect(container.textContent).toContain('files,'));
  });
});
