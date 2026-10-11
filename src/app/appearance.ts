import { useSyncExternalStore } from 'react';

export type Appearance = 'light' | 'dark';

export const APPEARANCE_STORAGE_KEY = 've-appearance';

const APPEARANCE_ATTRIBUTE = 'data-ve-appearance';
const APPEARANCE_EVENT = 've-appearance-change';

function storedAppearance(): Appearance {
  try {
    return localStorage.getItem(APPEARANCE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.warn('The saved appearance could not be read', error);
    return 'light';
  }
}

function shownAppearance(): Appearance {
  const value = document.documentElement.getAttribute(APPEARANCE_ATTRIBUTE);
  return value === 'dark' ? 'dark' : 'light';
}

function showAppearance(appearance: Appearance): void {
  if (appearance === shownAppearance()) return;
  if (appearance === 'dark') {
    document.documentElement.setAttribute(APPEARANCE_ATTRIBUTE, 'dark');
  } else {
    document.documentElement.removeAttribute(APPEARANCE_ATTRIBUTE);
  }
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

export function applyStoredAppearance(): void {
  showAppearance(storedAppearance());
}

export function setAppearance(appearance: Appearance): void {
  try {
    if (appearance === 'dark') localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');
    else localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  } catch (error) {
    console.warn('The appearance could not be saved', error);
  }
  showAppearance(appearance);
}

function subscribe(listener: () => void): () => void {
  function followOtherTabs(event: StorageEvent): void {
    if (event.key !== null && event.key !== APPEARANCE_STORAGE_KEY) return;
    applyStoredAppearance();
  }
  window.addEventListener(APPEARANCE_EVENT, listener);
  window.addEventListener('storage', followOtherTabs);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, listener);
    window.removeEventListener('storage', followOtherTabs);
  };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, shownAppearance);
}
