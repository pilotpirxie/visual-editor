import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../app/types';
import { putProject } from '../../persistence/db';
import { BUILTIN_PRESETS } from '../../presets/presets';
import { changeValue, click, getButton, render } from '../../test/dom';
import { NewProjectDialog } from './NewProjectDialog';

const STARTERS_LOAD_TIMEOUT_MS = 5000;

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
}));

const MIDNIGHT = BUILTIN_PRESETS[1];

type Deferred = { promise: Promise<void>; resolve(): void };

function deferred(): Deferred {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function renderDialog(onClose: () => void = () => {}): Promise<HTMLDivElement> {
  const { container } = render(<NewProjectDialog onClose={onClose} />);
  await Promise.resolve();
  return container;
}

function savedProjects(): Project[] {
  const projects: Project[] = [];
  for (const call of vi.mocked(putProject).mock.calls) projects.push(call[0]);
  return projects;
}

function presetButtons(container: HTMLElement): HTMLButtonElement[] {
  const buttons: HTMLButtonElement[] = [];
  for (const button of container.querySelectorAll<HTMLButtonElement>('.ve-preset-row button')) {
    buttons.push(button);
  }
  return buttons;
}

function presetLabels(container: HTMLElement): string[] {
  const labels: string[] = [];
  for (const button of presetButtons(container))
    labels.push(button.getAttribute('aria-label') ?? '');
  return labels;
}

function starterNames(container: HTMLElement): string[] {
  const names: string[] = [];
  for (const name of container.querySelectorAll('.ve-starter-name')) {
    names.push(name.textContent ?? '');
  }
  return names;
}

function nameInput(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>('#ve-new-project-name');
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('NewProjectDialog presets', () => {
  it('lists every built-in preset as a row that starts a project', async () => {
    const container = await renderDialog();
    const expected: string[] = [];
    for (const preset of BUILTIN_PRESETS) expected.push(`Start with ${preset.name}`);
    expect(presetLabels(container)).toEqual(expected);
    expect(container.querySelector('.ve-preset-list')?.getAttribute('aria-label')).toBe(
      'Design presets',
    );
  });
});

describe('NewProjectDialog blank projects', () => {
  it('starts a blank project with the design system of the chosen preset', async () => {
    const onClose = vi.fn();
    const container = await renderDialog(onClose);
    click(getButton(container, 'Start with Midnight'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    const created = savedProjects()[0];
    expect(created.designSystem.presetId).toBe('midnight');
    expect(created.designSystem.iconSet).toBe(MIDNIGHT.designSystem.iconSet);
    expect(created.designSystem.tokens['--color-background']).toEqual(
      MIDNIGHT.designSystem.tokens['--color-background'],
    );
    expect(created.blocks.ids).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe(`/p/${created.id}/${created.pages.homePageId}`);
  });

  it('names the project after the trimmed site name', async () => {
    const container = await renderDialog();
    changeValue(nameInput(container), '  Harbor Bakery  ');
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].settings.title).toBe('Harbor Bakery');
  });

  it('falls back to the default name when the site name is only spaces', async () => {
    const container = await renderDialog();
    changeValue(nameInput(container), '   ');
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].settings.title).toBe('Untitled site');
  });

  it('disables every preset while the project is being created', async () => {
    const saving = deferred();
    vi.mocked(putProject).mockReturnValueOnce(saving.promise);
    const onClose = vi.fn();
    const container = await renderDialog(onClose);
    click(getButton(container, 'Start with Clean'));
    for (const button of presetButtons(container)) expect(button.disabled).toBe(true);
    click(getButton(container, 'Start with Midnight'));
    expect(putProject).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    saving.resolve();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('stays open, explains and enables the presets again when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(putProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    const onClose = vi.fn();
    const container = await renderDialog(onClose);
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        'Could not create a project: Quota exceeded',
      ),
    );
    for (const button of presetButtons(container)) expect(button.disabled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });

  it('clears the previous error when the user tries again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(putProject).mockRejectedValueOnce(new Error('Quota exceeded'));
    const container = await renderDialog();
    click(getButton(container, 'Start with Clean'));
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    click(getButton(container, 'Start with Clean'));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(2));
  });
});

describe('NewProjectDialog tabs', () => {
  it('starts on the Blank tab and switches to Starters', async () => {
    const container = await renderDialog();
    expect(getButton(container, 'Blank').getAttribute('aria-selected')).toBe('true');
    expect(nameInput(container)?.placeholder).toBe('Untitled site');
    click(getButton(container, 'Starters'));
    expect(getButton(container, 'Starters').getAttribute('aria-selected')).toBe('true');
    expect(getButton(container, 'Blank').getAttribute('aria-selected')).toBe('false');
    expect(nameInput(container)?.placeholder).toBe('The starter’s name');
    expect(presetButtons(container)).toEqual([]);
  });

  it('names a starter project after the typed site name instead of the starter title', async () => {
    const container = await renderDialog();
    changeValue(nameInput(container), 'Orbit for Teams');
    click(getButton(container, 'Starters'));
    click(
      await vi.waitFor(() => getButton(container, 'Use the Startup waitlist starter'), {
        timeout: STARTERS_LOAD_TIMEOUT_MS,
      }),
    );
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(savedProjects()[0].settings.title).toBe('Orbit for Teams');
    expect(savedProjects()[0].starterId).toBe('waitlist');
  });

  it('filters the starters by use case', async () => {
    const container = await renderDialog();
    click(getButton(container, 'Starters'));
    await vi.waitFor(() => expect(starterNames(container)).toHaveLength(8), {
      timeout: STARTERS_LOAD_TIMEOUT_MS,
    });
    click(container.querySelector('.ve-starter-filter [title="Personal"] input'));
    expect(starterNames(container)).toEqual(['Portfolio']);
    click(container.querySelector('.ve-starter-filter [title="Local and events"] input'));
    expect(starterNames(container)).toEqual(['Event or conference', 'Restaurant or cafe']);
    click(container.querySelector('.ve-starter-filter [title="All"] input'));
    expect(starterNames(container)).toHaveLength(8);
  });

  it('closes without creating anything on Cancel', async () => {
    const onClose = vi.fn();
    const container = await renderDialog(onClose);
    click(getButton(container, 'Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(putProject).not.toHaveBeenCalled();
  });
});
