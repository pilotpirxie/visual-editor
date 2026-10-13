import { beforeEach, describe, expect, it, vi } from 'vitest';
import { undo } from '../../app/history';
import { store } from '../../app/store';
import { blur, changeValue, click, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { ProjectSettingsPanel } from './ProjectSettingsPanel';
import type { ProjectSettings } from '../../app/types';

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

function settings(): ProjectSettings {
  return store.getState().project.settings;
}

describe('ProjectSettingsPanel', () => {
  it('changes the site title, description, language and title template as the user types', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-field-project-title'), 'Acme');
    changeValue(input(container, '#ve-field-project-description'), 'Research, tagged.');
    changeValue(input(container, '#ve-field-project-language'), 'pl');
    changeValue(input(container, '#ve-field-project-title-template'), '{{page.title}} - Acme');
    expect(settings()).toMatchObject({
      title: 'Acme',
      description: 'Research, tagged.',
      language: 'pl',
      titleTemplate: '{{page.title}} - Acme',
    });
  });

  it('keeps a space typed at the end of the title while the stored title stays trimmed', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-field-project-title'), 'My ');
    expect(input(container, '#ve-field-project-title')).toHaveProperty('value', 'My ');
    expect(settings().title).toBe('My');
    changeValue(input(container, '#ve-field-project-title'), 'My site');
    expect(settings().title).toBe('My site');
    runInAct(() => store.dispatch(undo()));
    expect(input(container, '#ve-field-project-title')).toHaveProperty('value', 'Fieldnote');
  });

  it('keeps an empty title as a draft with a message', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-field-project-title'), '');
    expect(settings().title).toBe('Fieldnote');
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'This field is required',
    );
  });

  it('groups the settings into collapsible sections with the first two open', () => {
    const { container } = render(<ProjectSettingsPanel />);
    const titles: string[] = [];
    const openTitles: string[] = [];
    for (const section of container.querySelectorAll('details.ui-section')) {
      const title = section.querySelector('.ui-section-title')?.textContent ?? '';
      titles.push(title);
      if (section.hasAttribute('open')) openTitles.push(title);
    }
    expect(titles).toEqual([
      'Site',
      'Search engines',
      'Social sharing',
      'Icons and colors',
      'Forms',
      'Visitor statistics',
      'Site verification',
      'Sitemap and robots.txt',
      'Structured data',
      'Custom meta tags',
    ]);
    expect(openTitles).toEqual(['Site', 'Search engines']);
  });

  it('stores the Formspree form ID from a pasted address and hides the field for Netlify', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-form-service'), 'formspree');
    const target = input(container, '#ve-project-form-target');
    changeValue(target, 'https://formspree.io/f/abcdwxyz');
    blur(target);
    expect(settings()).toMatchObject({ formService: 'formspree', formTarget: 'abcdwxyz' });
    changeValue(input(container, '#ve-project-form-service'), 'netlify');
    expect(input(container, '#ve-project-form-target')).toBeNull();
    changeValue(input(container, '#ve-project-form-service'), '');
    expect(settings()).not.toHaveProperty('formService');
  });

  it('refuses a form address that is not from Formspree', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-form-service'), 'formspree');
    const target = input(container, '#ve-project-form-target');
    changeValue(target, 'not a form');
    blur(target);
    expect(settings()).not.toHaveProperty('formTarget');
    expect(container.ownerDocument.body.textContent).toContain(
      'Paste the form address from Formspree',
    );
  });

  it('stores a statistics service and its ID, and checks the ID for that service', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-analytics-service'), 'plausible');
    const id = input(container, '#ve-project-analytics-id');
    changeValue(id, 'example.com');
    blur(id);
    expect(settings()).toMatchObject({ analyticsService: 'plausible', analyticsId: 'example.com' });
    changeValue(input(container, '#ve-project-analytics-service'), 'cloudflare');
    const token = input(container, '#ve-project-analytics-id');
    expect(token).toHaveProperty('value', '');
    changeValue(token, 'short');
    blur(token);
    expect(settings().analyticsId).toBe('example.com');
  });

  it('stores crawler switches only when they differ from the default', () => {
    const { container } = render(<ProjectSettingsPanel />);
    click(input(container, '#ve-project-follow'));
    expect(settings().follow).toBe(false);
    click(input(container, '#ve-project-follow'));
    expect(settings()).not.toHaveProperty('follow');
    click(input(container, '#ve-project-block-ai'));
    expect(settings().blockAiCrawlers).toBe(true);
  });

  it('picks image previews and keeps the empty choice as the search engine default', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-image-preview'), 'large');
    expect(settings().imagePreview).toBe('large');
    changeValue(input(container, '#ve-project-image-preview'), '');
    expect(settings()).not.toHaveProperty('imagePreview');
  });

  it('keeps only the code when a whole verification meta tag is pasted', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(
      input(container, '#ve-project-verify-google'),
      '<meta name="google-site-verification" content="abc-123_XYZ" />',
    );
    expect(settings().verification).toEqual({ google: 'abc-123_XYZ' });
  });

  it('normalizes X usernames and explains invalid ones', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-twitter-site'), 'fieldnote');
    expect(settings().twitterSite).toBe('@fieldnote');
    changeValue(input(container, '#ve-project-twitter-site'), 'field note');
    blur(input(container, '#ve-project-twitter-site'));
    expect(settings().twitterSite).toBe('@fieldnote');
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'Enter a username like @acme',
    );
  });

  it('names the line of a robots.txt rule it cannot read', () => {
    const { container } = render(<ProjectSettingsPanel />);
    changeValue(input(container, '#ve-project-robots-rules'), 'Disallow: /drafts/\nnot a rule');
    blur(input(container, '#ve-project-robots-rules'));
    expect(settings().robotsRules).toBeUndefined();
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'Line 2 needs a rule like Disallow: /private/',
    );
  });

  it('stores extra JSON-LD only once it is valid JSON', () => {
    const { container } = render(<ProjectSettingsPanel />);
    const jsonLd = input(container, '#ve-project-json-ld');
    changeValue(jsonLd, '{ "@type": ');
    expect(settings().jsonLd).toBeUndefined();
    changeValue(jsonLd, '{ "@type": "Event" }');
    expect(settings().jsonLd).toBe('{ "@type": "Event" }');
  });

  it('hides the organization details when structured data is turned off', () => {
    const { container } = render(<ProjectSettingsPanel />);
    expect(input(container, '#ve-project-entity-name')).not.toBeNull();
    click(input(container, '#ve-project-schema'));
    expect(settings().schemaMarkup).toBe(false);
    expect(input(container, '#ve-project-entity-name')).toBeNull();
  });

  it('stores a valid base URL and explains an invalid one', () => {
    const { container } = render(<ProjectSettingsPanel />);
    const baseUrl = input(container, '#ve-project-base-url');
    changeValue(baseUrl, 'acme.example');
    blur(baseUrl);
    expect(settings().baseUrl).toBeUndefined();
    expect(container.ownerDocument.querySelector('[role="alert"]')?.textContent).toBe(
      'Enter a full address that starts with https://',
    );
    changeValue(baseUrl, 'https://acme.example');
    expect(settings().baseUrl).toBe('https://acme.example');
  });
});
