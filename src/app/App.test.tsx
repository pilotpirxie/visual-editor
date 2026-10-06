import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProject } from '../persistence/db';
import { render } from '../test/dom';
import { App } from './App';
import { createSampleProject } from './projectFactory';
import { store } from './store';

vi.mock('../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
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
    expect(await heading(container)).toBe("Couldn't open this project");
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
});
