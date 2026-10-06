import { beforeEach, describe, expect, it, vi } from 'vitest';
import { panelToggled } from '../../app/editorSlice';
import { pageAdded } from '../../app/projectSlice';
import { navigate } from '../../app/router';
import { dispatch, store } from '../../app/store';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { PageSwitcher } from './PageSwitcher';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

vi.mock('../../app/router', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../app/router')>();
  return { ...original, navigate: vi.fn() };
});

function addPages(count: number, firstNumber = 1): void {
  runInAct(() => {
    for (let index = firstNumber; index < firstNumber + count; index += 1) {
      dispatch(pageAdded({ id: `page-${index}`, name: `Page ${index}`, slug: `page-${index}` }));
    }
  });
}

function listedPages(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.ve-page-switcher-list button > span:first-child')].map(
    (name) => name.textContent ?? '',
  );
}

beforeEach(() => {
  loadIntoAppStore();
  vi.mocked(navigate).mockClear();
});

describe('PageSwitcher', () => {
  it('shows the current page and lists every page with the current one marked', () => {
    addPages(2);
    const { container } = render(<PageSwitcher />);
    expect(container.querySelector('.ve-page-switcher-name')?.textContent).toBe('Home');
    expect(listedPages(container)).toEqual(['Home', 'Page 1', 'Page 2']);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('Home');
  });

  it('opens another page', () => {
    addPages(1);
    const { container } = render(<PageSwitcher />);
    click(container.querySelectorAll('.ve-page-switcher-list button')[1]);
    expect(navigate).toHaveBeenCalledWith(`/p/${store.getState().project.id}/page-1`);
  });

  it('offers a search box only once a project has more than ten pages', () => {
    addPages(9);
    const { container, rerender } = render(<PageSwitcher />);
    expect(container.querySelector('input[type="search"]')).toBeNull();
    addPages(1, 10);
    rerender(<PageSwitcher />);
    changeValue(container.querySelector('input[type="search"]'), 'page 1');
    expect(listedPages(container)).toEqual(['Page 1', 'Page 10']);
  });

  it('adds a page from the menu', () => {
    const { container } = render(<PageSwitcher />);
    click(getButton(container, 'Add page'));
    expect(document.querySelector('dialog[open]')).not.toBeNull();
  });

  it('opens the Pages tab, showing the library panel if it was hidden', () => {
    if (!store.getState().editor.panels.left.collapsed)
      runInAct(() => dispatch(panelToggled('left')));
    const { container } = render(<PageSwitcher />);
    click(getButton(container, 'Manage pages'));
    expect(store.getState().editor.libraryTab).toBe('pages');
    expect(store.getState().editor.panels.left.collapsed).toBe(false);
  });
});
