import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blockSelected,
  deviceChanged,
  linkedFileChanged,
  linkedFileOutdated,
  panelToggled,
  previewToggled,
  saveStatusChanged,
} from '../../app/editorSlice';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { Toolbar } from './Toolbar';

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

describe('Toolbar', () => {
  it('lists the device modes with their widths in one select and switches between them', () => {
    const { container } = render(<Toolbar />);
    const device = container.querySelector<HTMLSelectElement>('select[aria-label="Device"]');
    const labels: string[] = [];
    for (const option of device?.options ?? []) labels.push(option.textContent ?? '');
    expect(labels).toEqual([
      'Responsive',
      'Desktop (1440 px)',
      'Tablet (768 px)',
      'Phone (375 px)',
    ]);
    expect(device?.value).toBe('desktop');
    changeValue(device, 'phone');
    expect(store.getState().editor.device).toBe('phone');
    changeValue(device, 'responsive');
    expect(store.getState().editor.device).toBe('responsive');
  });

  it('shows neither the project name nor a save status', () => {
    const { container } = render(<Toolbar />);
    runInAct(() => dispatch(saveStatusChanged('saved')));
    expect(container.textContent).not.toContain('Fieldnote');
    expect(container.textContent).not.toContain('Saved');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('opens the project settings from the File menu', () => {
    const { container } = render(<Toolbar />);
    const fileMenu = container.querySelector('[role="menu"][aria-label="File"]');
    if (fileMenu === null) throw new Error('Expected the File menu');
    click(getButton(fileMenu, 'Project settings…'));
    expect(container.querySelector('#ve-project-settings-title')?.textContent).toBe(
      'Project settings',
    );
  });

  it('marks the File menu when the linked file misses the latest changes', () => {
    const { container } = render(<Toolbar />);
    runInAct(() => {
      dispatch(
        linkedFileChanged({ name: 'site.json', savedAt: null, kind: 'file', isAutoSaving: false }),
      );
      dispatch(linkedFileOutdated());
    });
    const fileButton = container.querySelector('[aria-haspopup="menu"][aria-label^="File"]');
    expect(fileButton?.getAttribute('aria-label')).toBe('File, changes not saved to file');
    expect(fileButton?.querySelector('.ui-menu-dot')).not.toBeNull();
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

  it('opens the export dialog with the files the site needs', async () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Export'));
    expect(container.querySelector('#ve-export-title')?.textContent).toBe('Export site');
    await vi.waitFor(() => expect(container.textContent).toContain('files,'));
  });
});
