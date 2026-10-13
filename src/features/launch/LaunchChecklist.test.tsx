import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_SETTINGS_STORAGE_KEY } from '../../app/appSettings';
import { dialogClosed } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { click, getButton, render } from '../../test/dom';
import { loadIntoAppStore, withSearchDetails } from '../../test/fixtures';
import { createSampleProject } from '../../app/projectFactory';
import { LaunchChecklist } from './LaunchChecklist';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

beforeEach(() => {
  localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
  loadIntoAppStore(withSearchDetails(createSampleProject()));
  dispatch(dialogClosed());
});

function itemOf(container: HTMLElement, label: string): HTMLElement {
  for (const item of container.querySelectorAll<HTMLElement>('.ve-launch-item')) {
    if (item.textContent?.includes(label) === true) return item;
  }
  throw new Error(`No checklist item "${label}"`);
}

describe('LaunchChecklist', () => {
  it('counts what is done and explains what is left', () => {
    const { container } = render(<LaunchChecklist onClose={() => {}} />);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('4 of 9 done');
    const description = itemOf(container, 'The site has a description');
    expect(description.hasAttribute('data-done')).toBe(true);
    expect(description.querySelector('button')).toBeNull();
    const favicon = itemOf(container, 'The site has a favicon');
    expect(favicon.hasAttribute('data-done')).toBe(false);
    expect(favicon.textContent).toContain('Add the small icon that browsers show in the tab.');
  });

  it('opens Project settings, Pages or Export to fix an item', () => {
    const { container } = render(<LaunchChecklist onClose={() => {}} />);
    click(getButton(itemOf(container, 'The site has a favicon'), 'Fix'));
    expect(store.getState().editor.libraryTab).toBe('settings');
    click(getButton(itemOf(container, 'There is a privacy policy page'), 'Fix'));
    expect(store.getState().editor.libraryTab).toBe('pages');
    click(getButton(itemOf(container, 'The site is online'), 'Fix'));
    expect(store.getState().editor.openDialog).toEqual({ kind: 'export' });
  });

  it('marks the site as online once it was published from this browser', () => {
    const projectId = store.getState().project.id;
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        publishedSites: { [projectId]: { siteId: 's1', url: 'https://one.netlify.app' } },
      }),
    );
    const { container } = render(<LaunchChecklist onClose={() => {}} />);
    expect(itemOf(container, 'The site is online').hasAttribute('data-done')).toBe(true);
  });
});
