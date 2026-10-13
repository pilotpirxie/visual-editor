import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, runInAct } from '../test/dom';
import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  readAppSettings,
  updateAppSettings,
  useAppSettings,
  type AssistantModel,
} from './appSettings';

const MODEL: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: ['low', 'high'],
  contextLength: 200000,
  maxOutputTokens: 8000,
  promptPrice: 3,
  completionPrice: 15,
};

function DeviceLabel(): string {
  return useAppSettings().deviceOnOpen;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app settings', () => {
  it('starts from the defaults', () => {
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
    expect(localStorage.getItem(APP_SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('remembers changes and keeps the other settings', () => {
    updateAppSettings({ deviceOnOpen: 'phone' });
    updateAppSettings({ openRouterKey: 'sk-test', assistantModel: MODEL, assistantEffort: 'high' });
    const stored: unknown = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? 'null');
    expect(stored).toEqual(readAppSettings());
    expect(readAppSettings()).toEqual({
      deviceOnOpen: 'phone',
      shouldConfirmBlockDelete: false,
      openRouterKey: 'sk-test',
      assistantModel: MODEL,
      assistantEffort: 'high',
      imageModel: null,
      netlifyToken: '',
      publishedSites: {},
      githubToken: '',
      githubSites: {},
    });
  });

  it('remembers the Netlify token and published sites and drops damaged entries', () => {
    updateAppSettings({
      netlifyToken: 'nfp_test',
      publishedSites: { p1: { siteId: 's1', url: 'https://one.netlify.app' } },
    });
    expect(readAppSettings()).toMatchObject({
      netlifyToken: 'nfp_test',
      publishedSites: { p1: { siteId: 's1', url: 'https://one.netlify.app' } },
    });
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({ netlifyToken: 7, publishedSites: { p1: { siteId: 's1' }, p2: 'x' } }),
    );
    expect(readAppSettings()).toMatchObject({ netlifyToken: '', publishedSites: {} });
  });

  it('remembers the GitHub token and repositories and drops damaged entries', () => {
    const githubSites = { p1: { siteId: 'ada/acme', url: 'https://ada.github.io/acme/' } };
    updateAppSettings({ githubToken: 'ghp_test', githubSites });
    expect(readAppSettings()).toMatchObject({ githubToken: 'ghp_test', githubSites });
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({ githubToken: 7, githubSites: { p1: { siteId: 'ada/acme' } } }),
    );
    expect(readAppSettings()).toMatchObject({ githubToken: '', githubSites: {} });
  });

  it('remembers the image model, forgets it when removed and ignores a damaged one', () => {
    updateAppSettings({ imageModel: { id: 'acme/painter', name: 'Acme Painter' } });
    expect(readAppSettings().imageModel).toEqual({ id: 'acme/painter', name: 'Acme Painter' });
    updateAppSettings({ imageModel: null });
    expect(readAppSettings().imageModel).toBeNull();
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({ imageModel: { id: 7 } }));
    expect(readAppSettings().imageModel).toBeNull();
  });

  it('returns the same object until something changes', () => {
    updateAppSettings({ shouldConfirmBlockDelete: true });
    expect(readAppSettings()).toBe(readAppSettings());
  });

  it('falls back to the defaults for a damaged value', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, '{not json');
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, '[1, 2]');
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('repairs each field on its own', () => {
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        deviceOnOpen: 'watch',
        shouldConfirmBlockDelete: 'yes',
        openRouterKey: 42,
        assistantModel: { id: '', name: 'Nameless' },
        assistantEffort: 'high',
      }),
    );
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('drops an effort the chosen model does not offer', () => {
    localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({ assistantModel: MODEL, assistantEffort: 'max' }),
    );
    expect(readAppSettings().assistantModel).toEqual(MODEL);
    expect(readAppSettings().assistantEffort).toBeNull();
  });

  it('keeps the old settings when the browser refuses to store them', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is full');
    });
    updateAppSettings({ deviceOnOpen: 'tablet' });
    expect(readAppSettings().deviceOnOpen).toBe('responsive');
  });

  it('reads the defaults when storage cannot be read', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('tells components and follows a change made in another tab', () => {
    const { container } = render(createElement(DeviceLabel));
    expect(container.textContent).toBe('responsive');
    runInAct(() => updateAppSettings({ deviceOnOpen: 'desktop' }));
    expect(container.textContent).toBe('desktop');
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({ deviceOnOpen: 'phone' }));
    runInAct(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: APP_SETTINGS_STORAGE_KEY }));
    });
    expect(container.textContent).toBe('phone');
  });
});
