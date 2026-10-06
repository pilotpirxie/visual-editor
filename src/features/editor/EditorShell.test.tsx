import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compactTabSelected, panelToggled } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { click, getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { CompactTabs } from './CompactTabs';
import { EditorShell } from './EditorShell';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function expandBothPanels(): void {
  const { left, right } = store.getState().editor.panels;
  if (left.collapsed) dispatch(panelToggled('left'));
  if (right.collapsed) dispatch(panelToggled('right'));
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  loadIntoAppStore();
  expandBothPanels();
  dispatch(compactTabSelected('canvas'));
});

describe('CompactTabs', () => {
  it('offers the four editor views and marks the current one', () => {
    const { container } = render(<CompactTabs />);
    const labels = [...container.querySelectorAll('button')].map((button) => button.textContent);
    expect(labels).toEqual(['Blocks', 'Layers', 'Canvas', 'Properties']);
    expect(getButton(container, 'Canvas').getAttribute('aria-current')).toBe('page');
  });

  it('opens the library on the chosen tab', () => {
    const { container } = render(<CompactTabs />);
    click(getButton(container, 'Layers'));
    expect(store.getState().editor.compactView).toBe('library');
    expect(store.getState().editor.libraryTab).toBe('layers');
    expect(getButton(container, 'Layers').getAttribute('aria-current')).toBe('page');
    expect(getButton(container, 'Canvas').hasAttribute('aria-current')).toBe(false);
  });
});

describe('EditorShell', () => {
  it('exposes the current compact view and panel widths to the layout', () => {
    const { container } = render(<EditorShell />);
    const shell = container.querySelector<HTMLElement>('.ve-shell');
    expect(shell?.dataset.compactView).toBe('canvas');
    expect(shell?.style.getPropertyValue('--ve-left-width')).toBe('280px');
    expect(shell?.style.getPropertyValue('--ve-right-width')).toBe('320px');
  });

  it('keeps a collapsed panel mounted so its state survives', () => {
    const { container } = render(<EditorShell />);
    runInAct(() => dispatch(panelToggled('left')));
    const shell = container.querySelector<HTMLElement>('.ve-shell');
    expect(shell?.dataset.leftCollapsed).toBe('true');
    expect(shell?.style.getPropertyValue('--ve-left-width')).toBe('0px');
    expect(container.querySelector('.ve-library')).not.toBeNull();
  });

  it('switches the compact view from the tab bar', () => {
    const { container } = render(<EditorShell />);
    click(getButton(container, 'Properties'));
    expect(container.querySelector<HTMLElement>('.ve-shell')?.dataset.compactView).toBe(
      'properties',
    );
  });
});
