import { useSyncExternalStore } from 'react';
import { isRecord } from '../components/fields';
import type { DeviceMode } from './editorSlice';

export type AssistantModel = {
  id: string;
  name: string;
  canUseSchema: boolean;
  efforts: string[];
  contextLength: number | null;
  maxOutputTokens: number | null;
  promptPrice: number | null;
  completionPrice: number | null;
};

export type ImageModel = { id: string; name: string };

export type AppSettings = {
  deviceOnOpen: DeviceMode;
  shouldConfirmBlockDelete: boolean;
  openRouterKey: string;
  assistantModel: AssistantModel | null;
  assistantEffort: string | null;
  imageModel: ImageModel | null;
  netlifyToken: string;
  publishedSites: Record<string, PublishedSite>;
};

export type PublishedSite = { siteId: string; url: string };

export const APP_SETTINGS_STORAGE_KEY = 've-settings';

export const DEVICE_MODES: readonly DeviceMode[] = ['responsive', 'desktop', 'tablet', 'phone'];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  deviceOnOpen: 'responsive',
  shouldConfirmBlockDelete: false,
  openRouterKey: '',
  assistantModel: null,
  assistantEffort: null,
  imageModel: null,
  netlifyToken: '',
  publishedSites: {},
};

const SETTINGS_EVENT = 've-settings-change';

type Snapshot = { text: string | null; settings: AppSettings };

let snapshot: Snapshot = { text: null, settings: DEFAULT_APP_SETTINGS };

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function storedModel(value: unknown): AssistantModel | null {
  if (!isRecord(value)) return null;
  const { id, name, canUseSchema, efforts } = value;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string') return null;
  const knownEfforts: string[] = [];
  if (Array.isArray(efforts)) {
    for (const effort of efforts) {
      if (typeof effort === 'string') knownEfforts.push(effort);
    }
  }
  return {
    id,
    name,
    canUseSchema: canUseSchema === true,
    efforts: knownEfforts,
    contextLength: numberOrNull(value.contextLength),
    maxOutputTokens: numberOrNull(value.maxOutputTokens),
    promptPrice: numberOrNull(value.promptPrice),
    completionPrice: numberOrNull(value.completionPrice),
  };
}

function storedImageModel(value: unknown): ImageModel | null {
  if (!isRecord(value)) return null;
  const { id, name } = value;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string') return null;
  return { id, name };
}

function storedPublishedSites(value: unknown): Record<string, PublishedSite> {
  const sites: Record<string, PublishedSite> = {};
  if (!isRecord(value)) return sites;
  for (const [projectId, site] of Object.entries(value)) {
    if (!isRecord(site)) continue;
    const { siteId, url } = site;
    if (typeof siteId === 'string' && typeof url === 'string') sites[projectId] = { siteId, url };
  }
  return sites;
}

function storedDevice(value: unknown): DeviceMode {
  for (const mode of DEVICE_MODES) {
    if (mode === value) return mode;
  }
  return DEFAULT_APP_SETTINGS.deviceOnOpen;
}

function settingsFrom(text: string | null): AppSettings {
  if (text === null) return DEFAULT_APP_SETTINGS;
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch (error) {
    console.warn('The saved app settings are damaged, so the defaults are used', error);
    return DEFAULT_APP_SETTINGS;
  }
  if (!isRecord(stored)) return DEFAULT_APP_SETTINGS;
  const assistantModel = storedModel(stored.assistantModel);
  const effort = stored.assistantEffort;
  const hasEffort =
    typeof effort === 'string' &&
    assistantModel !== null &&
    assistantModel.efforts.includes(effort);
  return {
    deviceOnOpen: storedDevice(stored.deviceOnOpen),
    shouldConfirmBlockDelete: stored.shouldConfirmBlockDelete === true,
    openRouterKey: typeof stored.openRouterKey === 'string' ? stored.openRouterKey : '',
    assistantModel,
    assistantEffort: hasEffort ? effort : null,
    imageModel: storedImageModel(stored.imageModel),
    netlifyToken: typeof stored.netlifyToken === 'string' ? stored.netlifyToken : '',
    publishedSites: storedPublishedSites(stored.publishedSites),
  };
}

function storedText(): string | null {
  try {
    return localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.warn('The saved app settings could not be read', error);
    return null;
  }
}

export function readAppSettings(): AppSettings {
  const text = storedText();
  if (text !== snapshot.text) snapshot = { text, settings: settingsFrom(text) };
  return snapshot.settings;
}

export function updateAppSettings(changes: Partial<AppSettings>): void {
  const text = JSON.stringify({ ...readAppSettings(), ...changes });
  try {
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, text);
  } catch (error) {
    console.warn('The app settings could not be saved', error);
    return;
  }
  snapshot = { text, settings: settingsFrom(text) };
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

function subscribe(listener: () => void): () => void {
  function followOtherTabs(event: StorageEvent): void {
    if (event.key !== null && event.key !== APP_SETTINGS_STORAGE_KEY) return;
    listener();
  }
  window.addEventListener(SETTINGS_EVENT, listener);
  window.addEventListener('storage', followOtherTabs);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, listener);
    window.removeEventListener('storage', followOtherTabs);
  };
}

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribe, readAppSettings);
}
