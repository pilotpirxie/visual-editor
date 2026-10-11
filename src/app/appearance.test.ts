import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, runInAct } from '../test/dom';
import {
  APPEARANCE_STORAGE_KEY,
  applyStoredAppearance,
  setAppearance,
  useAppearance,
} from './appearance';

const PRE_PAINT_SCRIPT = join(import.meta.dirname, '../../public/appearance.js');

function shownAttribute(): string | null {
  return document.documentElement.getAttribute('data-ve-appearance');
}

function AppearanceLabel(): string {
  return useAppearance();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-ve-appearance');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('appearance', () => {
  it('is light until dark is chosen', () => {
    applyStoredAppearance();
    expect(shownAttribute()).toBeNull();
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('shows and remembers dark, then forgets it for light', () => {
    setAppearance('dark');
    expect(shownAttribute()).toBe('dark');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    setAppearance('light');
    expect(shownAttribute()).toBeNull();
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('applies the remembered appearance on start', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');
    applyStoredAppearance();
    expect(shownAttribute()).toBe('dark');
  });

  it('tells components and follows a change made in another tab', () => {
    const { container } = render(createElement(AppearanceLabel));
    expect(container.textContent).toBe('light');
    runInAct(() => setAppearance('dark'));
    expect(container.textContent).toBe('dark');
    localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    runInAct(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: APPEARANCE_STORAGE_KEY }));
    });
    expect(shownAttribute()).toBeNull();
    expect(container.textContent).toBe('light');
  });

  it('ignores changes to other storage keys', () => {
    render(createElement(AppearanceLabel));
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');
    runInAct(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    });
    expect(shownAttribute()).toBeNull();
  });

  it('still switches when storage is blocked', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => setAppearance('dark')).not.toThrow();
    expect(shownAttribute()).toBe('dark');
    expect(() => applyStoredAppearance()).not.toThrow();
    expect(shownAttribute()).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('the script that runs before first paint', () => {
  const source = readFileSync(PRE_PAINT_SCRIPT, 'utf8');

  function runScript(): void {
    new Function(source)();
  }

  it('reads the same storage key', () => {
    expect(source).toContain(`'${APPEARANCE_STORAGE_KEY}'`);
  });

  it('sets the attribute only for dark', () => {
    runScript();
    expect(shownAttribute()).toBeNull();
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'light');
    runScript();
    expect(shownAttribute()).toBeNull();
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');
    runScript();
    expect(shownAttribute()).toBe('dark');
  });
});
