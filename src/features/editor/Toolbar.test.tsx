import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blockSelected,
  deviceChanged,
  dialogClosed,
  linkedFileChanged,
  linkedFileOutdated,
  panelToggled,
  previewToggled,
  saveStatusChanged,
} from '../../app/editorSlice';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { choiceInput, click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { EditorDialogs } from './EditorDialogs';
import { Toolbar } from './Toolbar';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

beforeEach(() => {
  loadIntoAppStore();
  dispatch(dialogClosed());
  dispatch(deviceChanged('desktop'));
  dispatch(previewToggled(false));
  if (store.getState().editor.panels.left.collapsed) dispatch(panelToggled('left'));
});

describe('Toolbar', () => {
  it('lists the device modes as icons labelled with their widths and switches between them', () => {
    const { container } = render(<Toolbar />);
    const device = container.querySelector('fieldset.ve-device-toggle');
    expect(device?.querySelector('legend')?.textContent).toBe('Device');
    const labels: string[] = [];
    for (const label of device?.querySelectorAll('label') ?? []) {
      expect(label.querySelector('svg')).not.toBeNull();
      labels.push(label.textContent ?? '');
    }
    expect(labels).toEqual([
      'Responsive',
      'Desktop (1440 px)',
      'Tablet (768 px)',
      'Phone (375 px)',
    ]);
    expect(choiceInput(container, 'Desktop (1440 px)')?.checked).toBe(true);
    click(choiceInput(container, 'Phone (375 px)'));
    expect(store.getState().editor.device).toBe('phone');
    click(choiceInput(container, 'Responsive'));
    expect(store.getState().editor.device).toBe('responsive');
  });

  it('shows the project name and a quiet save state that follows autosave', () => {
    const { container } = render(
      <>
        <Toolbar />
        <EditorDialogs />
      </>,
    );
    const name = container.querySelector<HTMLButtonElement>('.ve-project-name');
    expect(name?.textContent).toBe('Fieldnote');
    expect(name?.getAttribute('aria-label')).toBe('Fieldnote, project settings');
    const saveState = container.querySelector('.ve-save-state');
    runInAct(() => dispatch(saveStatusChanged('saving')));
    expect(saveState?.getAttribute('aria-label')).toBe('Saving…');
    runInAct(() => dispatch(saveStatusChanged('error')));
    expect(saveState?.getAttribute('data-status')).toBe('error');
    expect(saveState?.getAttribute('aria-label')).toBe('Changes not saved');
    runInAct(() => dispatch(saveStatusChanged('saved')));
    expect(saveState?.getAttribute('aria-label')).toBe('All changes saved');
    expect(container.querySelector('[role="status"]')).toBeNull();
    click(name);
    expect(store.getState().editor.openDialog).toEqual({ kind: 'settings' });
  });

  it('opens the project settings from the File menu', async () => {
    const { container } = render(
      <>
        <Toolbar />
        <EditorDialogs />
      </>,
    );
    const fileMenu = container.querySelector('[role="menu"][aria-label="File"]');
    if (fileMenu === null) throw new Error('Expected the File menu');
    click(getButton(fileMenu, 'Project settings…'));
    await vi.waitFor(() =>
      expect(container.querySelector('#ve-project-settings-title')?.textContent).toBe(
        'Project settings',
      ),
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
    const { container } = render(
      <>
        <Toolbar />
        <EditorDialogs />
      </>,
    );
    click(getButton(container, 'Export'));
    await vi.waitFor(() =>
      expect(container.querySelector('#ve-export-title')?.textContent).toBe('Export site'),
    );
    await vi.waitFor(() => expect(container.textContent).toContain('files,'));
  });
});
