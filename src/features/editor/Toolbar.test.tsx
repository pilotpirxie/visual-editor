import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceChanged, panelToggled, saveStatusChanged } from '../../app/editorSlice';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { downloadFiles } from '../export/downloadFiles';
import { deviceReadout, Toolbar } from './Toolbar';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

vi.mock('../export/downloadFiles', () => ({ downloadFiles: vi.fn(async () => {}) }));

beforeEach(() => {
  loadIntoAppStore();
  dispatch(deviceChanged('desktop'));
  if (store.getState().editor.panels.left.collapsed) dispatch(panelToggled('left'));
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

  it('shows the save status', () => {
    const { container } = render(<Toolbar />);
    runInAct(() => dispatch(saveStatusChanged('error')));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Not saved');
  });

  it('exports the current project as files', async () => {
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Export'));
    await vi.waitFor(() => expect(downloadFiles).toHaveBeenCalledOnce());
    const files = vi.mocked(downloadFiles).mock.calls[0][0];
    expect(Object.keys(files)).toContain('index.html');
  });

  it('tells the user when the export fails', async () => {
    vi.mocked(downloadFiles).mockRejectedValueOnce(new Error('Disk is full'));
    const alerts: string[] = [];
    vi.spyOn(window, 'alert').mockImplementation((message) => {
      alerts.push(String(message));
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Toolbar />);
    click(getButton(container, 'Export'));
    await vi.waitFor(() => expect(alerts).toEqual(['Export failed: Disk is full']));
  });
});
