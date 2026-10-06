import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { blockValueSet, pageAdded } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, store } from '../../app/store';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { PagesTab } from './PagesTab';

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

function pageNames(): string[] {
  const { ids, entities } = store.getState().project.pages;
  return ids.map((id) => entities[id]?.name ?? '');
}

function rowOf(container: HTMLElement, name: string): HTMLElement {
  for (const row of container.querySelectorAll<HTMLElement>('.ve-page-row')) {
    if (row.querySelector('.ve-page-name span')?.textContent === name) return row;
  }
  throw new Error(`No page row named ${name}`);
}

function dialog(): HTMLDialogElement {
  const element = document.querySelector('dialog[open]');
  if (!(element instanceof HTMLDialogElement)) throw new Error('No open dialog');
  return element;
}

function submitDialog(): void {
  click(dialog().querySelector('button[type="submit"]'));
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
});

describe('PagesTab', () => {
  it('lists every page with its file name and marks the home page', () => {
    const { container } = render(<PagesTab />);
    expect(rowOf(container, 'Home').querySelector('.ve-page-file')?.textContent).toBe('index.html');
    expect(rowOf(container, 'Home').querySelector('.ve-page-home')).not.toBeNull();
    expect(rowOf(container, 'About').querySelector('.ve-page-file')?.textContent).toBe(
      'about.html',
    );
    expect(rowOf(container, 'Home').querySelector('[aria-current="page"]')).not.toBeNull();
  });

  it('adds a page whose slug follows its name', () => {
    const { container } = render(<PagesTab />);
    click(getButton(container, 'Add page'));
    changeValue(dialog().querySelector('#ve-page-name'), 'Our Team');
    expect(dialog().querySelector('#ve-page-slug')).toHaveProperty('value', 'our-team');
    submitDialog();
    expect(pageNames()).toEqual(['Home', 'About', 'Our Team']);
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('explains a slug that is already taken and keeps the dialog open', () => {
    const { container } = render(<PagesTab />);
    click(getButton(container, 'Add page'));
    changeValue(dialog().querySelector('#ve-page-name'), 'Company');
    changeValue(dialog().querySelector('#ve-page-slug'), 'about');
    expect(dialog().textContent).toContain('Another page already uses this slug');
    submitDialog();
    expect(pageNames()).toEqual(['Home', 'About']);
    expect(document.querySelector('dialog[open]')).not.toBeNull();
  });

  it('asks for a name before adding a page', () => {
    const { container } = render(<PagesTab />);
    click(getButton(container, 'Add page'));
    submitDialog();
    expect(dialog().textContent).toContain('Enter a page name');
  });

  it('starts a new page as a copy of another page', () => {
    const { container } = render(<PagesTab />);
    const homeBlockCount = homePage(store.getState().project).blockIds.length;
    click(getButton(container, 'Add page'));
    changeValue(dialog().querySelector('#ve-page-name'), 'Landing');
    changeValue(
      dialog().querySelector('#ve-page-source'),
      store.getState().project.pages.homePageId,
    );
    submitDialog();
    const { ids, entities } = store.getState().project.pages;
    const landing = entities[ids[1]];
    expect(landing?.name).toBe('Landing');
    expect(landing?.blockIds).toHaveLength(homeBlockCount);
  });

  it('renames a page and its slug from the row menu', () => {
    const { container } = render(<PagesTab />);
    click(getButton(rowOf(container, 'About'), 'Rename…'));
    changeValue(dialog().querySelector('#ve-page-name'), 'Company');
    changeValue(dialog().querySelector('#ve-page-slug'), 'company');
    submitDialog();
    expect(store.getState().project.pages.entities.about).toMatchObject({
      name: 'Company',
      slug: 'company',
    });
  });

  it('sets the home page and reorders pages from the row menu', () => {
    const { container } = render(<PagesTab />);
    click(getButton(rowOf(container, 'About'), 'Set as home page'));
    expect(store.getState().project.pages.homePageId).toBe('about');
    click(getButton(rowOf(container, 'About'), 'Move up'));
    expect(pageNames()).toEqual(['About', 'Home']);
    expect(getButton(rowOf(container, 'About'), 'Move up').disabled).toBe(true);
  });

  it('only lets pages other than the home page be deleted, after confirming', () => {
    const { container } = render(<PagesTab />);
    expect(getButton(rowOf(container, 'Home'), 'Delete…').disabled).toBe(true);
    click(getButton(rowOf(container, 'About'), 'Delete…'));
    expect(dialog().textContent).toContain('Delete “About”?');
    click(getButton(dialog(), 'Delete page'));
    expect(pageNames()).toEqual(['Home']);
  });

  it('warns about links that point to the page before deleting it', () => {
    const heroId = homePage(store.getState().project).blockIds[1];
    runInAct(() =>
      dispatch(
        blockValueSet(
          heroId,
          'primaryButton',
          {
            label: 'About',
            link: { type: 'page', pageId: 'about', newTab: false },
            variant: 'primary',
          },
          'discrete',
        ),
      ),
    );
    const { container } = render(<PagesTab />);
    click(getButton(rowOf(container, 'About'), 'Delete…'));
    expect(dialog().querySelector('[role="note"]')?.textContent).toContain(
      'Home › Hero, centered text › Primary button',
    );
  });

  it('opens page settings by clearing the block selection', () => {
    const { container } = render(<PagesTab />);
    const heroId = homePage(store.getState().project).blockIds[1];
    runInAct(() => dispatch(blockSelected(heroId)));
    click(getButton(rowOf(container, 'Home'), 'Page settings'));
    expect(store.getState().editor.selectedBlockId).toBeNull();
    expect(selectCurrentPage(store.getState()).name).toBe('Home');
  });
});
