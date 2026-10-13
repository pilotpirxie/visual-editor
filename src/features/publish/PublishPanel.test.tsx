import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_STORAGE_KEY,
  readAppSettings,
  updateAppSettings,
} from '../../app/appSettings';
import { store } from '../../app/store';
import { changeValue, click, getButton, render } from '../../test/dom';
import { PublishPanel } from './PublishPanel';

beforeEach(() => {
  localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
});

describe('PublishPanel', () => {
  it('keeps the Netlify token in the app settings and removes it on request', () => {
    const { container } = render(<PublishPanel host="netlify" error={null} />);
    expect(container.querySelector('label')?.textContent).toBe('Netlify access token');
    expect(getButton(container, 'Remove').disabled).toBe(true);
    changeValue(container.querySelector('input[type="password"]'), 'token-1');
    expect(readAppSettings().netlifyToken).toBe('token-1');
    expect(readAppSettings().githubToken).toBe('');
    click(getButton(container, 'Remove'));
    expect(readAppSettings().netlifyToken).toBe('');
  });

  it('keeps the GitHub token apart from the Netlify one', () => {
    updateAppSettings({ netlifyToken: 'nfp_test' });
    const { container } = render(<PublishPanel host="github" error={null} />);
    expect(container.querySelector('label')?.textContent).toBe('GitHub access token');
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('');
    changeValue(container.querySelector('input[type="password"]'), 'ghp_test');
    expect(readAppSettings()).toMatchObject({ netlifyToken: 'nfp_test', githubToken: 'ghp_test' });
  });

  it('shows the address of the site this project has on that host only', () => {
    const projectId = store.getState().project.id;
    const site = { siteId: 'site-1', url: 'https://one.netlify.app' };
    updateAppSettings({ publishedSites: { [projectId]: site } });
    const netlify = render(<PublishPanel host="netlify" error={null} />);
    expect(netlify.container.querySelector('a')?.getAttribute('href')).toBe(site.url);
    const github = render(<PublishPanel host="github" error={null} />);
    expect(github.container.querySelector('a')).toBeNull();
  });

  it('shows why publishing failed', () => {
    const { container } = render(<PublishPanel host="netlify" error="Netlify said no." />);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Netlify said no.');
  });
});
