import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProject } from '../persistence/db';
import { render, runInAct } from '../test/dom';
import { App } from './App';
import { createPage, createSampleProject } from './projectFactory';
import { pageRemoved } from './projectSlice';
import { navigate } from './router';
import { dispatch, selectCurrentPage, store } from './store';
import type { Project } from './types';

vi.mock('../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  listSavedBlocks: vi.fn(async () => []),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function openPath(path: string): void {
  window.history.replaceState(null, '', path);
}

async function heading(container: HTMLElement): Promise<string> {
  await vi.waitFor(() => {
    if (container.querySelector('h1, .ve-toolbar') === null) throw new Error('Still opening');
  });
  return container.querySelector('h1')?.textContent ?? '';
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function projectWithAbout(): Project {
  const project = createSampleProject();
  const about = createPage('about-page', 'About', 'about');
  return {
    ...project,
    pages: {
      ...project.pages,
      ids: [...project.pages.ids, about.id],
      entities: { ...project.pages.entities, [about.id]: about },
    },
  };
}

async function openEditor(project: Project, pageId: string): Promise<HTMLElement> {
  vi.mocked(getProject).mockResolvedValueOnce(project);
  openPath(`/p/${project.id}/${pageId}`);
  const { container } = render(<App />);
  await vi.waitFor(() => expect(container.querySelector('.ve-toolbar')).not.toBeNull());
  return container;
}

describe('App', () => {
  it('shows the project list at the root address', async () => {
    openPath('/');
    const { container } = render(<App />);
    expect(await heading(container)).toBe('My projects');
  });

  it('shows a not found page for unknown addresses', async () => {
    openPath('/settings/unknown');
    const { container } = render(<App />);
    expect(await heading(container)).toBe('Page not found');
  });

  it('explains when the project does not exist in this browser', async () => {
    openPath('/p/missing-project');
    const { container } = render(<App />);
    expect(await heading(container)).toBe('Project not found');
  });

  it('explains when the project cannot be read', async () => {
    vi.mocked(getProject).mockRejectedValueOnce(
      new Error('Project p1 was saved in an unsupported format'),
    );
    openPath('/p/p1');
    const { container } = render(<App />);
    expect(await heading(container)).toBe('Couldn’t open this project');
    expect(container.textContent).toContain('Project p1 was saved in an unsupported format');
  });

  it('opens the editor on the home page when the address names an unknown page', async () => {
    const project = createSampleProject();
    vi.mocked(getProject).mockResolvedValueOnce(project);
    openPath(`/p/${project.id}/not-a-page`);
    const { container } = render(<App />);
    await vi.waitFor(() => expect(container.querySelector('.ve-toolbar')).not.toBeNull());
    expect(window.location.pathname).toBe(`/p/${project.id}/${project.pages.homePageId}`);
    expect(store.getState().project.id).toBe(project.id);
  });

  it('opens the page named in the address', async () => {
    const project = projectWithAbout();
    await openEditor(project, 'about-page');
    expect(selectCurrentPage(store.getState()).id).toBe('about-page');
  });

  it('follows the address to another page without reloading the project', async () => {
    const project = projectWithAbout();
    await openEditor(project, project.pages.homePageId);
    runInAct(() => navigate(`/p/${project.id}/about-page`));
    await vi.waitFor(() => expect(selectCurrentPage(store.getState()).id).toBe('about-page'));
    expect(getProject).toHaveBeenCalledTimes(1);
  });

  it('moves the address to the home page when the open page is deleted', async () => {
    const project = projectWithAbout();
    await openEditor(project, 'about-page');
    runInAct(() => dispatch(pageRemoved({ pageId: 'about-page' })));
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe(`/p/${project.id}/${project.pages.homePageId}`),
    );
  });
});
