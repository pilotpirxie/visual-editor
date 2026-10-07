import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import type { Project } from '../../app/types';
import {
  deleteProject,
  getProject,
  listProjects,
  putProject,
  type ProjectSummary,
} from '../../persistence/db';
import { blur, changeValue, click, getButton, pressKey, render } from '../../test/dom';
import { HomeScreen } from './HomeScreen';

const STARTERS_LOAD_TIMEOUT_MS = 5000;

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
  listUserPresets: vi.fn(async () => []),
}));

const stored = createSampleProject();
const summary: ProjectSummary = {
  id: stored.id,
  title: 'Fieldnote',
  updatedAt: new Date().toISOString(),
};

async function renderHome(): Promise<HTMLDivElement> {
  const { container } = render(<HomeScreen />);
  await act(async () => {
    await Promise.resolve();
  });
  await vi.waitFor(() => {
    if (container.textContent?.includes('Loading')) throw new Error('Still loading');
  });
  return container;
}

function savedProjects(): Project[] {
  const projects: Project[] = [];
  for (const call of vi.mocked(putProject).mock.calls) projects.push(call[0]);
  return projects;
}

function renameInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Project name"]');
  if (input === null) throw new Error('The rename field is not open');
  return input;
}

beforeEach(() => {
  vi.mocked(listProjects).mockResolvedValue([summary]);
  vi.mocked(getProject).mockResolvedValue(stored);
  window.history.replaceState(null, '', '/');
});

describe('HomeScreen', () => {
  it('lists saved projects with when they were last edited', async () => {
    const container = await renderHome();
    expect(container.querySelector('.ve-home-card-title')?.textContent).toBe('Fieldnote');
    expect(container.textContent).toContain('Edited just now');
  });

  it('invites the user to create a first project when there are none', async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    const container = await renderHome();
    expect(container.textContent).toContain('You have no projects yet.');
  });

  it('explains when the projects cannot be read and lets the user try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listProjects).mockRejectedValueOnce(new Error('Could not open browser storage'));
    const container = await renderHome();
    expect(container.querySelector('[role="alert"] p')?.textContent).toBe(
      'Could not open browser storage',
    );
    click(getButton(container, 'Try again'));
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).toBeNull());
  });

  it('creates a blank project with the chosen preset and opens it', async () => {
    const container = await renderHome();
    click(getButton(container, 'New project'));
    click(await vi.waitFor(() => getButton(container, 'Start with Midnight')));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    const created = savedProjects()[0];
    expect(created.settings.title).toBe('Untitled site');
    expect(created.designSystem.presetId).toBe('midnight');
    expect(created.blocks.ids).toEqual([]);
    expect(window.location.pathname).toBe(`/p/${created.id}/${created.pages.homePageId}`);
  });

  it('names a new project with the site name the user typed', async () => {
    const container = await renderHome();
    click(getButton(container, 'New project'));
    changeValue(container.querySelector('#ve-new-project-name'), '  Harbor Bakery  ');
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].settings.title).toBe('Harbor Bakery');
  });

  it('starts a project from a starter as a copy with new ids', async () => {
    const container = await renderHome();
    click(getButton(container, 'New project'));
    click(getButton(container, 'Starters'));
    click(
      await vi.waitFor(() => getButton(container, 'Use the Startup waitlist starter'), {
        timeout: STARTERS_LOAD_TIMEOUT_MS,
      }),
    );
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    const created = savedProjects()[0];
    expect(created.starterId).toBe('waitlist');
    expect(created.settings.title).toBe('Orbit');
    expect(created.blocks.ids.length).toBeGreaterThan(0);
    expect(window.location.pathname).toBe(`/p/${created.id}/${created.pages.homePageId}`);
  });

  it('keeps the dialog open and explains when a new project cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(putProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    const container = await renderHome();
    click(getButton(container, 'New project'));
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        'Could not create a project: Quota exceeded',
      ),
    );
    expect(getButton(container, 'Start with Clean').disabled).toBe(false);
    expect(window.location.pathname).toBe('/');
  });

  it('renames a project with Enter and puts focus back on the rename button', async () => {
    const container = await renderHome();
    click(getButton(container, 'Rename Fieldnote'));
    const input = renameInput(container);
    input.value = '  Fieldnote 2  ';
    pressKey(input, 'Enter');
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].settings.title).toBe('Fieldnote 2');
    expect(document.activeElement).toBe(getButton(container, 'Rename Fieldnote'));
  });

  it('cancels a rename with Escape', async () => {
    const container = await renderHome();
    click(getButton(container, 'Rename Fieldnote'));
    const input = renameInput(container);
    input.value = 'Something else';
    pressKey(input, 'Escape');
    expect(container.querySelector('input[aria-label="Project name"]')).toBeNull();
    expect(putProject).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(getButton(container, 'Rename Fieldnote'));
  });

  it('saves a rename when focus leaves the field, without moving focus', async () => {
    const container = await renderHome();
    click(getButton(container, 'Rename Fieldnote'));
    const input = renameInput(container);
    input.value = 'Renamed on blur';
    blur(input);
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(document.activeElement).not.toBe(getButton(container, 'Rename Fieldnote'));
  });

  it('does not save a rename that keeps the same or an empty title', async () => {
    const container = await renderHome();
    click(getButton(container, 'Rename Fieldnote'));
    pressKey(renameInput(container), 'Enter');
    click(getButton(container, 'Rename Fieldnote'));
    renameInput(container).value = '   ';
    pressKey(renameInput(container), 'Enter');
    expect(putProject).not.toHaveBeenCalled();
  });

  it('duplicates a project under a new id', async () => {
    const container = await renderHome();
    click(getButton(container, 'Duplicate Fieldnote'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].id).not.toBe(stored.id);
    expect(listProjects).toHaveBeenCalledTimes(2);
  });

  it('deletes a project only after the user confirms', async () => {
    const answers = [false, true];
    vi.spyOn(window, 'confirm').mockImplementation(() => answers.shift() ?? false);
    const container = await renderHome();
    click(getButton(container, 'Delete Fieldnote'));
    expect(deleteProject).not.toHaveBeenCalled();
    click(getButton(container, 'Delete Fieldnote'));
    await vi.waitFor(() => expect(deleteProject).toHaveBeenCalledWith(stored.id));
  });
});
