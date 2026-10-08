import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../app/store';
import { changeValue, render } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { ProjectSettingsPanel } from './ProjectSettingsPanel';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

beforeEach(() => {
  loadIntoAppStore();
});

function input(container: HTMLElement, selector: string): Element | null {
  return container.ownerDocument.querySelector(selector);
}

function settings() {
  return store.getState().project.settings;
}

describe('ProjectSettingsPanel', () => {
  it('changes the site title, description, language and title template as the user types', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-field-project-title'), 'Acme');
    changeValue(input(container, '#ve-field-project-description'), 'Research, tagged.');
    changeValue(input(container, '#ve-field-project-language'), 'pl');
    changeValue(input(container, '#ve-field-project-title-template'), '{{page.title}} – Acme');
    expect(settings()).toMatchObject({
      title: 'Acme',
      description: 'Research, tagged.',
      language: 'pl',
      titleTemplate: '{{page.title}} – Acme',
    });
  });

  it('keeps an empty title as a draft with a message', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-field-project-title'), '');
    expect(settings().title).toBe('Fieldnote');
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'This field is required',
    );
  });

  it('groups the settings into collapsible Site and Search and sharing sections', () => {
    const { container } = render(<ProjectSettingsPanel />);
    const titles: string[] = [];
    for (const title of container.querySelectorAll('.ui-section-title')) {
      titles.push(title.textContent ?? '');
    }
    expect(titles).toEqual(['Site', 'Search and sharing']);
    expect(container.querySelector('.ui-section')?.tagName.toLowerCase()).toBe('details');
  });

  it('stores a valid base URL and explains an invalid one', () => {
    const { container } = render(<ProjectSettingsPanel />);
    const baseUrl = input(container, '#ve-project-base-url');
    changeValue(baseUrl, 'acme.example');
    expect(settings().baseUrl).toBeUndefined();
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'Enter a full address that starts with https://',
    );
    changeValue(baseUrl, 'https://acme.example');
    expect(settings().baseUrl).toBe('https://acme.example');
  });
});
