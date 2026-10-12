import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageAdded } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import type { Page } from '../../app/types';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { PageDialog } from './PageDialog';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function input(container: HTMLElement, id: string): HTMLInputElement {
  const element = container.querySelector<HTMLInputElement>(`#${id}`);
  if (element === null) throw new Error(`No field with id ${id}`);
  return element;
}

function errorOf(container: HTMLElement, id: string): string | null {
  return container.querySelector(`#${id}-error`)?.textContent ?? null;
}

function pageNamed(name: string): Page | undefined {
  const { pages } = store.getState().project;
  for (const id of pages.ids) {
    const page = pages.entities[id];
    if (page?.name === name) return page;
  }
  return undefined;
}

function openDialog(pageId: string | null, onClose: () => void = () => {}): HTMLDivElement {
  return render(<PageDialog pageId={pageId} onClose={onClose} />).container;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('PageDialog, adding a page', () => {
  it('suggests a slug from the name and adds a blank page that opens', () => {
    const onClose = vi.fn();
    const container = openDialog(null, onClose);
    expect(container.querySelector('h2')?.textContent).toBe('Add page');
    expect(input(container, 've-page-slug').value).toBe('');
    changeValue(input(container, 've-page-name'), 'About us');
    expect(input(container, 've-page-slug').value).toBe('about-us');
    click(getButton(container, 'Add page'));
    const added = pageNamed('About us');
    expect(added).toMatchObject({ slug: 'about-us', blockIds: [] });
    expect(window.location.pathname).toBe(`/p/${store.getState().project.id}/${added?.id}`);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('suggests a slug no other page uses', () => {
    runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
    const container = openDialog(null);
    changeValue(input(container, 've-page-name'), 'About');
    expect(input(container, 've-page-slug').value).toBe('about-2');
  });

  it('keeps a slug that was typed while the name changes', () => {
    const container = openDialog(null);
    changeValue(input(container, 've-page-slug'), 'team');
    changeValue(input(container, 've-page-name'), 'Our people');
    expect(input(container, 've-page-slug').value).toBe('team');
    click(getButton(container, 'Add page'));
    expect(pageNamed('Our people')?.slug).toBe('team');
  });

  it('asks for a name only after the form is sent, and adds nothing without one', () => {
    const onClose = vi.fn();
    const container = openDialog(null, onClose);
    expect(errorOf(container, 've-page-name')).toBeNull();
    const pageCount = store.getState().project.pages.ids.length;
    click(getButton(container, 'Add page'));
    expect(errorOf(container, 've-page-name')).toBe('Enter a page name');
    expect(errorOf(container, 've-page-slug')).toBe('Enter a slug');
    expect(input(container, 've-page-name').getAttribute('aria-describedby')).toBe(
      've-page-name-error',
    );
    expect(store.getState().project.pages.ids).toHaveLength(pageCount);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('treats a name of only spaces as missing', () => {
    const container = openDialog(null);
    changeValue(input(container, 've-page-name'), '   ');
    expect(input(container, 've-page-slug').value).toBe('');
    click(getButton(container, 'Add page'));
    expect(errorOf(container, 've-page-name')).toBe('Enter a page name');
  });

  it('explains a slug that cannot be used as soon as it is typed', () => {
    runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
    const container = openDialog(null);
    changeValue(input(container, 've-page-name'), 'Team');
    expect(errorOf(container, 've-page-slug')).toBeNull();
    changeValue(input(container, 've-page-slug'), 'Our Team');
    expect(errorOf(container, 've-page-slug')).toBe(
      'Use lowercase letters, digits and single hyphens',
    );
    changeValue(input(container, 've-page-slug'), 'about');
    expect(errorOf(container, 've-page-slug')).toBe('Another page already uses this slug');
    click(getButton(container, 'Add page'));
    expect(pageNamed('Team')).toBeUndefined();
  });

  it('starts a page as a copy of another page when asked', () => {
    const home = homePage(store.getState().project);
    const container = openDialog(null);
    const source = container.querySelector<HTMLSelectElement>('#ve-page-source');
    const labels = [...(source?.options ?? [])].map((option) => option.textContent);
    expect(labels).toEqual(['Blank page', `Duplicate of ${home.name}`]);
    changeValue(input(container, 've-page-name'), 'Landing');
    changeValue(source, home.id);
    click(getButton(container, 'Add page'));
    expect(pageNamed('Landing')?.blockIds).toHaveLength(home.blockIds.length);
  });

  it('adds nothing when cancelled', () => {
    const onClose = vi.fn();
    const container = openDialog(null, onClose);
    changeValue(input(container, 've-page-name'), 'About us');
    click(getButton(container, 'Cancel'));
    expect(pageNamed('About us')).toBeUndefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PageDialog, renaming a page', () => {
  beforeEach(() => {
    runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
  });

  it('starts from the name and slug of the page and offers no copy', () => {
    const container = openDialog('about');
    expect(container.querySelector('h2')?.textContent).toBe('Rename page');
    expect(input(container, 've-page-name').value).toBe('About');
    expect(input(container, 've-page-slug').value).toBe('about');
    expect(container.querySelector('#ve-page-source')).toBeNull();
    expect(errorOf(container, 've-page-slug')).toBeNull();
  });

  it('saves a new name and keeps the slug', () => {
    const onClose = vi.fn();
    const container = openDialog('about', onClose);
    changeValue(input(container, 've-page-name'), 'Our story');
    click(getButton(container, 'Save'));
    expect(store.getState().project.pages.entities.about).toMatchObject({
      name: 'Our story',
      slug: 'about',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets the page keep its own slug but not take another page’s', () => {
    const home = homePage(store.getState().project);
    const container = openDialog('about');
    changeValue(input(container, 've-page-slug'), home.slug);
    click(getButton(container, 'Save'));
    expect(store.getState().project.pages.entities.about?.slug).toBe('about');
    expect(errorOf(container, 've-page-slug')).not.toBeNull();
  });

  it('adds a page when the page to rename is gone', () => {
    const container = openDialog('missing');
    expect(container.querySelector('h2')?.textContent).toBe('Add page');
    expect(getButton(container, 'Add page').disabled).toBe(false);
  });
});
